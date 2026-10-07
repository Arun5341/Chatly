import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { connectDB, isMongoConnected } from './config/db.js';
import { seedDatabase } from './config/seedData.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import uploadRoutes from './routes/upload.js';
import notificationRoutes from './routes/notifications.js';
import { initSocketHandler } from './socket/socketHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static upload path
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Seed API endpoint
app.post('/api/seed', async (req, res) => {
  if (isMongoConnected) {
    await seedDatabase();
    return res.json({ message: 'Database seeded with random users successfully!' });
  }
  res.json({ message: 'Running in Memory mode. Pre-seeded users are ready.' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Chatly Backend API Server',
    timestamp: new Date().toISOString(),
  });
});

// Serve Frontend Static Production Bundle (Single Server Deployment)
const frontendDistPath = path.join(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  const localDist = path.join(process.cwd(), 'public');
  if (fs.existsSync(localDist)) {
    app.use(express.static(localDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(localDist, 'index.html'));
    });
  }
}

// Initialize Socket.IO handlers
initSocketHandler(io);

const PORT = process.env.PORT || 5000;

// Connect Database & Start Server
const startServer = async () => {
  await connectDB();
  if (isMongoConnected) {
    await seedDatabase();
  }
  server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` 🚀 Chatly Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(` 📡 HTTP API & Socket.IO listening on port ${PORT}`);
    console.log(`===================================================`);
  });
};

startServer();
