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
    
    // Prize Distribution
    PRIZE_2P_FIRST: number;
    PRIZE_2P_SECOND: number;
    
    PRIZE_3P_FIRST: number;
    PRIZE_3P_SECOND: number;
    PRIZE_3P_THIRD: number;
    
    PRIZE_4P_FIRST: number;
    PRIZE_4P_SECOND: number;
    PRIZE_4P_THIRD: number;
    PRIZE_4P_FOURTH: number;
    
    PRIZE_5P_FIRST: number;
    PRIZE_5P_SECOND: number;
    PRIZE_5P_THIRD: number;
    PRIZE_5P_FOURTH: number;
    PRIZE_5P_FIFTH: number;
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
  
  // Prize Distribution - 2 Players
  PRIZE_2P_FIRST: parseFloat(process.env.PRIZE_2P_FIRST || '0.80'),
  PRIZE_2P_SECOND: parseFloat(process.env.PRIZE_2P_SECOND || '0.20'),
  
  // Prize Distribution - 3 Players
  PRIZE_3P_FIRST: parseFloat(process.env.PRIZE_3P_FIRST || '0.60'),
  PRIZE_3P_SECOND: parseFloat(process.env.PRIZE_3P_SECOND || '0.30'),
  PRIZE_3P_THIRD: parseFloat(process.env.PRIZE_3P_THIRD || '0.10'),
  
  // Prize Distribution - 4 Players
  PRIZE_4P_FIRST: parseFloat(process.env.PRIZE_4P_FIRST || '0.50'),
  PRIZE_4P_SECOND: parseFloat(process.env.PRIZE_4P_SECOND || '0.30'),
  PRIZE_4P_THIRD: parseFloat(process.env.PRIZE_4P_THIRD || '0.20'),
  PRIZE_4P_FOURTH: parseFloat(process.env.PRIZE_4P_FOURTH || '0.00'),
  
  // Prize Distribution - 5 Players
  PRIZE_5P_FIRST: parseFloat(process.env.PRIZE_5P_FIRST || '0.40'),
  PRIZE_5P_SECOND: parseFloat(process.env.PRIZE_5P_SECOND || '0.30'),
  PRIZE_5P_THIRD: parseFloat(process.env.PRIZE_5P_THIRD || '0.20'),
  PRIZE_5P_FOURTH: parseFloat(process.env.PRIZE_5P_FOURTH || '0.10'),
  PRIZE_5P_FIFTH: parseFloat(process.env.PRIZE_5P_FIFTH || '0.00'),
};