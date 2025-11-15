import { Router } from 'express';
import { HealthCheckController } from './healthCheck.controller';

const router = Router();
const controller = new HealthCheckController();

router.get('/', controller.checkHealth);
router.get('/db', controller.checkDatabase);

export default router;