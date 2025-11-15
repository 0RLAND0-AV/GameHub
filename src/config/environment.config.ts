import dotenv from 'dotenv';
import path from 'path';

const ENV_PATH = path.join(__dirname, '/../../.env');
dotenv.config({ path: ENV_PATH });

// 1. Define la interfaz/tipo para la configuración
interface EnvConfig {
    PORT: string | number;
    NODE_ENV: string;
    DATABASE_URL: string;
    
    MIN_BET: number;
    MAX_BET: number;
    COUNTDOWN_SECONDS: number;
    QUESTIONS_PER_GAME: number;
    TIME_PER_QUESTION: number;
    BASE_POINTS: number;
    SPEED_BONUS_MULTIPLIER: number;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    SALT_ROUNDS: number;
    INITIAL_COINS: number;
    
}

export const ENV:EnvConfig = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // JWT (básico por ahora, lo usaremos en fase 3)
  JWT_SECRET: process.env.JWT_SECRET || 'gamehub-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Bcrypt
  SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || '10'),
  
  // Game Configuration
  INITIAL_COINS: parseInt(process.env.INITIAL_COINS || '100'),
  MIN_BET: parseInt(process.env.MIN_BET || '10'),
  MAX_BET: parseInt(process.env.MAX_BET || '1000'),
  COUNTDOWN_SECONDS: parseInt(process.env.COUNTDOWN_SECONDS || '30'),
  QUESTIONS_PER_GAME: parseInt(process.env.QUESTIONS_PER_GAME || '10'),
  TIME_PER_QUESTION: parseInt(process.env.TIME_PER_QUESTION || '15'),
  
  // Points calculation
  BASE_POINTS: parseInt(process.env.BASE_POINTS || '10'),
  SPEED_BONUS_MULTIPLIER: parseInt(process.env.SPEED_BONUS_MULTIPLIER || '2'),
};