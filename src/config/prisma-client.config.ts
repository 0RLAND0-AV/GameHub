import { PrismaClient } from '@prisma/client';

// Prisma no necesita NODE_ENV como Sequelize
// Simplemente configuramos logging según necesidad
const prisma = new PrismaClient({
  log: ['error', 'warn'], // En producción solo errores/warnings
  // log: ['query', 'info', 'warn', 'error'], // Descomentar para debug
});

export default prisma;