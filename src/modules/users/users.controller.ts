// src/modules/users/users.controller.ts
import { Request, Response } from 'express';
import { UsersService } from './users.service';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  // ============================================
  // LISTAR TODOS LOS USUARIOS (Solo Admin)
  // ============================================
  getAllUsers = async (req: Request, res: Response) => {
    try {
      // Obtener parámetros de paginación
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validar parámetros
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          message: 'Invalid pagination parameters',
          ok: false,
        });
      }

      // Obtener usuarios
      const result = await this.usersService.listUsers(page, limit);

      return res.status(200).json({
        message: 'Users retrieved successfully',
        ok: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting users:', error);
      return res.status(500).json({
        message: 'Error retrieving users',
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}