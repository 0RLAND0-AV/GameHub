// src/config/socketio-server.config.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { handleRoomConnection } from '../websockets/handlers/room-connection.handler';
import { handleTriviaGameplay } from '../websockets/handlers/trivia-gameplay.handler';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HTTPServer): SocketIOServer {
  // Configurar CORS según entorno
  const corsOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN?.split(',') || '*')
    : '*';

  io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'], // Importante para Render
  });

  io.on('connection', (socket) => {
    console.log(` Client connected: ${socket.id}`);
    
    // Registrar handlers
    handleRoomConnection(socket);
    handleTriviaGameplay(socket);
    
    socket.on('disconnect', (reason) => {
      console.log(` Client disconnected: ${socket.id} - Reason: ${reason}`);
    });
  });

  console.log(' Socket.IO initialized with handlers');
  return io;
}

export function getSocketIOInstance(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocketIO first.');
  }
  return io;
}