import prisma from '../../config/prisma-client.config';
import { GameSessionStatus } from '../../shared/types/game-enums.type';

export class GameSessionsService {
  // ============================================
  // CREAR SESIÓN DE JUEGO
  // ============================================
  async createGameSession(roomId: string) {
    try {
      const gameSession = await prisma.gameSession.create({
        data: {
          roomId,
          status: GameSessionStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      console.log(`✅ Game session created: ${gameSession.id} for room ${roomId}`);
      return gameSession;
    } catch (error) {
      console.error(`❌ Error creating game session for room ${roomId}:`, error);
      throw error;
    }
  }

  // ============================================
  // FINALIZAR SESIÓN DE JUEGO
  // ============================================
  async finishGameSession(gameSessionId: string) {
    try {
      const gameSession = await prisma.gameSession.update({
        where: { id: gameSessionId },
        data: {
          status: GameSessionStatus.FINISHED,
          finishedAt: new Date(),
        },
      });

      console.log(`✅ Game session finished: ${gameSessionId}`);
      return gameSession;
    } catch (error) {
      console.error(`❌ Error finishing game session ${gameSessionId}:`, error);
      throw error;
    }
  }

  // ============================================
  // OBTENER SESIÓN DE JUEGO
  // ============================================
  async getGameSession(gameSessionId: string) {
    try {
      const gameSession = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        include: {
          gameSessionQuestions: {
            include: {
              question: {
                include: {
                  options: true,
                },
              },
            },
          },
          playerAnswers: true,
        },
      });

      return gameSession;
    } catch (error) {
      console.error(`❌ Error fetching game session ${gameSessionId}:`, error);
      throw error;
    }
  }

  // ============================================
  // CANCELAR SESIÓN DE JUEGO
  // ============================================
  async cancelGameSession(gameSessionId: string) {
    try {
      const gameSession = await prisma.gameSession.update({
        where: { id: gameSessionId },
        data: {
          status: GameSessionStatus.CANCELLED,
          finishedAt: new Date(),
        },
      });

      console.log(`❌ Game session cancelled: ${gameSessionId}`);
      return gameSession;
    } catch (error) {
      console.error(`❌ Error cancelling game session ${gameSessionId}:`, error);
      throw error;
    }
  }
}


