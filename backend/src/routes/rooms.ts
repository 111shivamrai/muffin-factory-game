import { Router, Response } from 'express';
import { db } from '../db/db.js';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from './middleware.js';
import { Room } from '../types/index.js';

const router = Router();

// Helper to generate a unique room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get or create an active demo room code
router.get('/active-demo', async (req, res) => {
  try {
    const rooms = await db.getRooms();
    let demoRoom = rooms.find(r => r.status === 'active' && r.name.toLowerCase().includes('demo'));
    if (!demoRoom) {
      demoRoom = rooms.find(r => r.status === 'active');
    }
    if (!demoRoom) {
      const code = 'DEMO12';
      const roomId = `room_demo_001`;
      const newRoom = {
        id: roomId,
        code,
        name: 'The Golden Crumb Factory (Demo)',
        status: 'active',
        difficulty: 'beginner',
        tickRate: 10,
        currentDay: 0,
        maxDays: 30,
        scenarioId: 'scenario_beginner_preset',
        createdBy: 'user_admin_001',
        createdAt: new Date()
      } as any;
      await db.createRoom(newRoom);
      demoRoom = newRoom;
    }
    if (!demoRoom) {
      throw new Error('Failed to find or create demo room');
    }
    res.json({ code: demoRoom.code });
  } catch (err) {
    console.error('Error finding or creating active demo room:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all rooms (Admin and Instructors)
router.get('/', authenticateJWT, authorizeRoles(['admin', 'instructor']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rooms = await db.getRooms();
    res.json(rooms);
  } catch (err) {
    console.error('Error listing rooms:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Room
router.post('/', authenticateJWT, authorizeRoles(['admin', 'instructor']), async (req: AuthenticatedRequest, res: Response) => {
  const { name, difficulty, tickRate, maxDays, scenarioId } = req.body;

  if (!name || !difficulty || !tickRate || !maxDays) {
    res.status(400).json({ error: 'Missing room details (name, difficulty, tickRate, maxDays)' });
    return;
  }

  try {
    // Generate unique room code and verify it doesn't exist
    let code = generateRoomCode();
    let existing = await db.getRoomByCode(code);
    while (existing) {
      code = generateRoomCode();
      existing = await db.getRoomByCode(code);
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const creatorId = req.user!.id;

    const newRoom: Room = {
      id: roomId,
      code,
      name,
      status: 'configuring',
      difficulty,
      tickRate,
      currentDay: 0,
      maxDays,
      scenarioId: scenarioId || undefined,
      createdBy: creatorId,
      createdAt: new Date()
    };

    const room = await db.createRoom(newRoom);
    res.status(201).json(room);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room details by Code
router.get('/code/:code', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const room = await db.getRoomByCode(req.params.code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json(room);
  } catch (err) {
    console.error('Error checking room code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Room (Instructors and Admins)
router.delete('/:id', authenticateJWT, authorizeRoles(['admin', 'instructor']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const room = await db.getRoomById(req.params.id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    await db.deleteRoom(req.params.id);
    res.json({ success: true, message: 'Room and its associated data deleted successfully' });
  } catch (err) {
    console.error('Error deleting room:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/stop-all', authenticateJWT, authorizeRoles(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const io = req.app.get('io');
    const rooms = await db.getRooms();
    for (const room of rooms) {
      const teams = await db.getTeamsInRoom(room.id);
      for (const row of teams) {
        const t = await db.getTeamState(row.id);
        if (!t) continue;
        t.machines.mixing.active = 0;
        t.machines.baking.active = 0;
        t.machines.icing.active = 0;
        t.machines.packaging.active = 0;
        await db.saveTeamState(t.id, t.cash, t.status, t);
        if (io) {
          io.to(`team_${t.id}`).emit('team_state_updated', t);
          io.to(`room_${room.id}`).emit('instructor_team_updated', t);
        }
      }
    }
    res.json({ message: 'All machines across the system stopped.' });
  } catch (err) {
    console.error('Error stopping all machines:', err);
    res.status(500).json({ error: 'Failed to stop all machines' });
  }
});

export default router;
