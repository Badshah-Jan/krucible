import { UserService } from "./userService";

// WARNING: In a production environment, this service MUST be moved to a secure Node.js backend
// or Firebase Cloud Functions to protect the RESEND_API_KEY. Calling Resend directly from the client
// exposes the API key to potential abuse. This implementation serves as a prototype/wrapper.

// SECURE: The actual API key is now safely stored in Firebase Cloud Functions (see functions/index.js)
const RESEND_API_KEY = "MOVED_TO_CLOUD_FUNCTIONS";
const SENDER_EMAIL = "hello@neighborly.com"; // Replace with your verified Resend domain

export type EmailType = 
  | 'welcome' 
  | 'sos_alert' 
  | 'new_message' 
  | 'security_alert' 
  | 'account_deleted' 
  | 'weekly_digest';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  /**
   * Core function to send emails via Resend API with built-in retry logic.
   */
  private static async sendWithRetry(payload: EmailPayload, retries = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `Neighborly <${SENDER_EMAIL}>`,
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[EmailService] Email sent successfully on attempt ${attempt}:`, data.id);
          return true;
        }

        const errorData = await response.json();
        console.warn(`[EmailService] Resend API error on attempt ${attempt}:`, errorData);

        // If it's a 4xx error (e.g. invalid email), retrying won't help
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return false;
        }
      } catch (error) {
        console.error(`[EmailService] Network error on attempt ${attempt}:`, error);
      }

      // Exponential backoff before retrying
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((res) => setTimeout(res, delay));
      }
    }
    
    console.error("[EmailService] All retry attempts failed.");
    return false;
  }

  /**
   * Checks if the user is eligible to receive this specific type of email.
   */
  private static async shouldSendEmail(uid: string, type: EmailType): Promise<{ allowed: boolean, email?: string }> {
    try {
      const user = await UserService.getOwnProfile(uid);
      if (!user || !user.email) return { allowed: false };

      const prefs = user.notificationPreferences;
      
      // Global email kill switch
      if (prefs && prefs.emailAlerts === false) {
        return { allowed: false };
      }

      // Specific granular checks
      switch (type) {
        case 'sos_alert':
          if (prefs && prefs.sos === false) return { allowed: false };
          break;
        case 'new_message':
          if (prefs && prefs.messages === false) return { allowed: false };
          break;
        case 'weekly_digest':
          if (prefs && prefs.community === false) return { allowed: false };
          break;
        // Security, account deletion, and welcome emails cannot be opted out of
        case 'welcome':
        case 'security_alert':
        case 'account_deleted':
          break;
        default:
          return { allowed: false };
      }

      return { allowed: true, email: user.email };
    } catch (error) {
      console.error("[EmailService] Error checking preferences:", error);
      return { allowed: false };
    }
  }

  // ─── Email Templates & Triggers ─────────────────────────────────────────────

  static async sendWelcomeEmail(uid: string, name: string): Promise<void> {
    const check = await this.shouldSendEmail(uid, 'welcome');
    if (!check.allowed || !check.email) return;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Welcome to Neighborly, ${name}! 👋</h1>
        <p>We are thrilled to have you in the community.</p>
        <p>Neighborly is a place to connect, help, and share with the people around you. Start by exploring the local marketplace, offering a service, or just saying hi in the community feed.</p>
        <br/>
        <a href="https://neighborly.app" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Explore Your Neighborhood</a>
        <br/><br/>
        <p style="color: #6B7280; font-size: 12px;">You're receiving this because you just signed up for Neighborly.</p>
      </div>
    `;

    await this.sendWithRetry({
      to: check.email,
      subject: "Welcome to Neighborly",
      html,
    });
  }

  static async sendSOSAlert(uid: string, locationName: string, distance: string): Promise<void> {
    const check = await this.shouldSendEmail(uid, 'sos_alert');
    if (!check.allowed || !check.email) return;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; border-top: 4px solid #EF4444;">
        <h1 style="color: #EF4444;">🚨 Emergency Alert Near You</h1>
        <p>A neighbor just triggered an SOS alert <strong>${distance}</strong> away in <strong>${locationName}</strong>.</p>
        <p>If you are nearby and able to assist safely, please check the app for more details.</p>
        <br/>
        <a href="https://neighborly.app/sos" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View SOS Details</a>
      </div>
    `;

    await this.sendWithRetry({
      to: check.email,
      subject: "Emergency Alert Near You",
      html,
    });
  }

  static async sendNewMessageAlert(uid: string, senderName: string): Promise<void> {
    const check = await this.shouldSendEmail(uid, 'new_message');
    if (!check.allowed || !check.email) return;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">You Have New Messages 💬</h1>
        <p><strong>${senderName}</strong> has sent you a direct message on Neighborly.</p>
        <br/>
        <a href="https://neighborly.app/chats" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Open Chats</a>
      </div>
    `;

    await this.sendWithRetry({
      to: check.email,
      subject: "You Have New Messages",
      html,
    });
  }

  static async sendSecurityAlert(uid: string, action: string): Promise<void> {
    const check = await this.shouldSendEmail(uid, 'security_alert');
    if (!check.allowed || !check.email) return;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; border-top: 4px solid #F59E0B;">
        <h1 style="color: #F59E0B;">Security Alert 🛡️</h1>
        <p>We noticed the following security event on your Neighborly account:</p>
        <p style="background-color: #F3F4F6; padding: 12px; border-radius: 6px; font-weight: bold;">${action}</p>
        <p>If this was you, you can safely ignore this email. If you did not perform this action, please secure your account immediately.</p>
      </div>
    `;

    await this.sendWithRetry({
      to: check.email,
      subject: "Security Alert for Your Neighborly Account",
      html,
    });
  }

  static async sendAccountDeletedEmail(email: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111827;">Goodbye from Neighborly</h1>
        <p>Your Neighborly account has been successfully deleted along with all associated data.</p>
        <p>We're sorry to see you go! If you ever want to rejoin your local community, you are always welcome back.</p>
      </div>
    `;

    await this.sendWithRetry({
      to: email,
      subject: "Your Neighborly Account Has Been Deleted",
      html,
    });
  }

  static async sendWeeklyDigest(uid: string, topPostsCount: number): Promise<void> {
    const check = await this.shouldSendEmail(uid, 'weekly_digest');
    if (!check.allowed || !check.email) return;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #10B981;">Your Weekly Neighborly Digest 📰</h1>
        <p>Here is what you missed in your neighborhood this week!</p>
        <p>There were <strong>${topPostsCount}</strong> highly active discussions and recommendations nearby.</p>
        <br/>
        <a href="https://neighborly.app" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Catch Up Now</a>
      </div>
    `;

    await this.sendWithRetry({
      to: check.email,
      subject: "Your Weekly Neighborly Community Update",
      html,
    });
  }
}
