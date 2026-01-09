// src/socketServer.ts
import { Server as SocketIOServer } from 'socket.io';
import startServer from './initServer';
import { authenticateSocket, AuthenticatedSocket } from './utils/socketAuth';

export type SocketContext = {
  io: SocketIOServer;
};

export async function startSocketServer(): Promise<SocketContext | null> {
  const httpServer = await startServer();
  if (!httpServer) return null;

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Ajustar en producción
      methods: ['GET', 'POST'],
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('[SOCKET][DEBUG] handshake.headers:', socket.handshake.headers);
    console.log('[SOCKET][DEBUG] handshake.auth:', socket.handshake.auth);

    if (!socket.user) {
      console.log('[SOCKET][ERROR] No user en socket, desconectando.');
      socket.disconnect();
      return;
    }

    socket.join(`user:${socket.user.id}`);
    console.log(
      `🔌 Usuario conectado: ${socket.user.id} (${socket.user.role}) [socket: ${socket.id}]`
    );

    socket.on('disconnect', () => {
      console.log(`❌ Usuario desconectado: ${socket.user?.id} [socket: ${socket.id}]`);
    });
  });

  // Si querés mantener global (MVP), ok:
  (global as any).io = io;

  return { io };
}
