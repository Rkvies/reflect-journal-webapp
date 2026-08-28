const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-applet-config.json');

initializeApp({
  projectId: serviceAccount.projectId
});

const db = getFirestore();

async function run() {
  const snapshot = await db.collectionGroup('insights').limit(5).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
run();
