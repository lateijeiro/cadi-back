/**
 * Script para crear documentos Golfer faltantes
 * 
 * Este script encuentra todos los usuarios con rol 'golfer' que no tienen
 * un documento correspondiente en la colección 'golfers' y los crea.
 * 
 * Uso: npm run fix-golfers
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';
import { Golfer, IGolfer } from '../models/Golfer.model';
import { UserRole } from '../types/enums';

// Cargar variables de entorno
dotenv.config();

async function fixMissingGolfers() {
  try {
    // Conectar a la base de datos
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI no está configurado');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Encontrar todos los usuarios con rol golfer
    const golferUsers = await User.find({ role: UserRole.GOLFER });
    console.log(`📊 Encontrados ${golferUsers.length} usuarios con rol golfer`);

    let created = 0;
    let alreadyExists = 0;

    for (const user of golferUsers) {
      // Verificar si ya existe un documento golfer para este usuario
      const existingGolfer = await Golfer.findOne({ userId: user._id });

      if (!existingGolfer) {
        // Crear documento golfer
        const newGolfer: Partial<IGolfer> = {
          userId: user._id as any,
        };
        await Golfer.create(newGolfer);
        console.log(`✅ Creado documento golfer para: ${user.email}`);
        created++;
      } else {
        alreadyExists++;
      }
    }

    console.log('\n📈 Resumen:');
    console.log(`   - Documentos creados: ${created}`);
    console.log(`   - Ya existían: ${alreadyExists}`);
    console.log(`   - Total procesados: ${golferUsers.length}`);

    if (created > 0) {
      console.log('\n✅ ¡Documentos golfer creados exitosamente!');
    } else {
      console.log('\n✅ Todos los usuarios golfer ya tenían sus documentos');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar el script
fixMissingGolfers();
