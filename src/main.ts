import Server from './config/server.config'
import { ENV } from './config/env.config';
import { initSocketIO } from './config/socketio.config';


//funcion para reintentar conectar a BD
// async function connectWithRetry() {
//   try {
//     await prisma.authenticate();
//     console.info('Database connected');
//   } catch (error) {
//     console.error('Unable to connect to the database:', error);
//     setTimeout(connectWithRetry, 5000);
//   }
// }
async function start() {
    try {
        // await connectWithRetry()
        initSocketIO();
        // Servidor Express (escucha en puerto 3000)
        Server.listen(ENV.PORT, () => {
            console.log(`Server is running on http://localhost:${ENV.PORT}`)
        });

    } catch (error) {
        console.error('Error starting the server:', error);
    }
}

start();