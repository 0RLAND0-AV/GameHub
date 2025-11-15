import { Socket } from 'socket.io';
import socketIOManager from '../socketio-manager';
import { getSocketIOInstance } from '../../config/socketio-server.config';
import { GameEventType } from '../../shared/types/game-enums.type';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  SocketErrorResponse,
} from '../../shared/types/socket-events.type';

export function handleRoomConnection(socket: Socket): void {
  
  // ============================================
  // CREAR SALA
  // ============================================
  socket.on('room:create', (payload: CreateRoomPayload) => {
    try {
      console.log(`📥 room:create received from ${payload.username}`);
      
      // Validaciones básicas
      if (!payload.userId || !payload.username || !payload.betAmount) {
        throw new Error('Invalid payload');
      }

      if (payload.betAmount < 10 || payload.betAmount > 1000) {
        throw new Error('Bet amount must be between 10 and 1000');
      }

      const room = socketIOManager.createRoom(payload, socket.id);
      
      // Unir el socket a la sala de Socket.IO
      socket.join(room.roomId);
      
      // Emitir evento de sala creada al creador
      socket.emit(GameEventType.ROOM_CREATED, room);
      
      // Broadcast a todos los clientes que hay una nueva sala disponible
      const io = getSocketIOInstance();
      io.emit(GameEventType.ROOM_UPDATED, {
        availableRooms: socketIOManager.getAvailableRooms(),
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      socket.emit(GameEventType.ERROR, {
        message: errorMessage,
        code: 'ROOM_CREATE_ERROR',
      } as SocketErrorResponse);
    }
  });

  // ============================================
  // UNIRSE A SALA
  // ============================================
  socket.on('room:join', (payload: JoinRoomPayload) => {
    try {
      console.log(`📥 room:join received: ${payload.username} -> ${payload.roomId}`);
      
      if (!payload.roomId || !payload.userId || !payload.username) {
        throw new Error('Invalid payload');
      }

      const room = socketIOManager.joinRoom(payload, socket.id);
      
      // Unir el socket a la sala
      socket.join(room.roomId);
      
      // Notificar al jugador que se unió
      socket.emit(GameEventType.PLAYER_JOINED, room);
      
      // Notificar a todos en la sala que un nuevo jugador se unió
      const io = getSocketIOInstance();
      socket.to(room.roomId).emit(GameEventType.ROOM_UPDATED, room);
      
      // Actualizar lista de salas disponibles para todos
      io.emit(GameEventType.ROOM_UPDATED, {
        availableRooms: socketIOManager.getAvailableRooms(),
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      socket.emit(GameEventType.ERROR, {
        message: errorMessage,
        code: 'ROOM_JOIN_ERROR',
      } as SocketErrorResponse);
    }
  });

  // ============================================
  // SALIR DE SALA
  // ============================================
  socket.on('room:leave', (payload: { roomId: string; userId: string }) => {
    try {
      console.log(`📥 room:leave received: ${payload.userId} from ${payload.roomId}`);
      
      const room = socketIOManager.leaveRoom(payload.roomId, payload.userId);
      
      // Salir de la sala de Socket.IO
      socket.leave(payload.roomId);
      
      if (room) {
        // Notificar a los demás jugadores
        const io = getSocketIOInstance();
        io.to(payload.roomId).emit(GameEventType.PLAYER_LEFT, {
          roomId: payload.roomId,
          userId: payload.userId,
          room,
        });
        
        // Actualizar lista de salas disponibles
        io.emit(GameEventType.ROOM_UPDATED, {
          availableRooms: socketIOManager.getAvailableRooms(),
        });
      } else {
        // La sala fue eliminada
        const io = getSocketIOInstance();
        io.emit(GameEventType.ROOM_DELETED, { roomId: payload.roomId });
      }

      socket.emit(GameEventType.PLAYER_LEFT, { success: true });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      socket.emit(GameEventType.ERROR, {
        message: errorMessage,
        code: 'ROOM_LEAVE_ERROR',
      } as SocketErrorResponse);
    }
  });

  // ============================================
  // OBTENER SALAS DISPONIBLES
  // ============================================
  socket.on('rooms:list', () => {
    try {
      const availableRooms = socketIOManager.getAvailableRooms();
      socket.emit('rooms:list', { availableRooms });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      socket.emit(GameEventType.ERROR, {
        message: errorMessage,
        code: 'ROOMS_LIST_ERROR',
      } as SocketErrorResponse);
    }
  });

  // ============================================
  // DESCONEXIÓN
  // ============================================
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    
    // Buscar en qué sala estaba este socket y manejarlo
    const rooms = socketIOManager.getAvailableRooms();
    rooms.forEach(room => {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        const updatedRoom = socketIOManager.handlePlayerDisconnection(
          room.roomId,
          player.userId
        );
        
        if (updatedRoom) {
          const io = getSocketIOInstance();
          io.to(room.roomId).emit(GameEventType.PLAYER_DISCONNECTED, {
            roomId: room.roomId,
            userId: player.userId,
            room: updatedRoom,
          });
        }
      }
    });
  });
}