import fs from 'fs';
import admin from 'firebase-admin';

const collections = ['users', 'applications', 'scoring_evaluations', 'config'];

async function run() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command !== 'export' && command !== 'import') {
    console.error('Uso incorrecto. Comandos disponibles:');
    console.error('  node migrate-database.js export <source-key.json> <output.json> [databaseId]');
    console.error('  node migrate-database.js import <target-key.json> <input.json> [databaseId]');
    process.exit(1);
  }

  const keyPath = args[1];
  const filePath = args[2];
  const databaseId = args[3];

  if (!keyPath || !filePath) {
    console.error('Error: Faltan argumentos.');
    console.error(`Uso: node migrate-database.js ${command} <archivo-credenciales.json> <archivo-datos.json> [databaseId]`);
    process.exit(1);
  }

  // Leer clave de cuenta de servicio o usar ADC
  let app;
  let serviceAccount = null;
  if (keyPath === 'adc' || keyPath === 'default') {
    console.log('Utilizando credenciales por defecto de la aplicación (ADC)...');
    app = admin.initializeApp();
  } else {
    if (!fs.existsSync(keyPath)) {
      console.error(`Error: El archivo de credenciales no existe en: ${keyPath}`);
      process.exit(1);
    }
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  let db;
  if (databaseId) {
    console.log(`Conectando a la base de datos específica: ${databaseId}`);
    db = admin.getFirestore ? admin.getFirestore(app, databaseId) : app.firestore(databaseId);
  } else {
    console.log(`Conectando a la base de datos por defecto (default)`);
    db = admin.getFirestore ? admin.getFirestore(app) : app.firestore();
  }

  if (command === 'export') {
    const projectId = serviceAccount ? serviceAccount.project_id : 'prestamos-mujeres2000';
    console.log(`Iniciando exportación desde el proyecto: ${projectId}...`);
    const backupData = {};

    for (const colName of collections) {
      console.log(`Exportando colección: ${colName}...`);
      const snapshot = await db.collection(colName).get();
      backupData[colName] = [];
      
      snapshot.forEach(doc => {
        backupData[colName].push({
          id: doc.id,
          data: doc.data()
        });
      });
      console.log(`- Colección ${colName} exportada con éxito (${backupData[colName].length} documentos).`);
    }

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`\n¡Éxito! Base de datos guardada localmente en: ${filePath}`);
    console.log(`Ya puedes usar este archivo para importarlo en tu nuevo proyecto.`);
  } else if (command === 'import') {
    if (!fs.existsSync(filePath)) {
      console.error(`Error: El archivo de datos no existe en: ${filePath}`);
      process.exit(1);
    }

    const projectId = serviceAccount ? serviceAccount.project_id : 'prestamos-mujeres2000';
    console.log(`Iniciando importación al proyecto: ${projectId}...`);
    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const colName of collections) {
      const docs = backupData[colName];
      if (!docs || docs.length === 0) {
        console.log(`Colección ${colName} vacía o no encontrada en el respaldo. Saltando...`);
        continue;
      }

      console.log(`Importando colección: ${colName} (${docs.length} documentos)...`);
      const batchLimit = 500;
      let batch = db.batch();
      let count = 0;

      for (const docInfo of docs) {
        const docRef = db.collection(colName).doc(docInfo.id);
        batch.set(docRef, docInfo.data);
        count++;

        if (count % batchLimit === 0) {
          await batch.commit();
          batch = db.batch();
          console.log(`- Guardados ${count} documentos...`);
        }
      }

      if (count % batchLimit !== 0) {
        await batch.commit();
      }
      console.log(`- ¡Colección ${colName} importada con éxito!`);
    }

    console.log(`\n¡Éxito absoluto! Se completó la importación en el proyecto: ${projectId}`);
  }
}

run().catch(err => {
  console.error('Ocurrió un error inesperado durante la ejecución:', err);
  process.exit(1);
});
