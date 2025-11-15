import { Router } from 'express';
import healthCheckRouter from '../modules/healthCheck/healthCheck.routes';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to GameHub API',
    ok: true,
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'Socket.IO available on same port',
    ],
  });
});

// Rutas de módulos
router.use('/health', healthCheckRouter);

// Ruta 404
router.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    ok: false,
    path: req.path,
  });
});

export default router;