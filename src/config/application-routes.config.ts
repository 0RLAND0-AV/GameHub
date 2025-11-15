import { Router } from 'express';
import healthCheckRouter from '../modules/healthCheck/healthCheck.routes';
import authRouter from '../modules/authentication/authentication.routes';
import transactionsRouter from '../modules/player-transactions/player-transactions.routes';
import gameHistoryRouter from '../modules/game-history/game-history.routes'; //  NUEVO

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to GameHub API',
    ok: true,
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'POST /api/auth/register - Register new user',
      'POST /api/auth/login - Login user',
      'GET /api/auth/profile - Get user profile (protected)',
      'GET /api/auth/verify - Verify JWT token (protected)',
      'GET /api/transactions/my-transactions - Get transaction history (protected)',
      'GET /api/transactions/my-summary - Get transaction summary (protected)',
      'GET /api/transactions/my-balance - Get current balance (protected)',
      'GET /api/transactions/check-funds?amount=50 - Check if has enough funds (protected)',
      'GET /api/game-history/my-history - Get game history (protected)',
      'GET /api/game-history/my-stats - Get game stats (protected)',
      'GET /api/game-history/global-ranking?limit=10 - Get global ranking (public)',
      'Socket.IO available on same port',
    ],
  });
});

// Rutas de módulos
router.use('/health', healthCheckRouter);
router.use('/auth', authRouter);
router.use('/transactions', transactionsRouter);
router.use('/game-history', gameHistoryRouter); //  NUEVO

// Ruta 404
router.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    ok: false,
    path: req.path,
  });
});

export default router;