const destinationEmail = process.argv[2];

if (!destinationEmail) {
  console.error("❌ Please provide your email address to receive the test email.");
  console.error("Usage: node send-test-email.js your.email@example.com");
  process.exit(1);
}

const RESEND_API_KEY = "re_LGCRVGcW_PTLox7qhHCzVy3n9pmJLyW4U";

// Note: Resend requires a verified domain. If 'neighborly.com' is not verified in your Resend dashboard,
// you must use the default test sender 'onboarding@resend.dev' which only allows sending to your own email.
const SENDER_EMAIL = "onboarding@resend.dev"; 

console.log(`Sending test email to: ${destinationEmail} via Resend...`);

fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: `Neighborly <${SENDER_EMAIL}>`,
    to: destinationEmail,
    subject: "🚨 Neighborly Email Test",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #208AEF;">It Works! 🎉</h1>
        <p>This is a test email sent from your command line to verify the Resend API integration.</p>
        <p>If you are reading this, your Resend API key is active!</p>
      </div>
    `
  }),
})
.then(async (response) => {
  const data = await response.json();
  if (response.ok) {
    console.log('✅ Email sent successfully!');
    console.log('Response ID:', data.id);
  } else {
    console.error('❌ Resend API Error:', data);
  }
})
.catch(error => {
  console.error('❌ Network Error:', error);
});
