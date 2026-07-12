import fs from 'fs';
import admin from 'firebase-admin';

const collections = ['users', 'applications', 'scoring_evaluations'];

async function run() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command !== 'export' && command !== 'import') {
    console.error('Uso incorrecto. Comandos disponibles:');
    console.error('  node migrate-database.js export <source-key.json> <output.json>');
    console.error('  node migrate-database.js import <target-key.json> <input.json>');
    process.exit(1);
  }

  const keyPath = args[1];
  const filePath = args[2];

  if (!keyPath || !filePath) {
    console.error('Error: Faltan argumentos.');
    console.error(`Uso: node migrate-database.js ${command} <archivo-credenciales.json> <archivo-datos.json>`);
    process.exit(1);
  }

  if (!fs.existsSync(keyPath)) {
    console.error(`Error: El archivo de credenciales no existe en: ${keyPath}`);
    process.exit(1);
  }

  // Leer clave de cuenta de servicio
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  // Inicializar Firebase Admin
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const db = app.firestore();

  if (command === 'export') {
    console.log(`Iniciando exportación desde el proyecto: ${serviceAccount.project_id}...`);
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

    console.log(`Iniciando importación al proyecto: ${serviceAccount.project_id}...`);
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

    console.log(`\n¡Éxito absoluto! Se completó la importación en el proyecto: ${serviceAccount.project_id}`);
  }
}

run().catch(err => {
  console.error('Ocurrió un error inesperado durante la ejecución:', err);
  process.exit(1);
});
