const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setSingleAdmin() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  let batch = db.batch();
  let adminCount = 0;
  let demotedCount = 0;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.email === 'badshahkha656@gmail.com') {
      batch.update(doc.ref, { role: 'admin' });
      adminCount++;
      batchCount++;
    } else if (data.role === 'admin' || data.role === 'moderator' || data.role === 'superadmin') {
      batch.update(doc.ref, { role: 'user' });
      demotedCount++;
      batchCount++;
    }

    if (batchCount === 500) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`Successfully set ${adminCount} admin(s) and demoted ${demotedCount} others.`);
}

setSingleAdmin().catch(console.error).finally(() => process.exit(0));
