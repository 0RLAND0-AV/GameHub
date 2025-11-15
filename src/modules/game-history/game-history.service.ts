import prisma from '../../config/prisma-client.config';
import { CreateGameHistoryData } from './interfaces/game-history.interface';

export class GameHistoryService {

  // ============================================
  // CREAR HISTORIAL DE PARTIDA
  // ============================================
  async createGameHistory(data: CreateGameHistoryData[]) {
    return await prisma.gameHistory.createMany({
      data,
    });
  }

  // ============================================
  // OBTENER HISTORIAL DEL JUGADOR
  // ============================================
  async getPlayerHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.gameHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          room: {
            include: {
              gameType: true,
            },
          },
          gameSession: true,
        },
      }),
      prisma.gameHistory.count({ where: { userId } }),
    ]);

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // OBTENER ESTADÍSTICAS DE PARTIDAS
  // ============================================
  async getPlayerStats(userId: string) {
    const history = await prisma.gameHistory.findMany({
      where: { userId },
    });

    const stats = {
      totalGames: history.length,
      firstPlace: history.filter(h => h.finalPosition === 1).length,
      secondPlace: history.filter(h => h.finalPosition === 2).length,
      thirdPlace: history.filter(h => h.finalPosition === 3).length,
      totalPrizesWon: history.reduce((sum, h) => sum + h.prizeWon, 0),
      averagePosition: history.length > 0 
        ? history.reduce((sum, h) => sum + h.finalPosition, 0) / history.length 
        : 0,
      averageScore: history.length > 0
        ? history.reduce((sum, h) => sum + h.finalScore, 0) / history.length
        : 0,
    };

    return stats;
  }

  // ============================================
  // OBTENER RANKING GLOBAL
  // ============================================
  async getGlobalRanking(limit: number = 10) {
    const users = await prisma.user.findMany({
      include: {
        stats: true,
      },
      orderBy: {
        stats: {
          victories: 'desc',
        },
      },
      take: limit,
    });

    return users.map((user, index) => ({
      position: index + 1,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      victories: user.stats?.victories || 0,
      totalGames: user.stats?.totalGames || 0,
      winRate: user.stats?.totalGames 
        ? ((user.stats?.victories || 0) / user.stats.totalGames) * 100 
        : 0,
      accuracy: user.stats?.accuracyPercentage || 0,
    }));
  }
}