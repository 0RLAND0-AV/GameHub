// src\middleware\authentication.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { JWTUtility } from '../shared/utils/jwt-token.utils';
import { UserSession } from '../modules/authentication/interfaces/authentication.interface';

// Extender Request de Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers['authorization'];
    const token = JWTUtility.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        ok: false,
        message: 'Authentication required',
        error: {
          message: 'No token provided',
          code: 'NO_TOKEN',
        },
      });
      return;
    }

    const decoded = JWTUtility.verifyToken(token);
    
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
    res.status(401).json({
      ok: false,
      message: 'Invalid or expired token',
      error: {
        message: errorMessage,
        code: 'INVALID_TOKEN',
      },
    });
  }
}

// Middleware opcional: permite pasar sin token pero lo valida si existe
export function optionalAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers['authorization'];
    const token = JWTUtility.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = JWTUtility.verifyToken(token);
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Si hay error en el token, simplemente continuamos sin usuario
    next();
  }
}