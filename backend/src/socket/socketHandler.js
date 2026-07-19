const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { generateQrPayload } = require('../services/qr.service');
const Session = require('../models/Session');

let io = null;
const qrRotationTimers = new Map(); // sessionId -> setInterval handle

/**
 * Initialize Socket.IO server and attach to HTTP server.
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required.'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.institutionId = decoded.institutionId;
      next();
    } catch {
      next(new Error('Invalid or expired authentication token.'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId}, role: ${socket.userRole})`);

    // Faculty joins a session room to receive attendance updates and push QR
    socket.on('join:session', async (data) => {
      try {
        const { sessionId } = data;
        if (!sessionId) return;

        // Verify faculty owns this session
        const session = await Session.findOne({
          _id: sessionId,
          ...(socket.userRole === 'faculty' ? { facultyId: socket.userId } : {}),
          status: 'active',
        }).select('+qrSecret');

        if (!session) {
          socket.emit('error', { message: 'Session not found or not active.' });
          return;
        }

        socket.join(`session:${sessionId}`);
        logger.info(`Socket ${socket.id} joined session:${sessionId}`);

        // If faculty: start QR rotation broadcaster for this session
        if (socket.userRole === 'faculty' && !qrRotationTimers.has(sessionId)) {
          startQrRotation(session);
        }

        socket.emit('session:joined', { sessionId, status: session.status });
      } catch (err) {
        logger.error('join:session error:', err.message);
        socket.emit('error', { message: 'Failed to join session.' });
      }
    });

    // Student joins course room to receive session start notifications
    socket.on('join:course', (data) => {
      const { courseId } = data;
      if (courseId) {
        socket.join(`course:${courseId}`);
        logger.info(`Socket ${socket.id} joined course:${courseId}`);
      }
    });

    socket.on('leave:session', (data) => {
      if (data?.sessionId) {
        socket.leave(`session:${data.sessionId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (reason: ${reason})`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for ${socket.id}:`, err.message);
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
};

/**
 * Start the QR rotation broadcaster for an active session.
 * Emits updated QR data every `qrRotationInterval` seconds.
 */
const startQrRotation = async (session) => {
  if (qrRotationTimers.has(session._id.toString())) return;

  const sessionId = session._id.toString();
  const interval = session.qrRotationInterval * 1000; // convert to ms

  // Send the first QR immediately
  await broadcastQr(session);

  const timer = setInterval(async () => {
    try {
      // Re-fetch session to ensure it's still active
      const freshSession = await Session.findOne({
        _id: sessionId,
        status: 'active',
      }).select('+qrSecret');

      if (!freshSession) {
        stopQrRotation(sessionId);
        return;
      }

      await broadcastQr(freshSession);
    } catch (err) {
      logger.error(`QR rotation error for session ${sessionId}:`, err.message);
    }
  }, interval);

  qrRotationTimers.set(sessionId, timer);
  logger.info(`QR rotation started for session ${sessionId} (every ${session.qrRotationInterval}s)`);
};

/**
 * Stop the QR rotation for a session (called when session ends).
 */
const stopQrRotation = (sessionId) => {
  const timer = qrRotationTimers.get(sessionId);
  if (timer) {
    clearInterval(timer);
    qrRotationTimers.delete(sessionId);
    logger.info(`QR rotation stopped for session ${sessionId}`);
  }
};

/**
 * Broadcast the current QR code to all sockets in the session room.
 */
const broadcastQr = async (session) => {
  if (!io) return;
  try {
    const qrData = await generateQrPayload(session);
    io.to(`session:${session._id}`).emit('qr:updated', {
      sessionId: session._id,
      qr: qrData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('broadcastQr error:', err.message);
  }
};

/**
 * Get the Socket.IO instance.
 * Used by controllers to emit events.
 */
const getIo = () => io;

module.exports = { initSocket, getIo, stopQrRotation, startQrRotation };
