import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { ENV } from '../../config/environment.config';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
const SECRET_KEY: Secret = ENV.JWT_SECRET;
export class JWTUtility {
    
  
  // ============================================
  // GENERAR TOKEN
  // ============================================
static generateToken(payload: JWTPayload): string {
  const options: SignOptions = {
    expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'], // '7d' es un string válido para SignOptions
  };
  return jwt.sign(payload, SECRET_KEY, options);
}

  // ============================================
  // VERIFICAR TOKEN
  // ============================================
  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  // ============================================
  // DECODIFICAR TOKEN SIN VERIFICAR
  // ============================================
  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // ============================================
  // EXTRAER TOKEN DEL HEADER
  // ============================================
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}