import { Router } from 'express';
import { PlayerTransactionsController } from './player-transactions.controller';
import { authenticateToken } from '../../middleware/authentication.middleware';

const router = Router();
const controller = new PlayerTransactionsController();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener historial de transacciones
router.get('/my-transactions', controller.getMyTransactions);

// Obtener resumen de transacciones
router.get('/my-summary', controller.getMyTransactionSummary);

// Obtener balance actual
router.get('/my-balance', controller.getMyBalance);

// Verificar si tiene fondos suficientes
router.get('/check-funds', controller.checkFunds);

export default router;