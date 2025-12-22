import app from './app';
import { config } from './config/environment';
import { connectDatabase } from './config/database';

const PORT = config.port;


// El servidor ahora se inicializa desde socketServer.ts
// No hacer app.listen aquí para evitar conflicto de puertos
// Solo importar socketServer para levantar todo
import './socketServer';

// Inicializar servidor de sockets
import './socketServer';
