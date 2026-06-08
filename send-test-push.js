const token = process.argv[2];

if (!token) {
  console.error("❌ Please provide your Expo Push Token as an argument.");
  console.error("Usage: node send-test-push.js ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]");
  process.exit(1);
}

console.log(`Sending test notification to: ${token}`);

fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Accept-encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: token,
    sound: 'default',
    title: '🚨 Neighborly Test Alert',
    body: 'This is a background notification test from the command line!',
    data: { 
      type: 'sos_alert', 
      postId: '12345' 
    },
    channelId: 'sos_alerts'
  }),
})
.then(response => response.json())
.then(data => {
  console.log('✅ Push sent successfully!');
  console.log('Response:', data);
})
.catch(error => {
  console.error('❌ Error sending push:', error);
});
