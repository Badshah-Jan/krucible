const admin = require('firebase-admin');

try {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  console.log("No service account found, using default");
  admin.initializeApp();
}

const db = admin.firestore();
const uid = "ApGRpxSstpOGnDqw0n4JeoIi0Yl2"; // From previous log

async function testToggleAndSend() {
  console.log("🔍 Checking user preferences in database...");
  
  const docSnap = await db.collection("users").doc(uid).get();
  if (!docSnap.exists) {
    console.log("❌ User not found!");
    process.exit(1);
  }

  const data = docSnap.data();
  const prefs = data.notificationPreferences || {};
  
  console.log(`\nCurrent Settings:`);
  console.log(`- Master Push Enabled: ${prefs.pushEnabled !== false}`);
  console.log(`- SOS Alerts Enabled: ${prefs.sos !== false}`);
  console.log(`- Stored Tokens: ${data.fcmTokens ? data.fcmTokens.length : 0}\n`);

  if (prefs.pushEnabled === false || prefs.sos === false) {
    console.log("🛡️ BLOCKING SEND: Your database toggle successfully blocked this notification from sending!");
    process.exit(0);
  }

  let tokens = [];
  if (Array.isArray(data.fcmTokens)) tokens = [...data.fcmTokens];
  if (tokens.length === 0 && data.fcmToken) tokens.push(data.fcmToken);

  if (tokens.length === 0) {
    console.log("🛡️ BLOCKING SEND: You have no active push tokens registered (likely unregistered by the toggle).");
    process.exit(0);
  }

  console.log(`✅ Toggles are ON. Sending notification to: ${tokens[0]}`);

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tokens[0],
        sound: 'sos_alert.wav',
        title: '🚨 Emergency SOS',
        body: 'Toggle Test: If you see this, your toggle is ON!',
        channelId: 'sos_alerts'
      }),
    });
    const result = await response.json();
    console.log(`\n✅ Push sent successfully! ID: ${result.data?.id}`);
  } catch (e) {
    console.error("❌ Failed:", e);
  }
  
  process.exit(0);
}

testToggleAndSend();
