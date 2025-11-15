import express, { Application } from 'express';
import cors from 'cors';
import AppRoutes from './application-routes.config';
import { errorHandler } from '../middleware/error-handler.middleware';

const app: Application = express();

// Middlewares
app.use(cors({
  origin: '*', // En producción: especificar dominios permitidos
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check simple
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'GameHub API is running',
    version: '1.0.0',
    status: 'healthy',
  });
});

// Routes
app.use('/api', AppRoutes);

// Error handler (debe ir al final)
app.use(errorHandler);

export default app;