import http from 'http';
import app from './config/express-server.config';
import { ENV } from './config/environment.config';
import { initSocketIO } from './config/socketio-server.config';
import prisma from './config/prisma-client.config';

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    console.log('⏳ Retrying in 5 seconds...');
    setTimeout(connectDatabase, 5000);
  }
}

async function start() {
  try {
    console.log('🎮 Starting GameHub Server...\n');
    
    // Conectar a la base de datos
    await connectDatabase();

    // Crear servidor HTTP
    const server = http.createServer(app);
    
    // Inicializar Socket.IO con handlers
    initSocketIO(server);

    // Iniciar servidor
    server.listen(ENV.PORT, () => {
      console.log('\n========================================');
      console.log('🚀 GameHub Server is running!');
      console.log('========================================');
      console.log(`📍 HTTP Server: http://localhost:${ENV.PORT}`);
      console.log(`🔌 Socket.IO: ws://localhost:${ENV.PORT}`);
      console.log(`🗄️  Database: Connected`);
      console.log(`🌍 Environment: ${ENV.NODE_ENV}`);
      console.log(`⚙️  Min Bet: ${ENV.MIN_BET} | Max Bet: ${ENV.MAX_BET}`);
      console.log(`⏱️  Countdown: ${ENV.COUNTDOWN_SECONDS}s | Question Time: ${ENV.TIME_PER_QUESTION}s`);
      console.log('========================================\n');
    });

    // Manejo de errores del servidor
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${ENV.PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Fatal error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Received SIGINT. Shutting down gracefully...');
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Received SIGTERM. Shutting down gracefully...');
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await prisma.$disconnect();
  process.exit(1);
});

// Iniciar aplicación
start();