import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../modules/users/interfaces/user.interface';

export function authorizeRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        ok: false,
        message: 'Authentication required',
        error: {
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        ok: false,
        message: 'Access denied',
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}