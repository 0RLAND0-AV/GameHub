import { Request, Response } from 'express';
import { GameHistoryService } from './game-history.service';
import { ResponseFormatter } from '../../shared/utils/response-formatter.utils';

export class GameHistoryController {
  private gameHistoryService: GameHistoryService;

  constructor() {
    this.gameHistoryService = new GameHistoryService();
  }

  // ============================================
  // OBTENER MI HISTORIAL
  // ============================================
  getMyHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(
          ResponseFormatter.error('User not authenticated', 'NOT_AUTHENTICATED')
        );
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.gameHistoryService.getPlayerHistory(
        req.user.userId,
        page,
        limit
      );

      res.status(200).json(
        ResponseFormatter.success('Game history retrieved successfully', result)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get history';
      res.status(500).json(
        ResponseFormatter.error(errorMessage, 'GET_HISTORY_ERROR')
      );
    }
  };

  // ============================================
  // OBTENER MIS ESTADÍSTICAS
  // ============================================
  getMyStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(
          ResponseFormatter.error('User not authenticated', 'NOT_AUTHENTICATED')
        );
        return;
      }

      const stats = await this.gameHistoryService.getPlayerStats(req.user.userId);

      res.status(200).json(
        ResponseFormatter.success('Game stats retrieved successfully', stats)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get stats';
      res.status(500).json(
        ResponseFormatter.error(errorMessage, 'GET_STATS_ERROR')
      );
    }
  };

  // ============================================
  // OBTENER RANKING GLOBAL
  // ============================================
  getGlobalRanking = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const ranking = await this.gameHistoryService.getGlobalRanking(limit);

      res.status(200).json(
        ResponseFormatter.success('Global ranking retrieved successfully', ranking)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get ranking';
      res.status(500).json(
        ResponseFormatter.error(errorMessage, 'GET_RANKING_ERROR')
      );
    }
  };
}