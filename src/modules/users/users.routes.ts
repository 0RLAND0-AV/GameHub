// src/modules/users/users.routes.ts
import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticateToken } from '../../middleware/authentication.middleware';
import { isAdmin } from '../../middleware/admin.middleware';

const router = Router();
const usersController = new UsersController();

// ============================================
// RUTA DE ADMIN - Listar todos los usuarios
// ============================================
// Requiere estar autenticado Y ser ADMIN
router.get(
  '/',
  authenticateToken,
  isAdmin,
  usersController.getAllUsers
);

export default router;