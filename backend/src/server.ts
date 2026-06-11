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

// CORS configuration
const corsOptions = {
  origin: '*', // For development, allow any origin. In production, configure explicitly.
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
