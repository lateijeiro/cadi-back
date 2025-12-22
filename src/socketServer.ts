// Inicialización de socket.io y arranque del servidor principal

import { Server as SocketIOServer } from 'socket.io';
import startServer from './initServer';
import { authenticateSocket, AuthenticatedSocket } from './utils/socketAuth';

const run = async () => {
  const httpServer = await startServer();
  if (!httpServer) return;

  // Inicializar socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Ajustar en producción
      methods: ['GET', 'POST'],
    },
  });


  // Middleware de autenticación para cada conexión
  io.use(authenticateSocket);

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('[SOCKET][DEBUG] handshake.headers:', socket.handshake.headers);
    console.log('[SOCKET][DEBUG] handshake.auth:', socket.handshake.auth);
    if (!socket.user) {
      console.log('[SOCKET][ERROR] No user en socket, desconectando.');
      socket.disconnect();
      return;
    }
    // Suscribir a una sala única por usuario
    socket.join(`user:${socket.user.id}`);
    console.log(`🔌 Usuario conectado: ${socket.user.id} (${socket.user.role}) [socket: ${socket.id}]`);
    // Aquí se implementarán listeners personalizados por usuario
    socket.on('disconnect', () => {
      console.log(`❌ Usuario desconectado: ${socket.user?.id} [socket: ${socket.id}]`);
    });
  });

  // Exportar io para usar en otros módulos
  (global as any).io = io;
};

run();
