// Archivo separado para inicializar y exportar el servidor HTTP y socket.io
import app from './app';
import { config } from './config/environment';
import { connectDatabase } from './config/database';
import { createServer } from 'http';

const PORT = config.port;

const startServer = async () => {
  try {
    await connectDatabase();
    const server = createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Servidor CadiApp corriendo`);
      console.log(`📍 Puerto: ${PORT}`);
      console.log(`🌍 Ambiente: ${config.nodeEnv}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health\n`);
    });
    // Exportar el server para usarlo en socket.io
    return server;
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

export default startServer;
