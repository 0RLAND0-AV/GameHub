import { Router } from 'express';
import { AuthenticationController } from './authentication.controller';
import { validateBody } from '../../middleware/request-validation.middleware';
import { authenticateToken } from '../../middleware/authentication.middleware';
import { RegisterSchema } from './schemas/register.schema';
import { LoginSchema } from './schemas/login.schema';

const router = Router();
const controller = new AuthenticationController();

// Rutas públicas
router.post('/register', validateBody(RegisterSchema), controller.register);
router.post('/login', validateBody(LoginSchema), controller.login);

// Rutas protegidas
router.get('/profile', authenticateToken, controller.getProfile);
router.get('/verify', authenticateToken, controller.verifyToken);

export default router;