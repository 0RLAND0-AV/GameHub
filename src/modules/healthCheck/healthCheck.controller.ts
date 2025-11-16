// src/modules/healthCheck/healthCheck.controller.ts
import { Request, Response } from 'express';
import prisma from '../../config/prisma-client.config';

export class HealthCheckController {
  /**
   * Health Check principal - Render usa este endpoint
   * GET /api/health
   */
  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      // Verificar conexión a BD
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        ok: true,
        status: 'healthy',
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        database: 'connected',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      });
    } catch (error) {
      console.error('Health check failed:', error);
      
      res.status(503).json({
        ok: false,
        status: 'unhealthy',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      });
    }
  }

  /**
   * Database Check específico
   * GET /api/health/db
   */
  async checkDatabase(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      res.status(200).json({
        ok: true,
        message: 'Database connection healthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      console.error('Database check failed:', error);
      
      res.status(503).json({
        ok: false,
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      });
    }
  }
}