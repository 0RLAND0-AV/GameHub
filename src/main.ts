import http from 'http';
import app from './config/express-server.config';
import { ENV } from './config/environment.config';
import { initSocketIO } from './config/socketio-server.config';

async function start() {
  try {
    console.log('🎮 Starting GameHub Server...');
    
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
process.on('SIGINT', () => {
  console.log('\n\n🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Iniciar aplicación
start();