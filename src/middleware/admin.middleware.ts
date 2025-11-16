// src/shared/middlewares/admin.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../modules/users/interfaces/user.interface';

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    // El usuario ya fue validado por el authMiddleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: 'Authentication required',
        ok: false,
      });
    }

    // Verificar si es ADMIN
    if (user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        message: 'Access denied. Admin privileges required',
        ok: false,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: 'Error verifying admin privileges',
      ok: false,
    });
  }
};