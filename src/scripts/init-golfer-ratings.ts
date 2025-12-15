import mongoose from 'mongoose';
import { Golfer } from '../models/Golfer.model';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function initGolferRatings() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado exitosamente\n');

    // Actualizar todos los golfers que no tienen rating
    const result = await Golfer.updateMany(
      { $or: [{ rating: { $exists: false } }, { totalRatings: { $exists: false } }] },
      { 
        $set: { 
          rating: 0,
          totalRatings: 0
        } 
      }
    );

    console.log(`✅ Actualizado: ${result.modifiedCount} golfistas con campos de rating`);
    
    // Verificar resultados
    const allGolfers = await Golfer.find().select('userId rating totalRatings');
    console.log(`\n📊 Total de golfistas: ${allGolfers.length}`);
    console.log('Todos los golfistas ahora tienen campos de rating inicializados\n');

    await mongoose.connection.close();
    console.log('Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initGolferRatings();
