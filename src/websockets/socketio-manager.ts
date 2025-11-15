import { getSocketIOInstance } from '../config/socketio-server.config';
import { RoomStatus } from '../shared/types/game-enums.type';
import {
  RoomData,
  PlayerInRoom,
  CreateRoomPayload,
  JoinRoomPayload,
} from '../shared/types/socket-events.type';
import gameManager from './game-manager';
import { PlayerTransactionsService } from '../modules/player-transactions/player-transactions.service';
import { GameRoomsService } from '../modules/game-rooms/game-rooms.service'; // ⭐ NUEVO

class SocketIOManager {
  private rooms: Map<string, RoomData> = new Map();
  private countdownTimers: Map<string, NodeJS.Timeout> = new Map();
  private transactionsService: PlayerTransactionsService;
  private gameRoomsService: GameRoomsService; // ⭐ NUEVO

  constructor() {
    this.transactionsService = new PlayerTransactionsService();
    this.gameRoomsService = new GameRoomsService(); // ⭐ NUEVO
  }

  // ============================================
  // CREAR SALA (ACTUALIZADO)
  // ============================================
  async createRoom(payload: CreateRoomPayload, socketId: string): Promise<RoomData> {
    const roomId = this.generateRoomId();
    
    const newPlayer: PlayerInRoom = {
      userId: payload.userId,
      username: payload.username,
      avatar: undefined,
      coins: 1000,
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

    // ⭐ CREAR SALA EN LA BASE DE DATOS
    try {
      const gameType = await this.gameRoomsService.ensureGameTypeExists();
      
      await this.gameRoomsService.createRoom(roomId, {
        gameTypeId: gameType.id,
        creatorId: payload.userId,
        betAmount: payload.betAmount,
        minPlayers: 2,
        maxPlayers: 5,
      });

      // Agregar jugador a la sala en BD
      await this.gameRoomsService.addPlayerToRoom(roomId, payload.userId);
      await this.gameRoomsService.updatePlayerSocketId(roomId, payload.userId, socketId);

    } catch (error) {
      console.error(`❌ Error creating room in DB:`, error);
      // Limpiar sala en memoria si falla
      this.rooms.delete(roomId);
      throw error;
    }

    console.log(`🎮 Room created: ${roomId} by ${payload.username}`);
    
    return newRoom;
  }

  // ============================================
  // UNIRSE A SALA (ACTUALIZADO)
  // ============================================
  async joinRoom(payload: JoinRoomPayload, socketId: string): Promise<RoomData> {
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

    const existingPlayer = room.players.find(p => p.userId === payload.userId);
    if (existingPlayer) {
      throw new Error('Player already in room');
    }

    const newPlayer: PlayerInRoom = {
      userId: payload.userId,
      username: payload.username,
      avatar: undefined,
      coins: 1000,
      isConnected: true,
      socketId,
      joinedAt: new Date(),
    };

    room.players.push(newPlayer);
    room.currentPlayers++;
    room.totalPot += room.betAmount;

    // ⭐ AGREGAR JUGADOR A LA SALA EN BD
    try {
      await this.gameRoomsService.addPlayerToRoom(payload.roomId, payload.userId);
      await this.gameRoomsService.updatePlayerSocketId(payload.roomId, payload.userId, socketId);
    } catch (error) {
      console.error(`❌ Error adding player to room in DB:`, error);
      // Revertir cambios en memoria
      room.players = room.players.filter(p => p.userId !== payload.userId);
      room.currentPlayers--;
      room.totalPot -= room.betAmount;
      throw error;
    }

    if (room.currentPlayers >= room.minPlayers && room.status === RoomStatus.WAITING) {
      await this.startCountdown(room.roomId);
    }

    console.log(`👤 Player ${payload.username} joined room ${payload.roomId}`);
    
    return room;
  }

  // ============================================
  // INICIAR COUNTDOWN (ACTUALIZADO)
  // ============================================
  async startCountdown(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    
    if (!room || room.status !== RoomStatus.WAITING) {
      return;
    }

    room.status = RoomStatus.COUNTDOWN;
    room.countdownSeconds = 30;

    // ⭐ ACTUALIZAR ESTADO EN BD
    await this.gameRoomsService.updateRoomStatus(roomId, RoomStatus.COUNTDOWN);

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
  // INICIAR JUEGO (ACTUALIZADO)
  // ============================================
  async startGame(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return;
    }

    try {
      const playerIds = room.players.map(p => p.userId);
      await this.transactionsService.processBets(roomId, playerIds, room.betAmount);

      room.status = RoomStatus.IN_PROGRESS;
      
      // ⭐ ACTUALIZAR ESTADO EN BD
      await this.gameRoomsService.updateRoomStatus(roomId, RoomStatus.IN_PROGRESS);
      
      const io = getSocketIOInstance();
      io.to(roomId).emit('game:started', {
        roomId,
        players: room.players.map(p => ({
          userId: p.userId,
          username: p.username,
        })),
      });

      console.log(`🎯 Game started in room ${roomId} - Bets processed`);
      
      gameManager.startGame(
        roomId, 
        room.players.map(p => ({
          userId: p.userId,
          username: p.username,
        })),
        room.betAmount,
        room.totalPot
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start game';
      console.error(`❌ Error starting game in room ${roomId}:`, errorMessage);
      
      this.cancelCountdown(roomId);
      room.status = RoomStatus.CANCELLED;
      
      const io = getSocketIOInstance();
      io.to(roomId).emit('error', {
        message: errorMessage,
        code: 'GAME_START_ERROR',
      });
    }
  }

  // ============================================
  // LIMPIAR SALA DESPUÉS DEL JUEGO (ACTUALIZADO)
  // ============================================
  async cleanupRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    
    if (room) {
      room.status = RoomStatus.FINISHED;
      
      // ⭐ ACTUALIZAR ESTADO EN BD
      await this.gameRoomsService.updateRoomStatus(roomId, RoomStatus.FINISHED);
      
      setTimeout(() => {
        this.deleteRoom(roomId);
        
        const io = getSocketIOInstance();
        io.emit('room:deleted', { roomId });
        
        console.log(`🧹 Room cleaned up and deleted: ${roomId}`);
      }, 30000);
    }
  }

  // ... (resto del código igual: leaveRoom, handlePlayerDisconnection, cancelCountdown, deleteRoom, etc)

  leaveRoom(roomId: string, userId: string): RoomData | null {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return null;
    }

    if (room.status === RoomStatus.IN_PROGRESS) {
      return this.handlePlayerDisconnection(roomId, userId);
    }

    room.players = room.players.filter(p => p.userId !== userId);
    room.currentPlayers--;
    room.totalPot -= room.betAmount;

    if (room.creatorId === userId && room.players.length > 0) {
      room.creatorId = room.players[0].userId;
    }

    if (room.players.length === 0) {
      this.deleteRoom(roomId);
      return null;
    }

    if (room.currentPlayers < room.minPlayers && room.status === RoomStatus.COUNTDOWN) {
      this.cancelCountdown(roomId);
    }

    console.log(`👋 Player ${userId} left room ${roomId}`);
    
    return room;
  }

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

    const allDisconnected = room.players.every(p => !p.isConnected);
    if (allDisconnected) {
      this.deleteRoom(roomId);
      return null;
    }

    return room;
  }

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

  deleteRoom(roomId: string): void {
    const timer = this.countdownTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.countdownTimers.delete(roomId);
    }

    this.rooms.delete(roomId);
    console.log(`🗑️ Room deleted: ${roomId}`);
  }

  getAvailableRooms(): RoomData[] {
    return Array.from(this.rooms.values()).filter(
      room => room.status === RoomStatus.WAITING || room.status === RoomStatus.COUNTDOWN
    );
  }

  getRoomById(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId);
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new SocketIOManager();