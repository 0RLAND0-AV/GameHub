import { Request, Response } from 'express';

export class HealthCheckController {
  async checkHealth(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      ok: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  }

  async checkDatabase(req: Request, res: Response): Promise<void> {
    // Por ahora retornamos simulado, en FASE 4 conectaremos Prisma
    res.status(200).json({
      ok: true,
      message: 'Database connection healthy (simulated)',
      timestamp: new Date().toISOString(),
    });
  }
}