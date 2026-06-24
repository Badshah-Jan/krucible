const token = process.argv[2] || "ExponentPushToken[yhPn-HIguTHMGfYiFCpgqI]";

const tests = [
  {
    title: '🚨 Emergency SOS',
    body: 'Someone nearby needs immediate assistance!',
    channelId: 'sos_alerts',
    sound: 'sos_alert.wav'
  },
  {
    title: '💬 New Message',
    body: 'Hey, are you available to help with groceries?',
    channelId: 'messages',
    sound: 'message.wav'
  },
  {
    title: '🤝 Help Request',
    body: 'Your neighbor asked for help with moving a couch.',
    channelId: 'help_requests',
    sound: 'need_help.wav'
  },
  {
    title: '⭐ New Recommendation',
    body: 'A neighbor just recommended a new local cafe.',
    channelId: 'recommendations',
    sound: 'recommend.wav'
  },
  {
    title: '🛠️ Service Update',
    body: 'Your booking has been confirmed by the provider.',
    channelId: 'service_updates',
    sound: 'service.wav'
  },
  {
    title: '🏘️ Community Post',
    body: 'A new general discussion was posted in your area.',
    channelId: 'community',
    sound: 'default'
  }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log(`Starting notification barrage for: ${token}\n`);

  for (const test of tests) {
    console.log(`Sending: ${test.title}...`);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: test.sound,
          title: test.title,
          body: test.body,
          channelId: test.channelId,
          data: { test: true }
        }),
      });
      const data = await response.json();
      console.log(`✅ Success! ID: ${data.data?.id || 'unknown'}\n`);
    } catch (e) {
      console.error(`❌ Failed:`, e.message);
    }
    
    // Wait 3 seconds between pushes so they don't overwrite each other too fast
    await sleep(3000);
  }
  
  console.log('🎉 All test notifications sent!');
}

runTests();
