import { Request, Response } from 'express';
import { AuthenticationService } from './authentication.service';
import { ResponseFormatter } from '../../shared/utils/response-formatter.utils';

export class AuthenticationController {
  private authService: AuthenticationService;

  constructor() {
    this.authService = new AuthenticationService();
  }

  // ============================================
  // REGISTRO
  // ============================================
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json(
        ResponseFormatter.success('User registered successfully', result)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json(
        ResponseFormatter.error(errorMessage, 'REGISTER_ERROR')
      );
    }
  };

  // ============================================
  // LOGIN
  // ============================================
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).json(
        ResponseFormatter.success('Login successful', result)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      res.status(401).json(
        ResponseFormatter.error(errorMessage, 'LOGIN_ERROR')
      );
    }
  };

  // ============================================
  // OBTENER PERFIL
  // ============================================
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(
          ResponseFormatter.error('User not authenticated', 'NOT_AUTHENTICATED')
        );
        return;
      }

      const profile = await this.authService.getProfile(req.user.userId);
      res.status(200).json(
        ResponseFormatter.success('Profile retrieved successfully', profile)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get profile';
      res.status(404).json(
        ResponseFormatter.error(errorMessage, 'PROFILE_ERROR')
      );
    }
  };

  // ============================================
  // VERIFICAR TOKEN
  // ============================================
  verifyToken = async (req: Request, res: Response): Promise<void> => {
    // Si llegamos aquí, el middleware ya validó el token
    res.status(200).json(
      ResponseFormatter.success('Token is valid', {
        user: req.user,
      })
    );
  };
}