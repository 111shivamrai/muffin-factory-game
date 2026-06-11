import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { User, Room, TeamState, SavedScenario, UserRole } from '../types/index.js';

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
}

const initialSchema: Schema = {
  users: [],
  rooms: [],
  teams: [],
  roomMembers: [],
  scenarios: []
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
    const adminEmail = 'admin@factory.com';
    const existingAdmin = await this.getUserByEmail(adminEmail);
    if (!existingAdmin) {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.default.hash('muffin123', 10);
      
      const adminUser: User & { passwordHash: string } = {
        id: 'user_admin_001',
        name: 'System Admin',
        email: adminEmail,
        role: 'admin',
        createdAt: new Date(),
        passwordHash: hash
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
      console.log(' - Admin: admin@factory.com (muffin123)');
      console.log(' - Instructor: instructor@factory.com (muffin123)');
      console.log(' - Operator: operator@factory.com (muffin123)');

      // Seed default scenarios
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
          rawMaterialCosts: { baseMix: 5.0, packaging: 1.0, orderCost: 100.0 },
          leadTimes: { rawMaterial: 2, machineProcurement: 3 },
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
            mixing: { capacityPerMachine: 100, purchaseCost: 2000, operatingCost: 40, breakdownProbability: 0, breakdownDuration: 2, repairCost: 300 },
            baking: { capacityPerMachine: 80, purchaseCost: 3000, operatingCost: 60, breakdownProbability: 0, breakdownDuration: 2, repairCost: 500 },
            icing: { capacityPerMachine: 120, purchaseCost: 1500, operatingCost: 30, breakdownProbability: 0, breakdownDuration: 1, repairCost: 200 },
            packaging: { capacityPerMachine: 150, purchaseCost: 1000, operatingCost: 20, breakdownProbability: 0, breakdownDuration: 1, repairCost: 150 }
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
          rawMaterialCosts: { baseMix: 5.0, packaging: 1.0, orderCost: 150.0 },
          leadTimes: { rawMaterial: 3, machineProcurement: 5 },
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
            mixing: { capacityPerMachine: 100, purchaseCost: 2000, operatingCost: 50, breakdownProbability: 0.015, breakdownDuration: 2, repairCost: 300 },
            baking: { capacityPerMachine: 80, purchaseCost: 3000, operatingCost: 80, breakdownProbability: 0.015, breakdownDuration: 2, repairCost: 500 },
            icing: { capacityPerMachine: 120, purchaseCost: 1500, operatingCost: 40, breakdownProbability: 0.01, breakdownDuration: 1, repairCost: 200 },
            packaging: { capacityPerMachine: 150, purchaseCost: 1000, operatingCost: 30, breakdownProbability: 0.01, breakdownDuration: 1, repairCost: 150 }
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
          rawMaterialCosts: { baseMix: 6.0, packaging: 1.2, orderCost: 200.0 },
          leadTimes: { rawMaterial: 4, machineProcurement: 6 },
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
            mixing: { capacityPerMachine: 100, purchaseCost: 2500, operatingCost: 60, breakdownProbability: 0.03, breakdownDuration: 3, repairCost: 400 },
            baking: { capacityPerMachine: 80, purchaseCost: 3500, operatingCost: 90, breakdownProbability: 0.03, breakdownDuration: 3, repairCost: 600 },
            icing: { capacityPerMachine: 120, purchaseCost: 1800, operatingCost: 50, breakdownProbability: 0.025, breakdownDuration: 2, repairCost: 250 },
            packaging: { capacityPerMachine: 150, purchaseCost: 1200, operatingCost: 40, breakdownProbability: 0.02, breakdownDuration: 2, repairCost: 200 }
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
        }
      ];

      for (const sc of defaultScenarios) {
        await this.saveScenario(sc);
      }
      console.log('Seeded default scenarios (Beginner, Intermediate, Advanced).');
    }
  }

  // JSON Helper: Read DB
  private readJsonDb(): Schema {
    try {
      const content = fs.readFileSync(JSON_DB_PATH, 'utf-8');
      return JSON.parse(content);
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
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
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
      const user = db.users.find(u => u.email === email) as (User & { passwordHash: string }) | undefined;
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
        `INSERT INTO rooms (id, code, name, status, difficulty, tick_rate, current_day, max_days, scenario_id, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [room.id, room.code, room.name, room.status, room.difficulty, room.tickRate, room.currentDay, room.maxDays, room.scenarioId, room.createdBy, room.createdAt]
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
      return {
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
        createdBy: row.created_by
      };
    } else {
      const db = this.readJsonDb();
      const r = db.rooms.find(room => room.code.toLowerCase() === code.toLowerCase());
      return r || null;
    }
  }

  async getRoomById(id: string): Promise<Room | null> {
    if (this.isPostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
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
        createdBy: row.created_by
      };
    } else {
      const db = this.readJsonDb();
      const r = db.rooms.find(room => room.id === id);
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
        createdBy: row.created_by
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
      return res.rows.map(row => {
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
          holdingCostRate: conf.holdingCostRate !== undefined ? conf.holdingCostRate : 0.02,
          lostSalesPenaltyRate: conf.lostSalesPenaltyRate !== undefined ? conf.lostSalesPenaltyRate : 2.5,
          rawMaterialCosts: conf.rawMaterialCosts || { baseMix: 5.0, packaging: 1.0, orderCost: 150.0 },
          leadTimes: conf.leadTimes || { rawMaterial: 3, machineProcurement: 5 },
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
        holdingCostRate: conf.holdingCostRate !== undefined ? conf.holdingCostRate : 0.02,
        lostSalesPenaltyRate: conf.lostSalesPenaltyRate !== undefined ? conf.lostSalesPenaltyRate : 2.5,
        rawMaterialCosts: conf.rawMaterialCosts || { baseMix: 5.0, packaging: 1.0, orderCost: 150.0 },
        leadTimes: conf.leadTimes || { rawMaterial: 3, machineProcurement: 5 },
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
}

export const db = new DatabaseManager();
