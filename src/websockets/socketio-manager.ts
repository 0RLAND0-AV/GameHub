import { getSocketIOInstance } from '../config/socketio-server.config';
import { RoomStatus, PlayerConnectionStatus } from '../shared/types/game-enums.type';
import {
  RoomData,
  PlayerInRoom,
  CreateRoomPayload,
  JoinRoomPayload,
} from '../shared/types/socket-events.type';

class SocketIOManager {
  private rooms: Map<string, RoomData> = new Map();
  private countdownTimers: Map<string, NodeJS.Timeout> = new Map();

  // ============================================
  // CREAR SALA
  // ============================================
  createRoom(payload: CreateRoomPayload, socketId: string): RoomData {
    const roomId = this.generateRoomId();
    
    const newPlayer: PlayerInRoom = {
      userId: payload.userId,
      username: payload.username,
      avatar: undefined,
      coins: 1000, // Simulado por ahora
      isConnected: true,
      socketId,
      joinedAt: new Date(),
    };

    const newRoom: RoomData = {
      roomId,
      gameType: 'trivia-showdown',
      betAmount: payload.betAmount,
      status: RoomStatus.WAITING,
      minPlayers: 2,
      maxPlayers: 5,
      currentPlayers: 1,
      totalPot: payload.betAmount,
      creatorId: payload.userId,
      players: [newPlayer],
    };

    this.rooms.set(roomId, newRoom);
    console.log(`🎮 Room created: ${roomId} by ${payload.username}`);
    
    return newRoom;
  }

  // ============================================
  // UNIRSE A SALA
  // ============================================
  joinRoom(payload: JoinRoomPayload, socketId: string): RoomData {
    const room = this.rooms.get(payload.roomId);
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== RoomStatus.WAITING && room.status !== RoomStatus.COUNTDOWN) {
      throw new Error('Room is not accepting players');
    }

    if (room.currentPlayers >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    // Verificar si el jugador ya está en la sala
    const existingPlayer = room.players.find(p => p.userId === payload.userId);
    if (existingPlayer) {
      throw new Error('Player already in room');
    }

    const newPlayer: PlayerInRoom = {
      userId: payload.userId,
      username: payload.username,
      avatar: undefined,
      coins: 1000, // Simulado
      isConnected: true,
      socketId,
      joinedAt: new Date(),
    };

    room.players.push(newPlayer);
    room.currentPlayers++;
    room.totalPot += room.betAmount;

    // Si alcanzamos el mínimo de jugadores, iniciar countdown
    if (room.currentPlayers >= room.minPlayers && room.status === RoomStatus.WAITING) {
      this.startCountdown(room.roomId);
    }

    console.log(`👤 Player ${payload.username} joined room ${payload.roomId}`);
    
    return room;
  }

  // ============================================
  // SALIR DE SALA
  // ============================================
  leaveRoom(roomId: string, userId: string): RoomData | null {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return null;
    }

    // Si el juego ya empezó, no permitir salir (solo desconexión)
    if (room.status === RoomStatus.IN_PROGRESS) {
      return this.handlePlayerDisconnection(roomId, userId);
    }

    // Remover jugador
    room.players = room.players.filter(p => p.userId !== userId);
    room.currentPlayers--;
    room.totalPot -= room.betAmount;

    // Si era el creador y hay otros jugadores, asignar nuevo creador
    if (room.creatorId === userId && room.players.length > 0) {
      room.creatorId = room.players[0].userId;
    }

    // Si no quedan jugadores, eliminar sala
    if (room.players.length === 0) {
      this.deleteRoom(roomId);
      return null;
    }

    // Si bajamos del mínimo de jugadores, cancelar countdown
    if (room.currentPlayers < room.minPlayers && room.status === RoomStatus.COUNTDOWN) {
      this.cancelCountdown(roomId);
    }

    console.log(`👋 Player ${userId} left room ${roomId}`);
    
    return room;
  }

  // ============================================
  // DESCONEXIÓN DE JUGADOR
  // ============================================
  handlePlayerDisconnection(roomId: string, userId: string): RoomData | null {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return null;
    }

    const player = room.players.find(p => p.userId === userId);
    if (player) {
      player.isConnected = false;
      console.log(`🔌 Player ${userId} disconnected from room ${roomId}`);
    }

    // Si todos se desconectaron, eliminar sala
    const allDisconnected = room.players.every(p => !p.isConnected);
    if (allDisconnected) {
      this.deleteRoom(roomId);
      return null;
    }

    return room;
  }

  // ============================================
  // INICIAR COUNTDOWN
  // ============================================
  startCountdown(roomId: string): void {
    const room = this.rooms.get(roomId);
    
    if (!room || room.status !== RoomStatus.WAITING) {
      return;
    }

    room.status = RoomStatus.COUNTDOWN;
    room.countdownSeconds = 30;

    const io = getSocketIOInstance();
    io.to(roomId).emit('countdown:started', { roomId, secondsRemaining: 30 });

    const timer = setInterval(() => {
      const currentRoom = this.rooms.get(roomId);
      
      if (!currentRoom || currentRoom.status !== RoomStatus.COUNTDOWN) {
        clearInterval(timer);
        this.countdownTimers.delete(roomId);
        return;
      }

      if (currentRoom.countdownSeconds !== undefined) {
        currentRoom.countdownSeconds--;
        
        io.to(roomId).emit('countdown:tick', {
          roomId,
          secondsRemaining: currentRoom.countdownSeconds,
        });

        if (currentRoom.countdownSeconds <= 0) {
          clearInterval(timer);
          this.countdownTimers.delete(roomId);
          this.startGame(roomId);
        }
      }
    }, 1000);

    this.countdownTimers.set(roomId, timer);
    console.log(`⏱️ Countdown started for room ${roomId}`);
  }

  // ============================================
  // CANCELAR COUNTDOWN
  // ============================================
  cancelCountdown(roomId: string): void {
    const timer = this.countdownTimers.get(roomId);
    
    if (timer) {
      clearInterval(timer);
      this.countdownTimers.delete(roomId);
    }

    const room = this.rooms.get(roomId);
    if (room) {
      room.status = RoomStatus.WAITING;
      room.countdownSeconds = undefined;
      
      const io = getSocketIOInstance();
      io.to(roomId).emit('countdown:cancelled', { roomId });
      
      console.log(`❌ Countdown cancelled for room ${roomId}`);
    }
  }

  // ============================================
  // INICIAR JUEGO
  // ============================================
  startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return;
    }

    room.status = RoomStatus.IN_PROGRESS;
    
    const io = getSocketIOInstance();
    io.to(roomId).emit('game:started', {
      roomId,
      players: room.players.map(p => ({
        userId: p.userId,
        username: p.username,
      })),
    });

    console.log(`🎯 Game started in room ${roomId}`);
    
    // Aquí conectaremos con la lógica del juego (FASE 2)
  }

  // ============================================
  // ELIMINAR SALA
  // ============================================
  deleteRoom(roomId: string): void {
    const timer = this.countdownTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.countdownTimers.delete(roomId);
    }

    this.rooms.delete(roomId);
    console.log(`🗑️ Room deleted: ${roomId}`);
  }

  // ============================================
  // OBTENER SALAS DISPONIBLES
  // ============================================
  getAvailableRooms(): RoomData[] {
    return Array.from(this.rooms.values()).filter(
      room => room.status === RoomStatus.WAITING || room.status === RoomStatus.COUNTDOWN
    );
  }

  // ============================================
  // OBTENER SALA POR ID
  // ============================================
  getRoomById(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId);
  }

  // ============================================
  // UTILIDADES
  // ============================================
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new SocketIOManager();