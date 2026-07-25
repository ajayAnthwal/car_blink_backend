import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../config/logger.config';
import { verifyAccessToken } from '../modules/auth/strategies/jwt.strategy';

let io: SocketServer | null = null;

/**
 * Initializes Socket.io server with JWT authentication and room setup
 */
export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  logger.info('[SOCKET] Initializing socket.io server...');

  io = new SocketServer(httpServer, {
    cors: {
      origin: '*', // Dynamic configuration allowing connections from test clients/any origin
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  // JWT-based Socket Authentication Middleware
  io.use((socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!authHeader) {
      logger.warn('[SOCKET] Authentication failed: Missing token');
      return next(new Error('Authentication error: Token is required'));
    }

    // Strip "Bearer " prefix if sent via standard auth headers
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    try {
      const decoded = verifyAccessToken(token);
      socket.data = {
        userId: decoded.userId,
        role: decoded.role,
      };
      next();
    } catch (error: any) {
      logger.warn(`[SOCKET] Authentication failed: ${error.message}`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.data;
    logger.info(`[SOCKET] User ${userId} (${role}) connected. Socket ID: ${socket.id}`);

    // Join room named after the userId (e.g. user:userId)
    socket.join(`user:${userId}`);
    // Join room named after the role
    if (role) {
      socket.join(`role:${role}`);
    }

    socket.on('disconnect', () => {
      logger.info(`[SOCKET] User ${userId} disconnected. Socket ID: ${socket.id}`);
    });
  });

  logger.info('[SOCKET] Socket.io server initialized successfully.');
  return io;
};

/**
 * Push an event to a specific user room
 */
export const emitToUser = (userId: string, event: string, payload: any): void => {
  if (!io) {
    logger.warn(`[SOCKET] Cannot emit event "${event}". Socket.io is not initialized yet.`);
    return;
  }

  logger.info(`[SOCKET] Emitting event "${event}" to user room "user:${userId}"`);
  io.to(`user:${userId}`).emit(event, payload);
};

/**
 * Push an event to a specific role room
 */
export const emitToRole = (role: string, event: string, payload: any): void => {
  if (!io) {
    logger.warn(`[SOCKET] Cannot emit event "${event}". Socket.io is not initialized yet.`);
    return;
  }

  logger.info(`[SOCKET] Emitting event "${event}" to role room "role:${role}"`);
  io.to(`role:${role}`).emit(event, payload);
};

/**
 * Returns total count of currently connected sockets
 */
export const getConnectedSocketsCount = (): number => {
  if (!io) return 0;
  return io.sockets.sockets.size;
};

/**
 * Check if a specific user has an active websocket connection
 */
export const isUserConnected = (userId: string): boolean => {
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  return room ? room.size > 0 : false;
};
