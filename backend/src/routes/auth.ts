import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/db.js';
import { User } from '../types/index.js';
import { authenticateJWT, AuthenticatedRequest } from './middleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_muffin_mega_factory_2026';

// Sign up
router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'All fields (name, email, password, role) are required' });
    return;
  }

  if (!['admin', 'instructor', 'operator'].includes(role)) {
    res.status(400).json({ error: 'Invalid user role' });
    return;
  }

  try {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const user: User & { passwordHash: string } = {
      id: userId,
      name,
      email,
      role: role as any,
      createdAt: new Date(),
      passwordHash
    };

    await db.saveUserRaw(user);

    // Sign JWT
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Error signing up user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log in
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Sign JWT
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Error logging in user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log in/Register student operator directly with name and room code
router.post('/student-login', async (req, res) => {
  const { name, roomCode } = req.body;
  if (!name || !roomCode) {
    res.status(400).json({ error: 'Name and Room Code are required' });
    return;
  }

  try {
    const cleanRoomCode = roomCode.trim().toUpperCase();
    const room = await db.getRoomByCode(cleanRoomCode);
    if (!room) {
      res.status(404).json({ error: `Room code "${cleanRoomCode}" not found or room inactive` });
      return;
    }

    const sanitizedName = name.trim();
    if (sanitizedName.length < 2) {
      res.status(400).json({ error: 'Operator name must be at least 2 characters' });
      return;
    }

    // Create a unique email for this operator and room to prevent collisions
    const email = `operator_${sanitizedName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${cleanRoomCode.toLowerCase()}@factory.com`;

    let user = await db.getUserByEmail(email);
    if (!user) {
      const passwordHash = await bcrypt.hash('muffin123', 10);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newUser = {
        id: userId,
        name: sanitizedName,
        email,
        role: 'operator' as const,
        createdAt: new Date(),
        passwordHash
      };
      await db.saveUserRaw(newUser);
      user = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      } as any;
    }

    if (!user) {
      throw new Error('User creation failed');
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Error in student-login:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile
router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
