// src/config/express-server.config.ts
import express, { Application } from 'express';
import cors from 'cors';
import AppRoutes from './application-routes.config';
import { errorHandler } from '../middleware/error-handler.middleware';
import { ENV } from './environment.config';

const app: Application = express();

// Configurar CORS según entorno
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.CORS_ORIGIN?.split(',') || ['*'])  // En producción: URLs específicas
    : '*',  // En desarrollo: permitir todo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check simple en root
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'GameHub API is running',
    version: '1.0.0',
    status: 'healthy',
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api', AppRoutes);

// Error handler (debe ir al final)
app.use(errorHandler);

export default app;