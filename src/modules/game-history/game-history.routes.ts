import { Router } from 'express';
import { GameHistoryController } from './game-history.controller';
import { authenticateToken, optionalAuthentication } from '../../middleware/authentication.middleware';

const router = Router();
const controller = new GameHistoryController();

// Rutas protegidas
router.get('/my-history', authenticateToken, controller.getMyHistory);
router.get('/my-stats', authenticateToken, controller.getMyStats);

// Ruta pública (ranking global)
router.get('/global-ranking', optionalAuthentication, controller.getGlobalRanking);

export default router;