import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { User, Room, TeamState, SavedScenario, UserRole, LicenseRecord, InstructorLoginEvent, LicenseActivitySummary } from '../types/index.js';

// Setup file paths for the JSON fallback database
const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_DB_PATH = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial database structure
interface Schema {
  users: User[];
  rooms: Room[];
  teams: { id: string; roomId: string; name: string; controllerId: string; status: 'active' | 'bankrupt'; cash: number; stateJson: string }[];
  roomMembers: { id: string; roomId: string; teamId: string; userId: string; joinedAt: string }[];
  scenarios: SavedScenario[];
  licenses: LicenseRecord[];
  instructorLogins: InstructorLoginEvent[];
}

const initialSchema: Schema = {
  users: [],
  rooms: [],
  teams: [],
  roomMembers: [],
  scenarios: [],
  licenses: [],
  instructorLogins: []
};

// If JSON file doesn't exist, create it
if (!fs.existsSync(JSON_DB_PATH)) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialSchema, null, 2), 'utf-8');
}

// Database Connection Manager
class DatabaseManager {
  private pool: Pool | null = null;
  private isPostgres = false;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      console.log('PostgreSQL DATABASE_URL found. Initializing PG Pool...');
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
      });
      this.isPostgres = true;
    } else {
      console.log(`No DATABASE_URL found. Using JSON File Database Fallback: ${JSON_DB_PATH}`);
    }
  }

  // Initialize DB Tables in Postgres if needed
  async init() {
    if (!this.isPostgres || !this.pool) {
      // In JSON mode, we just verify structure or seed default user if needed
      await this.seedDefaults();
      return;
    }

    const client = await this.pool.connect();
    try {
      console.log('Verifying and creating PostgreSQL database tables...');
      
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(50) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create rooms table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id VARCHAR(255) PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          difficulty VARCHAR(50) NOT NULL,
          tick_rate INTEGER NOT NULL,
          current_day INTEGER NOT NULL,
          max_days INTEGER NOT NULL,
          scenario_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) NOT NULL
        );
      `);

      // Create teams table
      await client.query(`
        CREATE TABLE IF NOT EXISTS teams (
          id VARCHAR(255) PRIMARY KEY,
          room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          controller_id VARCHAR(255),
          status VARCHAR(50) NOT NULL,
          cash DOUBLE PRECISION NOT NULL,
          state_json TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_room_team UNIQUE(room_id, name)
        );
      `);

      // Create room_members table
      await client.query(`
        CREATE TABLE IF NOT EXISTS room_members (
          id VARCHAR(255) PRIMARY KEY,
          room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
          team_id VARCHAR(255) REFERENCES teams(id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create saved_scenarios table
      await client.query(`
        CREATE TABLE IF NOT EXISTS saved_scenarios (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          learning_objective TEXT,
          instructor_notes TEXT,
          difficulty VARCHAR(50) NOT NULL,
          max_days INTEGER NOT NULL,
          tick_rate INTEGER NOT NULL,
          start_cash DOUBLE PRECISION NOT NULL,
          config_json TEXT NOT NULL,
          creator_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create licenses table
      await client.query(`
        CREATE TABLE IF NOT EXISTS licenses (
          id VARCHAR(255) PRIMARY KEY,
          customer_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          max_seats INTEGER NOT NULL,
          validity_days INTEGER NOT NULL,
          status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          start_date VARCHAR(50),
          end_date VARCHAR(50),
          instructor_email VARCHAR(255) NOT NULL,
          instructor_password VARCHAR(255)
        );
      `);

      // Add actual duration and license correlation columns to rooms if missing
      await client.query(`
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS total_paused_ms BIGINT DEFAULT 0;
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS actual_duration_seconds INTEGER DEFAULT 0;
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS license_id VARCHAR(255);
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS creator_email VARCHAR(255);
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS login_event_id VARCHAR(255);
        ALTER TABLE licenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      `);

      // Create instructor_logins table for permanent activity history
      await client.query(`
        CREATE TABLE IF NOT EXISTS instructor_logins (
          id VARCHAR(255) PRIMARY KEY,
          license_id VARCHAR(255) NOT NULL,
          instructor_id VARCHAR(255) NOT NULL,
          instructor_email VARCHAR(255) NOT NULL,
          instructor_name VARCHAR(255),
          login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          logout_at TIMESTAMP,
          duration_seconds INTEGER DEFAULT 0,
          success BOOLEAN DEFAULT TRUE,
          ip_address VARCHAR(100),
          user_agent TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_inst_logins_lic ON instructor_logins(license_id);
        CREATE INDEX IF NOT EXISTS idx_inst_logins_inst ON instructor_logins(instructor_id);
        CREATE INDEX IF NOT EXISTS idx_inst_logins_email ON instructor_logins(instructor_email);
      `);

      console.log('PostgreSQL database tables initialized successfully.');
      await this.seedDefaults();
    } catch (err) {
      console.error('Error initializing PostgreSQL tables:', err);
    } finally {
      client.release();
    }
  }

  private async seedDefaults() {
    // Check if there is an admin/instructor user, seed if empty
    const adminEmail = 'aryajain1906@gmail.com';
    const existingAdmin = await this.getUserByEmail(adminEmail);
    if (!existingAdmin) {
      const bcrypt = await import('bcryptjs');
      const adminHash = await bcrypt.default.hash('@Aryajain19', 10);
      const hash = await bcrypt.default.hash('muffin123', 10);
      
      const adminUser: User & { passwordHash: string } = {
        id: 'user_admin_001',
        name: 'System Admin',
        email: adminEmail,
        role: 'admin',
        createdAt: new Date(),
        passwordHash: adminHash
      };
      
      const instructorUser: User & { passwordHash: string } = {
        id: 'user_instructor_001',
        name: 'Muffin Professor',
        email: 'instructor@factory.com',
        role: 'instructor',
        createdAt: new Date(),
        passwordHash: hash
      };

      const operatorUser: User & { passwordHash: string } = {
        id: 'user_operator_001',
        name: 'Muffin Baker',
        email: 'operator@factory.com',
        role: 'operator',
        createdAt: new Date(),
        passwordHash: hash
      };

      await this.saveUserRaw(adminUser);
      await this.saveUserRaw(instructorUser);
      await this.saveUserRaw(operatorUser);
      console.log('Seeded default user accounts:');
      console.log(' - Admin: aryajain1906@gmail.com');
      console.log(' - Instructor: instructor@factory.com (muffin123)');
      console.log(' - Operator: operator@factory.com (muffin123)');
    }

    // Seed default scenarios (always verify they exist)
      const defaultScenarios: SavedScenario[] = [
        {
          id: 'scenario_beginner_preset',
          name: 'Beginner Muffin Operations',
          description: 'Stable demand of 80 muffins/day. No machine breakdowns, no random events. Perfect for training students on basic formulas.',
          learningObjective: 'Understand basic ROP (Reorder Point), EOQ (Economic Order Quantity), and Capacity constraints in a stable environment.',
          instructorNotes: 'Stable demand of 80 muffins/day. No machine breakdowns, no random events. Perfect for training students on basic formulas.',
          difficulty: 'beginner',
          maxDays: 30,
          tickRate: 10,
          startCash: 50000,
          holdingCostRate: 0.02,
          lostSalesPenaltyRate: 2.5,
          startInventory: { rawMaterial: 1000, packagingMaterial: 800 },
          rawMaterialCosts: { baseMix: 5.0, packaging: 1.0, orderCost: 100.0 },
          leadTimes: { rawMaterial: 2, packagingMaterial: 1, machineProcurement: 3 },
          breakdownsEnabled: false,
          demand: {
            type: 'fixed',
            baseVal: 80,
            amplitude: 0,
            period: 10,
            randomNoise: 0,
            customSchedule: []
          },
          machineSettings: {
            mixing: { capacityPerMachine: 100, purchaseCost: 2000, operatingCost: 40, breakdownProbability: 0, breakdownDuration: 2, repairCost: 300, leadTime: 3 },
            baking: { capacityPerMachine: 80, purchaseCost: 3000, operatingCost: 60, breakdownProbability: 0, breakdownDuration: 2, repairCost: 500, leadTime: 3 },
            icing: { capacityPerMachine: 120, purchaseCost: 1500, operatingCost: 30, breakdownProbability: 0, breakdownDuration: 1, repairCost: 200, leadTime: 3 },
            packaging: { capacityPerMachine: 150, purchaseCost: 1000, operatingCost: 20, breakdownProbability: 0, breakdownDuration: 1, repairCost: 150, leadTime: 3 }
          },
          contracts: [],
          events: [],
          objectives: ['max_cash', 'min_stockouts'],
          creatorId: 'user_admin_001',
          createdAt: new Date()
        },
        {
          id: 'scenario_intermediate_preset',
          name: 'Intermediate Supply Chain Challenge',
          description: 'Seasonal demand varying from 60 to 140. Periodic contracts and machine breakdowns are introduced. Teaches safety stock concepts.',
          learningObjective: 'Manage demand seasonality, safety stock buffering, contract fulfillment, and machine breakdown occurrences.',
          instructorNotes: 'Seasonal demand varying from 60 to 140. Periodic contracts and machine breakdowns are introduced. Teaches safety stock concepts.',
          difficulty: 'intermediate',
          maxDays: 60,
          tickRate: 8,
          startCash: 100000,
          holdingCostRate: 0.02,
          lostSalesPenaltyRate: 2.5,
          startInventory: { rawMaterial: 12000, packagingMaterial: 10000 },
          rawMaterialCosts: { baseMix: 5.0, packaging: 1.0, orderCost: 150.0 },
          leadTimes: { rawMaterial: 3, packagingMaterial: 2, machineProcurement: 5 },
          breakdownsEnabled: true,
          demand: {
            type: 'seasonal',
            baseVal: 100,
            amplitude: 40,
            period: 20,
            randomNoise: 0.1,
            customSchedule: []
          },
          machineSettings: {
            mixing: { capacityPerMachine: 100, purchaseCost: 2000, operatingCost: 50, breakdownProbability: 0.015, breakdownDuration: 2, repairCost: 300, leadTime: 5 },
            baking: { capacityPerMachine: 80, purchaseCost: 3000, operatingCost: 80, breakdownProbability: 0.015, breakdownDuration: 2, repairCost: 500, leadTime: 5 },
            icing: { capacityPerMachine: 120, purchaseCost: 1500, operatingCost: 40, breakdownProbability: 0.01, breakdownDuration: 1, repairCost: 200, leadTime: 5 },
            packaging: { capacityPerMachine: 150, purchaseCost: 1000, operatingCost: 30, breakdownProbability: 0.01, breakdownDuration: 1, repairCost: 150, leadTime: 5 }
          },
          contracts: [
            { name: 'Festival Bake Sale', startDay: 15, endDay: 25, dailyQuantity: 40, priceMultiplier: 1.8, penalty: 5.0 },
            { name: 'Cafe Delivery Order', startDay: 35, endDay: 50, dailyQuantity: 30, priceMultiplier: 1.5, penalty: 3.0 }
          ],
          events: [
            { name: 'Viral Social Media Campaign', startDay: 20, endDay: 26, description: 'A food blogger features your muffins! Market demand surges by 40%.', targetVariable: 'demand', modifier: 0.4 },
            { name: 'Transportation Strike', startDay: 40, endDay: 45, description: 'Supply transport strikes increase material delivery lead times by 2 days.', targetVariable: 'lead_time', modifier: 2.0 }
          ],
          objectives: ['max_cash', 'max_fill_rate', 'max_contract_revenue'],
          creatorId: 'user_admin_001',
          createdAt: new Date()
        },
        {
          id: 'scenario_advanced_preset',
          name: 'Advanced Operations Crisis',
          description: 'High volatility hybrid demand. Heavy breakdown probabilities. Critical events test quick adaptation skills of students.',
          learningObjective: 'Adapt to extreme demand volatility, supply delays, and heavy machine breakdowns under strict constraints.',
          instructorNotes: 'High volatility hybrid demand. Heavy breakdown probabilities. Critical events test quick adaptation skills of students.',
          difficulty: 'advanced',
          maxDays: 90,
          tickRate: 5,
          startCash: 150000,
          holdingCostRate: 0.02,
          lostSalesPenaltyRate: 2.5,
          startInventory: { rawMaterial: 15000, packagingMaterial: 12000 },
          rawMaterialCosts: { baseMix: 6.0, packaging: 1.2, orderCost: 200.0 },
          leadTimes: { rawMaterial: 4, packagingMaterial: 2, machineProcurement: 6 },
          breakdownsEnabled: true,
          demand: {
            type: 'hybrid',
            baseVal: 120,
            amplitude: 60,
            period: 15,
            randomNoise: 0.25,
            customSchedule: []
          },
          machineSettings: {
            mixing: { capacityPerMachine: 100, purchaseCost: 2500, operatingCost: 60, breakdownProbability: 0.03, breakdownDuration: 3, repairCost: 400, leadTime: 6 },
            baking: { capacityPerMachine: 80, purchaseCost: 3500, operatingCost: 90, breakdownProbability: 0.03, breakdownDuration: 3, repairCost: 600, leadTime: 6 },
            icing: { capacityPerMachine: 120, purchaseCost: 1800, operatingCost: 50, breakdownProbability: 0.025, breakdownDuration: 2, repairCost: 250, leadTime: 6 },
            packaging: { capacityPerMachine: 150, purchaseCost: 1200, operatingCost: 40, breakdownProbability: 0.02, breakdownDuration: 2, repairCost: 200, leadTime: 6 }
          },
          contracts: [
            { name: 'Major Supermarket Contract', startDay: 10, endDay: 40, dailyQuantity: 60, priceMultiplier: 1.6, penalty: 8.0 },
            { name: 'Catering Mega Deal', startDay: 50, endDay: 80, dailyQuantity: 80, priceMultiplier: 2.0, penalty: 12.0 }
          ],
          events: [
            { name: 'Supplier Raw Material Squeeze', startDay: 20, endDay: 35, description: 'Base mix ingredient shortage increases raw material purchase cost by 30%.', targetVariable: 'raw_material_cost', modifier: 0.3 },
            { name: 'Severe Oven Breakdown Wave', startDay: 55, endDay: 60, description: 'Power surges increase machine breakdown probability by 100%.', targetVariable: 'breakdowns', modifier: 1.0 }
          ],
          objectives: ['max_cash', 'balanced_score', 'min_stockouts'],
          creatorId: 'user_admin_001',
          createdAt: new Date()
        },
      ];

    for (const sc of defaultScenarios) {
      const existing = await this.getScenarioById(sc.id);
      if (!existing) {
        await this.saveScenario(sc);
      }
    }
      console.log('Seeded default scenarios (Beginner, Intermediate, Advanced).');
      // Purge deprecated 10-min presets
      await this.deleteScenario('scenario_intermediate_10min_preset');
      await this.deleteScenario('scenario_advanced_10min_preset');

      // Seed default licenses if empty
      const existingLics = await this.getLicenses();
      if (existingLics.length === 0) {
        const today = new Date();
        const oneYear = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
        await this.saveLicense({
          id: 'MIT-SLOAN-2026',
          customerName: 'MIT Sloan School of Management',
          email: 'sloan@mit.edu',
          maxSeats: 100,
          validityDays: 365,
          status: 'active',
          createdAt: today.toISOString(),
          expiresAt: oneYear.toISOString(),
          startDate: today.toISOString().split('T')[0],
          endDate: oneYear.toISOString().split('T')[0],
          instructorEmail: 'instructor_mit@factory.com'
        });
        await this.saveLicense({
          id: 'STANFORD-GSB',
          customerName: 'Stanford Graduate School of Business',
          email: 'operations@stanford.edu',
          maxSeats: 40,
          validityDays: 365,
          status: 'active',
          createdAt: today.toISOString(),
          expiresAt: oneYear.toISOString(),
          startDate: today.toISOString().split('T')[0],
          endDate: oneYear.toISOString().split('T')[0],
          instructorEmail: 'instructor_stanford@factory.com'
        });
        console.log('Seeded default institutional licenses (MIT, Stanford).');
      }
  }

  // JSON Helper: Read DB
  private readJsonDb(): Schema {
    try {
      const content = fs.readFileSync(JSON_DB_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (!parsed.licenses) parsed.licenses = [];
      if (!parsed.instructorLogins) parsed.instructorLogins = [];
      return parsed;
    } catch {
      return initialSchema;
    }
  }

  // JSON Helper: Write DB
  private writeJsonDb(data: Schema) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  // USERS CRUD
  async getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER($1)', [cleanEmail]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as UserRole,
        createdAt: new Date(row.created_at),
        passwordHash: row.password_hash
      };
    } else {
      const db = this.readJsonDb();
      const user = db.users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail) as (User & { passwordHash: string }) | undefined;
      return user || null;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as UserRole,
        createdAt: new Date(row.created_at)
      };
    } else {
      const db = this.readJsonDb();
      const user = db.users.find(u => u.id === id);
      if (!user) return null;
      const { passwordHash, ...rest } = user as any;
      return rest;
    }
  }

  async saveUserRaw(user: User & { passwordHash: string }) {
    if (this.isPostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO users (id, name, email, role, password_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE 
         SET name = $2, password_hash = $5, role = $4`,
        [user.id, user.name, user.email, user.role, user.passwordHash, user.createdAt]
      );
    } else {
      const db = this.readJsonDb();
      const idx = db.users.findIndex(u => u.email === user.email);
      if (idx >= 0) {
        db.users[idx] = user;
      } else {
        db.users.push(user);
      }
      this.writeJsonDb(db);
    }
  }

  // ROOMS CRUD
  async createRoom(room: Room): Promise<Room> {
    if (this.isPostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO rooms (id, code, name, status, difficulty, tick_rate, current_day, max_days, scenario_id, created_by, created_at, license_id, creator_email, login_event_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [room.id, room.code, room.name, room.status, room.difficulty, room.tickRate, room.currentDay, room.maxDays, room.scenarioId, room.createdBy, room.createdAt, room.licenseId || null, room.creatorEmail || null, room.loginEventId || null]
      );
    } else {
      const db = this.readJsonDb();
      db.rooms.push(room);
      this.writeJsonDb(db);
    }
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      const room: Room = {
        id: row.id,
        code: row.code,
        name: row.name,
        status: row.status,
        difficulty: row.difficulty,
        tickRate: row.tick_rate,
        currentDay: row.current_day,
        maxDays: row.max_days,
        scenarioId: row.scenario_id,
        createdAt: new Date(row.created_at),
        createdBy: row.created_by,
        startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
        endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : undefined,
        pausedAt: row.paused_at ? new Date(row.paused_at).toISOString() : undefined,
        totalPausedMs: row.total_paused_ms ? Number(row.total_paused_ms) : 0,
        actualDurationSeconds: row.actual_duration_seconds ? Number(row.actual_duration_seconds) : 0,
        licenseId: row.license_id || undefined,
        creatorEmail: row.creator_email || undefined,
        loginEventId: row.login_event_id || undefined
      };
      if (room.scenarioId) {
        room.scenarioConfig = await this.getScenarioById(room.scenarioId) || undefined;
      }
      if (!room.scenarioConfig) {
        room.scenarioConfig = (await this.getScenarios()).find(s => s.difficulty === room.difficulty);
      }
      return room;
    } else {
      const db = this.readJsonDb();
      const r = db.rooms.find(room => room.code.toLowerCase() === code.toLowerCase());
      if (r) {
        if (r.scenarioId && !r.scenarioConfig) {
          r.scenarioConfig = db.scenarios.find(s => s.id === r.scenarioId);
        }
        if (!r.scenarioConfig) {
          r.scenarioConfig = db.scenarios.find(s => s.difficulty === r.difficulty);
        }
      }
      return r || null;
    }
  }

  async getRoomById(id: string): Promise<Room | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      const room: Room = {
        id: row.id,
        code: row.code,
        name: row.name,
        status: row.status,
        difficulty: row.difficulty,
        tickRate: row.tick_rate,
        currentDay: row.current_day,
        maxDays: row.max_days,
        scenarioId: row.scenario_id,
        createdAt: new Date(row.created_at),
        createdBy: row.created_by,
        startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
        endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : undefined,
        pausedAt: row.paused_at ? new Date(row.paused_at).toISOString() : undefined,
        totalPausedMs: row.total_paused_ms ? Number(row.total_paused_ms) : 0,
        actualDurationSeconds: row.actual_duration_seconds ? Number(row.actual_duration_seconds) : 0
      };
      if (room.scenarioId) {
        room.scenarioConfig = await this.getScenarioById(room.scenarioId) || undefined;
      }
      if (!room.scenarioConfig) {
        room.scenarioConfig = (await this.getScenarios()).find(s => s.difficulty === room.difficulty);
      }
      return room;
    } else {
      const db = this.readJsonDb();
      const r = db.rooms.find(room => room.id === id);
      if (r) {
        if (r.scenarioId && !r.scenarioConfig) {
          r.scenarioConfig = db.scenarios.find(s => s.id === r.scenarioId);
        }
        if (!r.scenarioConfig) {
          r.scenarioConfig = db.scenarios.find(s => s.difficulty === r.difficulty);
        }
      }
      return r || null;
    }
  }

  async getRooms(): Promise<Room[]> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM rooms ORDER BY created_at DESC');
      return res.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        status: row.status,
        difficulty: row.difficulty,
        tickRate: row.tick_rate,
        currentDay: row.current_day,
        maxDays: row.max_days,
        scenarioId: row.scenario_id,
        createdAt: new Date(row.created_at),
        createdBy: row.created_by,
        startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
        endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : undefined,
        pausedAt: row.paused_at ? new Date(row.paused_at).toISOString() : undefined,
        totalPausedMs: row.total_paused_ms ? Number(row.total_paused_ms) : 0,
        actualDurationSeconds: row.actual_duration_seconds ? Number(row.actual_duration_seconds) : 0,
        licenseId: row.license_id || undefined,
        creatorEmail: row.creator_email || undefined,
        loginEventId: row.login_event_id || undefined
      }));
    } else {
      const db = this.readJsonDb();
      return db.rooms;
    }
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<void> {
    if (this.isPostgres && this.pool) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return;
      const setClauses = keys.map((key, i) => {
        // map camelCase to snake_case for DB fields
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `${dbKey} = $${i + 2}`;
      });
      const vals = keys.map(k => (updates as any)[k]);
      await this.pool.query(`UPDATE rooms SET ${setClauses.join(', ')} WHERE id = $1`, [id, ...vals]);
    } else {
      const db = this.readJsonDb();
      const idx = db.rooms.findIndex(r => r.id === id);
      if (idx >= 0) {
        db.rooms[idx] = { ...db.rooms[idx], ...updates };
        this.writeJsonDb(db);
      }
    }
  }

  async deleteRoom(id: string): Promise<void> {
    if (this.isPostgres && this.pool) {
      await this.pool.query('DELETE FROM rooms WHERE id = $1', [id]);
    } else {
      const db = this.readJsonDb();
      db.rooms = db.rooms.filter(r => r.id !== id);
      db.teams = db.teams.filter(t => t.roomId !== id);
      db.roomMembers = db.roomMembers.filter(m => m.roomId !== id);
      this.writeJsonDb(db);
    }
  }

  async deleteTeam(id: string): Promise<void> {
    if (this.isPostgres && this.pool) {
      await this.pool.query('DELETE FROM teams WHERE id = $1', [id]);
      await this.pool.query('DELETE FROM room_members WHERE team_id = $1', [id]);
    } else {
      const db = this.readJsonDb();
      db.teams = db.teams.filter(t => t.id !== id);
      db.roomMembers = db.roomMembers.filter(m => m.teamId !== id);
      this.writeJsonDb(db);
    }
  }

  // TEAMS AND FACTORY STATE
  async createTeam(roomId: string, name: string, controllerId: string): Promise<{ id: string; roomId: string; name: string; controllerId: string }> {
    const id = `team_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    if (this.isPostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO teams (id, room_id, name, controller_id, status, cash, state_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, roomId, name, controllerId, 'active', 0.0, '{}']
      );
    } else {
      const db = this.readJsonDb();
      db.teams.push({ id, roomId, name, controllerId, status: 'active', cash: 0.0, stateJson: '{}' });
      this.writeJsonDb(db);
    }
    return { id, roomId, name, controllerId };
  }

  async getTeamByRoomAndName(roomId: string, name: string): Promise<{ id: string; roomId: string; name: string; controllerId: string; status: 'active' | 'bankrupt'; cash: number; stateJson: string } | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM teams WHERE room_id = $1 AND name = $2', [roomId, name]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        roomId: r.room_id,
        name: r.name,
        controllerId: r.controller_id,
        status: r.status as 'active' | 'bankrupt',
        cash: r.cash,
        stateJson: r.state_json
      };
    } else {
      const db = this.readJsonDb();
      const t = db.teams.find(team => team.roomId === roomId && team.name.toLowerCase() === name.toLowerCase());
      return t || null;
    }
  }

  async getTeamsInRoom(roomId: string): Promise<{ id: string; roomId: string; name: string; controllerId: string; status: 'active' | 'bankrupt'; cash: number; stateJson: string }[]> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM teams WHERE room_id = $1', [roomId]);
      return res.rows.map(r => ({
        id: r.id,
        roomId: r.room_id,
        name: r.name,
        controllerId: r.controller_id,
        status: r.status as 'active' | 'bankrupt',
        cash: r.cash,
        stateJson: r.state_json
      }));
    } else {
      const db = this.readJsonDb();
      return db.teams.filter(t => t.roomId === roomId);
    }
  }

  async updateTeamController(teamId: string, controllerId: string): Promise<void> {
    if (this.isPostgres && this.pool) {
      await this.pool.query('UPDATE teams SET controller_id = $1 WHERE id = $2', [controllerId, teamId]);
    } else {
      const db = this.readJsonDb();
      const idx = db.teams.findIndex(t => t.id === teamId);
      if (idx >= 0) {
        db.teams[idx].controllerId = controllerId;
        this.writeJsonDb(db);
      }
    }
  }

  async saveTeamState(teamId: string, cash: number, status: 'active' | 'bankrupt', state: TeamState): Promise<void> {
    const stateJson = JSON.stringify(state);
    if (this.isPostgres && this.pool) {
      await this.pool.query(
        'UPDATE teams SET cash = $1, status = $2, state_json = $3 WHERE id = $4',
        [cash, status, stateJson, teamId]
      );
    } else {
      const db = this.readJsonDb();
      const idx = db.teams.findIndex(t => t.id === teamId);
      if (idx >= 0) {
        db.teams[idx].cash = cash;
        db.teams[idx].status = status;
        db.teams[idx].stateJson = stateJson;
        this.writeJsonDb(db);
      }
    }
  }

  async getTeamState(teamId: string): Promise<TeamState | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT state_json FROM teams WHERE id = $1', [teamId]);
      if (res.rows.length === 0 || res.rows[0].state_json === '{}') return null;
      return JSON.parse(res.rows[0].state_json) as TeamState;
    } else {
      const db = this.readJsonDb();
      const t = db.teams.find(team => team.id === teamId);
      if (!t || t.stateJson === '{}') return null;
      return JSON.parse(t.stateJson) as TeamState;
    }
  }

  // ROOM MEMBERS
  async joinRoom(roomId: string, teamId: string, userId: string): Promise<void> {
    const id = `member_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    if (this.isPostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO room_members (id, room_id, team_id, user_id, joined_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [id, roomId, teamId, userId]
      );
    } else {
      const db = this.readJsonDb();
      const exists = db.roomMembers.some(m => m.roomId === roomId && m.userId === userId);
      if (!exists) {
        db.roomMembers.push({ id, roomId, teamId, userId, joinedAt: new Date().toISOString() });
        this.writeJsonDb(db);
      } else {
        // update teamId if changed
        const idx = db.roomMembers.findIndex(m => m.roomId === roomId && m.userId === userId);
        db.roomMembers[idx].teamId = teamId;
        this.writeJsonDb(db);
      }
    }
  }

  async getRoomMembers(roomId: string): Promise<{ userId: string; userName: string; teamId: string; teamName: string }[]> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(`
        SELECT rm.user_id, u.name as user_name, rm.team_id, t.name as team_name
        FROM room_members rm
        JOIN users u ON rm.user_id = u.id
        JOIN teams t ON rm.team_id = t.id
        WHERE rm.room_id = $1
      `, [roomId]);
      return res.rows.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        teamId: row.team_id,
        teamName: row.team_name
      }));
    } else {
      const db = this.readJsonDb();
      const members = db.roomMembers.filter(m => m.roomId === roomId);
      return members.map(m => {
        const user = db.users.find(u => u.id === m.userId);
        const team = db.teams.find(t => t.id === m.teamId);
        return {
          userId: m.userId,
          userName: user ? user.name : 'Unknown User',
          teamId: m.teamId,
          teamName: team ? team.name : 'Unknown Team'
        };
      });
    }
  }

  // SCENARIOS CRUD
  async saveScenario(scenario: SavedScenario): Promise<SavedScenario> {
    if (this.isPostgres && this.pool) {
      const configJson = JSON.stringify({
        startInventory: scenario.startInventory,
        startMachines: scenario.startMachines,
        sellingPrice: scenario.sellingPrice,
        starsThresholds: scenario.starsThresholds,
        rawMaterialCosts: scenario.rawMaterialCosts,
        leadTimes: scenario.leadTimes,
        breakdownsEnabled: scenario.breakdownsEnabled,
        demand: scenario.demand,
        machineSettings: scenario.machineSettings,
        contracts: scenario.contracts,
        events: scenario.events,
        objectives: scenario.objectives,
        holdingCostRate: scenario.holdingCostRate,
        lostSalesPenaltyRate: scenario.lostSalesPenaltyRate
      });
      await this.pool.query(
        `INSERT INTO saved_scenarios (id, name, description, learning_objective, instructor_notes, difficulty, max_days, tick_rate, start_cash, config_json, creator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE
         SET name = $2, description = $3, learning_objective = $4, instructor_notes = $5, difficulty = $6, max_days = $7, tick_rate = $8, start_cash = $9, config_json = $10`,
        [scenario.id, scenario.name, scenario.description, scenario.learningObjective, scenario.instructorNotes, scenario.difficulty, scenario.maxDays, scenario.tickRate, scenario.startCash, configJson, scenario.creatorId, scenario.createdAt]
      );
    } else {
      const db = this.readJsonDb();
      const idx = db.scenarios.findIndex(s => s.id === scenario.id);
      if (idx >= 0) {
        db.scenarios[idx] = scenario;
      } else {
        db.scenarios.push(scenario);
      }
      this.writeJsonDb(db);
    }
    return scenario;
  }

  async getScenarios(): Promise<SavedScenario[]> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM saved_scenarios ORDER BY created_at DESC');
      return res.rows.filter(row => row.id !== 'scenario_intermediate_10min_preset' && row.id !== 'scenario_advanced_10min_preset' && !row.name?.includes('10-Min') && !row.name?.includes('10 Min')).map(row => {
        const conf = JSON.parse(row.config_json);
        return {
          id: row.id,
          name: row.name,
          description: row.description || '',
          learningObjective: row.learning_objective || '',
          instructorNotes: row.instructor_notes || '',
          difficulty: row.difficulty,
          maxDays: row.max_days,
          tickRate: row.tick_rate,
          startCash: row.start_cash,
          startInventory: conf.startInventory,
          startMachines: conf.startMachines,
          sellingPrice: conf.sellingPrice,
          starsThresholds: conf.starsThresholds,
          holdingCostRate: conf.holdingCostRate !== undefined ? conf.holdingCostRate : 0.02,
          lostSalesPenaltyRate: conf.lostSalesPenaltyRate !== undefined ? conf.lostSalesPenaltyRate : 2.5,
          rawMaterialCosts: conf.rawMaterialCosts || { baseMix: 5.0, packaging: 1.0, orderCost: 150.0 },
          leadTimes: conf.leadTimes || { rawMaterial: 3, packagingMaterial: 2, machineProcurement: 5 },
          breakdownsEnabled: conf.breakdownsEnabled !== false,
          demand: conf.demand,
          machineSettings: conf.machineSettings,
          contracts: conf.contracts || [],
          events: conf.events || [],
          objectives: conf.objectives || ['max_cash'],
          creatorId: row.creator_id,
          createdAt: new Date(row.created_at)
        };
      });
    } else {
      const db = this.readJsonDb();
      return db.scenarios;
    }
  }

  async getScenarioById(id: string): Promise<SavedScenario | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM saved_scenarios WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      const conf = JSON.parse(row.config_json);
      return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        learningObjective: row.learning_objective || '',
        instructorNotes: row.instructor_notes || '',
        difficulty: row.difficulty,
        maxDays: row.max_days,
        tickRate: row.tick_rate,
        startCash: row.start_cash,
        startInventory: conf.startInventory,
        startMachines: conf.startMachines,
        sellingPrice: conf.sellingPrice,
        starsThresholds: conf.starsThresholds,
        holdingCostRate: conf.holdingCostRate !== undefined ? conf.holdingCostRate : 0.02,
        lostSalesPenaltyRate: conf.lostSalesPenaltyRate !== undefined ? conf.lostSalesPenaltyRate : 2.5,
        rawMaterialCosts: conf.rawMaterialCosts || { baseMix: 5.0, packaging: 1.0, orderCost: 150.0 },
        leadTimes: conf.leadTimes || { rawMaterial: 3, packagingMaterial: 2, machineProcurement: 5 },
        breakdownsEnabled: conf.breakdownsEnabled !== false,
        demand: conf.demand,
        machineSettings: conf.machineSettings,
        contracts: conf.contracts || [],
        events: conf.events || [],
        objectives: conf.objectives || ['max_cash'],
        creatorId: row.creator_id,
        createdAt: new Date(row.created_at)
      };
    } else {
      const db = this.readJsonDb();
      const s = db.scenarios.find(sc => sc.id === id);
      return s || null;
    }
  }

  async deleteScenario(id: string): Promise<void> {
    if (this.isPostgres && this.pool) {
      await this.pool.query('DELETE FROM saved_scenarios WHERE id = $1', [id]);
    } else {
      const db = this.readJsonDb();
      db.scenarios = db.scenarios.filter(s => s.id !== id);
      this.writeJsonDb(db);
    }
  }

  // LICENSES CRUD & EXPIRATION
  isLicenseExpired(lic: LicenseRecord): boolean {
    if (lic.deletedAt) return true;
    if (lic.status === 'expired' || lic.status === 'deleted') return true;
    const now = Date.now();
    if (lic.expiresAt) {
      return now >= new Date(lic.expiresAt).getTime();
    }
    if (lic.endDate) {
      return now >= new Date(lic.endDate).getTime();
    }
    return false;
  }

  async getLicenses(): Promise<LicenseRecord[]> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM licenses ORDER BY created_at DESC');
      const list: LicenseRecord[] = res.rows.map(row => ({
        id: row.id,
        customerName: row.customer_name,
        email: row.email,
        maxSeats: row.max_seats,
        validityDays: row.validity_days,
        status: row.status,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
        startDate: row.start_date,
        endDate: row.end_date,
        instructorEmail: row.instructor_email,
        instructorPassword: row.instructor_password,
        deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : undefined
      }));
      for (const lic of list) {
        if (!lic.deletedAt && lic.status !== 'expired' && this.isLicenseExpired(lic)) {
          lic.status = 'expired';
          await this.pool.query('UPDATE licenses SET status = $1 WHERE id = $2', ['expired', lic.id]);
        }
      }
      return list;
    } else {
      const db = this.readJsonDb();
      let changed = false;
      for (const lic of db.licenses) {
        if (!lic.deletedAt && lic.status !== 'expired' && this.isLicenseExpired(lic)) {
          lic.status = 'expired';
          changed = true;
        }
      }
      if (changed) this.writeJsonDb(db);
      return db.licenses;
    }
  }

  async getActiveLicenses(): Promise<LicenseRecord[]> {
    const all = await this.getLicenses();
    return all.filter(lic => lic.status === 'active' && !lic.deletedAt && !this.isLicenseExpired(lic));
  }

  async getLicenseById(id: string): Promise<LicenseRecord | null> {
    const cleanId = (id || '').trim().toUpperCase();
    const all = await this.getLicenses();
    return all.find(l => l.id.toUpperCase() === cleanId) || null;
  }

  async getLicenseByInstructorEmail(email: string): Promise<LicenseRecord | null> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const all = await this.getLicenses();
    // 1. Prefer active non-deleted license
    const active = all.find(l => !l.deletedAt && !this.isLicenseExpired(l) && (l.instructorEmail || '').trim().toLowerCase() === cleanEmail);
    if (active) return active;
    // 2. Non-deleted license
    const nonDeleted = all.find(l => !l.deletedAt && (l.instructorEmail || '').trim().toLowerCase() === cleanEmail);
    if (nonDeleted) return nonDeleted;
    // 3. Fallback to any matching license
    return all.find(l => (l.instructorEmail || '').trim().toLowerCase() === cleanEmail) || null;
  }

  async saveLicense(lic: LicenseRecord): Promise<void> {
    if (this.isPostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO licenses (id, customer_name, email, max_seats, validity_days, status, created_at, expires_at, start_date, end_date, instructor_email, instructor_password, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE
         SET customer_name = $2, email = $3, max_seats = $4, validity_days = $5, status = $6, expires_at = $8, start_date = $9, end_date = $10, instructor_email = $11, instructor_password = $12, deleted_at = $13`,
        [lic.id, lic.customerName, lic.email, lic.maxSeats, lic.validityDays, lic.status, new Date(lic.createdAt), new Date(lic.expiresAt), lic.startDate, lic.endDate, lic.instructorEmail, lic.instructorPassword, lic.deletedAt ? new Date(lic.deletedAt) : null]
      );
    } else {
      const db = this.readJsonDb();
      const idx = db.licenses.findIndex(l => l.id === lic.id);
      if (idx >= 0) {
        db.licenses[idx] = lic;
      } else {
        db.licenses.unshift(lic);
      }
      this.writeJsonDb(db);
    }
  }

  async deleteLicense(id: string): Promise<void> {
    const now = new Date();
    if (this.isPostgres && this.pool) {
      await this.pool.query('UPDATE licenses SET deleted_at = $1, status = $2 WHERE id = $3', [now, 'deleted', id]);
    } else {
      const db = this.readJsonDb();
      const lic = db.licenses.find(l => l.id === id);
      if (lic) {
        lic.deletedAt = now.toISOString();
        lic.status = 'deleted';
        this.writeJsonDb(db);
      }
    }
  }

  // INSTRUCTOR LOGINS & ACTIVITY TRACKING
  async recordInstructorLogin(event: InstructorLoginEvent): Promise<void> {
    if (this.isPostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO instructor_logins (id, license_id, instructor_id, instructor_email, instructor_name, login_at, logout_at, duration_seconds, success, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [event.id, event.licenseId, event.instructorId, event.instructorEmail, event.instructorName, new Date(event.loginAt), event.logoutAt ? new Date(event.logoutAt) : null, event.durationSeconds || 0, event.success, event.ipAddress || null, event.userAgent || null]
      );
    } else {
      const db = this.readJsonDb();
      if (!db.instructorLogins) db.instructorLogins = [];
      const exists = db.instructorLogins.some(l => l.id === event.id);
      if (!exists) {
        db.instructorLogins.unshift(event);
        this.writeJsonDb(db);
      }
    }
  }

  async recordInstructorLogout(loginId: string): Promise<void> {
    const now = new Date();
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT login_at FROM instructor_logins WHERE id = $1', [loginId]);
      if (res.rows.length > 0) {
        const loginAt = new Date(res.rows[0].login_at);
        const durationSec = Math.max(0, Math.floor((now.getTime() - loginAt.getTime()) / 1000));
        await this.pool.query(
          `UPDATE instructor_logins SET logout_at = $1, duration_seconds = $2 WHERE id = $3`,
          [now, durationSec, loginId]
        );
      }
    } else {
      const db = this.readJsonDb();
      if (!db.instructorLogins) db.instructorLogins = [];
      const item = db.instructorLogins.find(l => l.id === loginId);
      if (item) {
        item.logoutAt = now.toISOString();
        const start = new Date(item.loginAt).getTime();
        item.durationSeconds = Math.max(0, Math.floor((now.getTime() - start) / 1000));
        this.writeJsonDb(db);
      }
    }
  }

  async recordInstructorLogoutByUserId(userId: string, email?: string): Promise<void> {
    const now = new Date();
    const cleanEmail = (email || '').trim().toLowerCase();
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(
        `SELECT id, login_at FROM instructor_logins 
         WHERE (instructor_id = $1 OR ($2 != '' AND LOWER(TRIM(instructor_email)) = $2)) AND logout_at IS NULL 
         ORDER BY login_at DESC LIMIT 1`,
        [userId, cleanEmail]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const loginAt = new Date(row.login_at);
        const durationSec = Math.max(0, Math.floor((now.getTime() - loginAt.getTime()) / 1000));
        await this.pool.query(
          'UPDATE instructor_logins SET logout_at = $1, duration_seconds = $2 WHERE id = $3',
          [now, durationSec, row.id]
        );
      }
    } else {
      const db = this.readJsonDb();
      if (!db.instructorLogins) db.instructorLogins = [];
      const item = db.instructorLogins.find(l => 
        (l.instructorId === userId || (cleanEmail && (l.instructorEmail || '').trim().toLowerCase() === cleanEmail)) && !l.logoutAt
      );
      if (item) {
        item.logoutAt = now.toISOString();
        const start = new Date(item.loginAt).getTime();
        item.durationSeconds = Math.max(0, Math.floor((now.getTime() - start) / 1000));
        this.writeJsonDb(db);
      }
    }
  }

  async getInstructorLoginsByLicense(licenseId: string, instructorEmail?: string): Promise<InstructorLoginEvent[]> {
    const cleanEmail = (instructorEmail || '').trim().toLowerCase();
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM instructor_logins WHERE license_id = $1 OR ($2 != \'\' AND LOWER(TRIM(instructor_email)) = $2) ORDER BY login_at DESC',
        [licenseId, cleanEmail]
      );
      return res.rows.map(row => ({
        id: row.id,
        licenseId: row.license_id,
        instructorId: row.instructor_id,
        instructorEmail: row.instructor_email,
        instructorName: row.instructor_name,
        loginAt: new Date(row.login_at).toISOString(),
        logoutAt: row.logout_at ? new Date(row.logout_at).toISOString() : undefined,
        durationSeconds: row.duration_seconds || 0,
        success: row.success,
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      }));
    } else {
      const db = this.readJsonDb();
      if (!db.instructorLogins) db.instructorLogins = [];
      return db.instructorLogins.filter(l => 
        l.licenseId === licenseId || (cleanEmail && (l.instructorEmail || '').trim().toLowerCase() === cleanEmail)
      );
    }
  }

  async getLicenseActivitySummary(licenseId: string): Promise<LicenseActivitySummary | null> {
    const license = await this.getLicenseById(licenseId);
    if (!license) return null;

    const isExpired = this.isLicenseExpired(license);
    const instEmail = (license.instructorEmail || '').trim().toLowerCase();
    const logins = await this.getInstructorLoginsByLicense(licenseId, instEmail);
    const allRooms = await this.getRooms();

    // Find all instructor users associated with this license email
    const users = this.isPostgres && this.pool 
      ? (await this.pool.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = $1', [instEmail])).rows.map(r => r.id)
      : this.readJsonDb().users.filter(u => (u.email || '').trim().toLowerCase() === instEmail).map(u => u.id);

    const userIdsFromLogins = logins.map(l => l.instructorId).filter(Boolean);
    const allMatchingUserIds = Array.from(new Set([...users, ...userIdsFromLogins]));

    // Filter rooms created by this instructor or for this license
    const licenseRooms = allRooms.filter(r => 
      r.licenseId === license.id ||
      (r.creatorEmail && r.creatorEmail.trim().toLowerCase() === instEmail) ||
      allMatchingUserIds.includes(r.createdBy) ||
      r.createdBy === license.id ||
      (r.createdBy && r.createdBy.trim().toLowerCase() === instEmail)
    );

    // Fetch team and member details per room
    const roomDetailsMap: Record<string, {
      room: Room;
      teamCount: number;
      participantCount: number;
      actualDurationMinutes: number;
      teams: {
        id: string;
        name: string;
        status: string;
        cash: number;
        members: { userId: string; userName: string; joinedAt?: string }[];
      }[];
    }> = {};

    const allUniqueTeamIds = new Set<string>();
    const allUniqueParticipantIds = new Set<string>();
    let totalRuntimeSecs = 0;
    let completedSessions = 0;
    let activeSessions = 0;

    for (const room of licenseRooms) {
      const teams = await this.getTeamsInRoom(room.id);
      const members = await this.getRoomMembers(room.id);

      // Compute actual running duration in seconds
      let runtimeSec = room.actualDurationSeconds || 0;
      if (room.status === 'active' && room.startedAt) {
        const start = new Date(room.startedAt).getTime();
        const now = Date.now();
        const totalPaused = room.totalPausedMs || 0;
        runtimeSec = Math.max(0, Math.floor((now - start - totalPaused) / 1000));
      }

      totalRuntimeSecs += runtimeSec;
      if (room.status === 'finished') completedSessions++;
      if (room.status === 'active') activeSessions++;

      const roomTeamDetails = teams.map(t => {
        allUniqueTeamIds.add(t.id);
        const teamMembers = members.filter(m => m.teamId === t.id);
        teamMembers.forEach(m => allUniqueParticipantIds.add(m.userId));
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          cash: t.cash,
          members: teamMembers.map(m => ({
            userId: m.userId,
            userName: m.userName
          }))
        };
      });

      // Members not associated with a specific team or all members in room
      members.forEach(m => allUniqueParticipantIds.add(m.userId));

      roomDetailsMap[room.id] = {
        room: {
          ...room,
          actualDurationSeconds: runtimeSec
        },
        teamCount: teams.length,
        participantCount: members.length,
        actualDurationMinutes: Math.round((runtimeSec / 60) * 10) / 10,
        teams: roomTeamDetails
      };
    }

    // Correlate rooms with instructor login visits chronologically
    // If a room was created between loginAt and logoutAt (or next login), associate with that login
    const sortedLogins = [...logins].sort((a, b) => new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime());
    const assignedRoomIds = new Set<string>();

    const loginsWithRooms = sortedLogins.map((login, idx) => {
      const loginTime = new Date(login.loginAt).getTime();
      const nextLoginTime = idx < sortedLogins.length - 1 ? new Date(sortedLogins[idx + 1].loginAt).getTime() : Infinity;
      const logoutTime = login.logoutAt ? new Date(login.logoutAt).getTime() : nextLoginTime;

      const matchingRooms = licenseRooms.filter(r => {
        const roomTime = new Date(r.createdAt).getTime();
        // Give 2 minutes grace before login timestamp for clock drift
        return roomTime >= (loginTime - 120000) && roomTime <= (logoutTime + 60000);
      });

      matchingRooms.forEach(r => assignedRoomIds.add(r.id));

      return {
        ...login,
        rooms: matchingRooms.map(r => roomDetailsMap[r.id]).filter(Boolean)
      };
    });

    // Handle any older or unassigned rooms by creating an initial historical session bucket if needed
    const unassignedRooms = licenseRooms.filter(r => !assignedRoomIds.has(r.id));
    if (unassignedRooms.length > 0) {
      loginsWithRooms.unshift({
        id: `login_historical_${license.id}`,
        licenseId: license.id,
        instructorId: users[0] || 'historical',
        instructorEmail: license.instructorEmail,
        instructorName: `${license.customerName} (Historical Session)`,
        loginAt: unassignedRooms[0]?.createdAt ? new Date(unassignedRooms[0].createdAt).toISOString() : license.createdAt,
        durationSeconds: 0,
        success: true,
        rooms: unassignedRooms.map(r => roomDetailsMap[r.id]).filter(Boolean)
      });
    }

    // Sort logins descending (newest first) for UI display
    loginsWithRooms.sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());

    const allSessionList = licenseRooms.map(r => roomDetailsMap[r.id]).filter(Boolean);
    allSessionList.sort((a, b) => new Date(b.room.createdAt).getTime() - new Date(a.room.createdAt).getTime());

    return {
      license,
      isExpired,
      instructorLogins: loginsWithRooms,
      allSessions: allSessionList,
      totals: {
        totalLogins: logins.length || (unassignedRooms.length > 0 ? 1 : 0),
        totalVisits: logins.length || (unassignedRooms.length > 0 ? 1 : 0),
        totalRoomsGenerated: licenseRooms.length,
        totalUniqueTeams: allUniqueTeamIds.size,
        totalUniqueParticipants: allUniqueParticipantIds.size,
        totalRuntimeSeconds: totalRuntimeSecs,
        totalRuntimeMinutes: Math.round((totalRuntimeSecs / 60) * 10) / 10,
        totalCompletedSessions: completedSessions,
        totalActiveSessions: activeSessions
      }
    };
  }
}

export const db = new DatabaseManager();
