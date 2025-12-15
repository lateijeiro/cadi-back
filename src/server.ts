import app from './app';
import { config } from './config/environment';
import { connectDatabase } from './config/database';

const PORT = config.port;

const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDatabase();
    
    // Iniciar servidor en todas las interfaces (0.0.0.0)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Servidor CadiApp corriendo`);
      console.log(`📍 Puerto: ${PORT}`);
      console.log(`🌍 Ambiente: ${config.nodeEnv}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

startServer();
