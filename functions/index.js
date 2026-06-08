const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

// Initialize Resend securely on the server
// Note: In production, replace the hardcoded key using Firebase Secrets Manager:
// firebase functions:secrets:set RESEND_API_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_LGCRVGcW_PTLox7qhHCzVy3n9pmJLyW4U";
const resend = new Resend(RESEND_API_KEY);

// Replace with "hello@neighborly.com" once your domain is verified on Resend.com
const SENDER_EMAIL = "onboarding@resend.dev"; 

exports.sendWelcomeEmail = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const user = snapshot.data();
  const email = user.email;
  const name = user.name || "Neighbor";

  // Check if email exists
  if (!email) return;

  // IMPORTANT: For testing without a verified domain, Resend ONLY allows sending to the email
  // address registered with the Resend account. Once domain is verified, this will work for any email.
  try {
    const data = await resend.emails.send({
      from: `Neighborly <${SENDER_EMAIL}>`,
      to: email,
      subject: "Welcome to Neighborly! 👋",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #208AEF;">Welcome to Neighborly, ${name}!</h1>
          <p>We are thrilled to have you in the community.</p>
          <p>Start exploring local discussions, offering help, and connecting with neighbors around you.</p>
          <br/>
          <a href="https://neighborly.app" style="background-color: #208AEF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Explore Your Neighborhood</a>
        </div>
      `
    });
    console.log("✅ Welcome email sent successfully:", data.id);
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
  }
});
