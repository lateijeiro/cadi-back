/**
 * Script para crear documentos Golfer faltantes
 * 
 * Este script encuentra todos los usuarios con rol 'golfer' que no tienen
 * un documento correspondiente en la colección 'golfers' y los crea.
 * 
 * Uso: node fix-missing-golfers.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lucasteijeiro:QBGTWwHRdGz5Z47q@cadiappcluster.dllvk.mongodb.net/cadiapp?retryWrites=true&w=majority&appName=CadiAppCluster';

async function fixMissingGolfers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');
    const golfersCollection = db.collection('golfers');

    // Encontrar todos los usuarios con rol golfer
    const golferUsers = await usersCollection.find({ role: 'golfer' }).toArray();
    console.log(`📊 Encontrados ${golferUsers.length} usuarios con rol golfer`);

    let created = 0;
    let alreadyExists = 0;

    for (const user of golferUsers) {
      // Verificar si ya existe un documento golfer para este usuario
      const existingGolfer = await golfersCollection.findOne({ userId: user._id });

      if (!existingGolfer) {
        // Crear documento golfer
        await golfersCollection.insertOne({
          userId: user._id,
          homeClub: null,
          handicap: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
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
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Conexión cerrada');
  }
}

// Ejecutar el script
fixMissingGolfers();
