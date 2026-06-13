import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { db } from './db/db.js';
import authRoutes from './routes/auth.js';
import scenarioRoutes from './routes/scenarios.js';
import roomRoutes from './routes/rooms.js';
import { registerSocketHandler } from './sockets/socketHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration — allow Netlify frontend + localhost dev
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any netlify.app subdomain or configured frontend URL
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.railway.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for now — lock down in prod
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST routes
app.use('/api/auth', authRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/rooms', roomRoutes);

// Simple healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Configure Socket.IO server
const io = new Server(server, {
  cors: corsOptions
});
app.set('io', io);

// Register Sockets Manager
registerSocketHandler(io);

const PORT = process.env.PORT || 5001;

// Initialize Database then start server
db.init().then(() => {
  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  MUFFIN MEGA FACTORY BACKEND SERVER IS RUNNING`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`===============================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database adapter:', err);
  process.exit(1);
});
