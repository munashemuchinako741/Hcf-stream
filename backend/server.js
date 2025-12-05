const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cluster = require('cluster');
const os = require('os');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const logger = require('./config/logger');
const { apiLimiter, authLimiter, staticLimiter } = require('./middleware/rateLimiter');
const { startHealthMonitoring } = require('./scripts/health-monitor');

// Check if this is the master process
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;

  logger.info(`Master ${process.pid} is running`);
  logger.info(`Starting ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exits
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
    logger.info('Starting a new worker');
    cluster.fork();
  });
} else {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });
  const PORT = process.env.PORT || 5000;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser()); // Parse cookies for refresh token handling

  // Security middleware
  const securityMiddleware = require('./middleware/security');
  app.use(securityMiddleware);

  // Compression middleware
  const compressionMiddleware = require('./middleware/compression');
  app.use(compressionMiddleware);

  // Prometheus metrics middleware
  const prometheusMiddleware = require('./config/prometheus');
  app.use(prometheusMiddleware);

  // Apply rate limiting
  app.use('/api/', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);


  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
    });
  });

  // Routes
  app.get('/', (req, res) => {
    res.json({ message: 'HCF Stream Backend API' });
  });

  // Auth routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/v2/auth', require('./routes/auth-v2'));

  // Live Stream routes
  app.use('/api/live-stream', require('./routes/live-stream'));

  // Archive routes
  app.use('/api/archive', require('./routes/archive'));

  // Admin routes
  app.use('/api/admin', require('./routes/admin'));

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);

    // Join chat room
    socket.on('join-chat', (data) => {
      socket.join('live-chat');
      logger.info(`User ${socket.id} joined live chat`);
    });

    // Handle new messages
    socket.on('send-message', (data) => {
      const message = {
        id: require('uuid').v4(),
        user: data.user,
        message: data.message,
        timestamp: new Date(),
        isLiveComment: true
      };
      // Broadcast to all clients in the chat room
      io.to('live-chat').emit('new-message', message);
      logger.info(`Message from ${data.user}: ${data.message}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`);
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  server.listen(PORT, () => {
    logger.info(`Worker ${process.pid} started on port ${PORT}`);

    // Start health monitoring in production
    if (process.env.NODE_ENV === 'production') {
      startHealthMonitoring();
    }
  });
}
