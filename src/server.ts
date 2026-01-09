// src/server.ts
import { connectDatabase } from './config/database';
import { config } from './config/environment';
import { startSocketServer } from './socketServer';

async function bootstrap() {
  await connectDatabase();

  // Render inyecta PORT. Local puede usar config.port.
  process.env.PORT = process.env.PORT || String(config.port || 3000);

  const ctx = await startSocketServer();
  if (!ctx) {
    throw new Error('No se pudo iniciar el servidor HTTP/Socket');
  }

  console.log(`[BOOT] Server started. PORT=${process.env.PORT}`);
}

bootstrap().catch((err) => {
  console.error('[BOOT] Fatal error:', err);
  process.exit(1);
});
