// src/initServer.ts
import app from './app';
import { config } from './config/environment';
import { createServer } from 'http';

export default async function startServer() {
  const port = Number(process.env.PORT) || Number(config.port) || 4000;

  const server = createServer(app);

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor CadiApp corriendo`);
    console.log(`📍 Puerto: ${port}`);
    console.log(`🌍 Ambiente: ${config.nodeEnv}`);
    console.log(`✅ Health check: http://localhost:${port}/api/health\n`);
  });

  return server;
}
