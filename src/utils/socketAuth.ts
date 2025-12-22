import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: string;
  };
}

export function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
  if (!token) {
    return next(new Error('No token provided'));
  }
  let realToken = token;
  if (typeof token === 'string' && token.startsWith('Bearer ')) {
    realToken = token.replace('Bearer ', '');
  }
  jwt.verify(realToken, config.jwt.secret, (err: Error | null, decoded: any) => {
    if (err) {
      return next(new Error('Invalid token'));
    }
    (socket as AuthenticatedSocket).user = {
      id: decoded.userId, // Corregido: usar userId del JWT
      role: decoded.role,
    };
    next();
  });
}
