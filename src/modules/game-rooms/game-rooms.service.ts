import prisma from '../../config/prisma-client.config';
import { RoomStatus } from '../../shared/types/game-enums.type';
import { CreateRoomData } from './interfaces/game-room.interface';

export class GameRoomsService {

  // ============================================
  // CREAR SALA EN BD
  // ============================================
  async createRoom(roomId: string, data: CreateRoomData) {
    const room = await prisma.room.create({
      data: {
        id: roomId, // Usar el ID generado por Socket.IO
        gameTypeId: data.gameTypeId,
        creatorId: data.creatorId,
        betAmount: data.betAmount,
        minPlayers: data.minPlayers,
        maxPlayers: data.maxPlayers,
        totalPot: data.betAmount,
        status: RoomStatus.WAITING,
      },
    });

    console.log(` Room created in DB: ${roomId}`);
    return room;
  }

  // ============================================
  // AGREGAR JUGADOR A LA SALA
  // ============================================
  async addPlayerToRoom(roomId: string, userId: string) {
    // Verificar si ya existe
    const existing = await prisma.roomPlayer.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Crear jugador en sala
    const roomPlayer = await prisma.roomPlayer.create({
      data: {
        roomId,
        userId,
      },
    });

    // Incrementar el pozo total
    await prisma.room.update({
      where: { id: roomId },
      data: {
        totalPot: { increment: (await this.getRoomById(roomId))?.betAmount || 0 },
      },
    });

    return roomPlayer;
  }

  // ============================================
  // ACTUALIZAR ESTADO DE LA SALA
  // ============================================
  async updateRoomStatus(roomId: string, status: RoomStatus) {
    const updateData: any = { status };

    if (status === RoomStatus.COUNTDOWN) {
      updateData.countdownStartedAt = new Date();
    } else if (status === RoomStatus.IN_PROGRESS) {
      updateData.gameStartedAt = new Date();
    } else if (status === RoomStatus.FINISHED) {
      updateData.gameFinishedAt = new Date();
    }

    return await prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });
  }

  // ============================================
  // OBTENER SALA POR ID
  // ============================================
  async getRoomById(roomId: string) {
    return await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        gameType: true,
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                coins: true,
              },
            },
          },
        },
      },
    });
  }

  // ============================================
  // ACTUALIZAR SOCKETID DEL JUGADOR
  // ============================================
  async updatePlayerSocketId(roomId: string, userId: string, socketId: string) {
    await prisma.roomPlayer.updateMany({
      where: {
        roomId,
        userId,
      },
      data: {
        socketId,
      },
    });
  }

  // ============================================
  // ACTUALIZAR RESULTADOS DEL JUGADOR
  // ============================================
  async updatePlayerResults(
    roomId: string,
    userId: string,
    finalPosition: number,
    finalScore: number,
    prizeWon: number
  ) {
    await prisma.roomPlayer.updateMany({
      where: {
        roomId,
        userId,
      },
      data: {
        finalPosition,
        finalScore,
        prizeWon,
      },
    });
  }

  // ============================================
  // VERIFICAR SI EXISTE EL GAMETYPE
  // ============================================
  async ensureGameTypeExists() {
    const existingGameType = await prisma.gameType.findUnique({
      where: { slug: 'trivia-showdown' },
    });

    if (!existingGameType) {
      return await prisma.gameType.create({
        data: {
          name: 'Trivia Showdown',
          slug: 'trivia-showdown',
          description: 'Answer 10 trivia questions faster than your opponents',
          minPlayers: 2,
          maxPlayers: 5,
          questionsPerGame: 10,
          timePerQuestion: 15,
        },
      });
    }

    return existingGameType;
  }
}