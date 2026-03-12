import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'noreply@nillar.com';

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  try {
    console.log(`📧 Sending email to: ${to} | Subject: ${subject}`);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
    if (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
    console.log('✅ Email sent successfully');
    return true;
  } catch (err: any) {
    console.error('❌ Email sending failed:', err?.message ?? err);
    return false;
  }
}

class EmailService {

  async sendPasswordResetOTP(email: string, otp: string): Promise<boolean> {
    const subject = 'Password Reset Code - Nillar Pay';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #000000; padding: 32px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Nillar Pay</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #000000; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
                    <p style="margin: 0 0 24px 0; color: #555555; font-size: 15px; line-height: 1.6;">
                      We received a request to reset your password. Use the verification code below to complete the process.
                    </p>
                    <!-- OTP Box -->
                    <div style="background-color: #f9f9f9; border: 2px solid #e5e5e5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                      <p style="margin: 0 0 8px 0; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                      <h1 style="margin: 0; color: #000000; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${otp}</h1>
                    </div>
                    <p style="margin: 0 0 8px 0; color: #888888; font-size: 13px;">
                      ⏱ This code expires in <strong>10 minutes</strong>
                    </p>
                    <p style="margin: 0; color: #888888; font-size: 13px;">
                      If you didn't request this reset, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; border-top: 1px solid #eeeeee; text-align: center;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} Nillar Pay. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return sendEmail(email, subject, html, `Your Nillar Pay password reset code is: ${otp}. This code expires in 10 minutes.`);
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    const subject = 'Verify Your Account - Nillar Pay';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #000000; padding: 32px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Nillar Pay</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #000000; font-size: 20px; font-weight: 600;">Welcome to Nillar Pay!</h2>
                    <p style="margin: 0 0 24px 0; color: #555555; font-size: 15px; line-height: 1.6;">
                      Thank you for creating an account. Please verify your email address using the code below.
                    </p>
                    <!-- OTP Box -->
                    <div style="background-color: #f9f9f9; border: 2px solid #e5e5e5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                      <p style="margin: 0 0 8px 0; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                      <h1 style="margin: 0; color: #000000; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${otp}</h1>
                    </div>
                    <p style="margin: 0 0 8px 0; color: #888888; font-size: 13px;">
                      ⏱ This code expires in <strong>10 minutes</strong>
                    </p>
                    <p style="margin: 0; color: #888888; font-size: 13px;">
                      If you didn't create this account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; border-top: 1px solid #eeeeee; text-align: center;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} Nillar Pay. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return sendEmail(email, subject, html, `Your Nillar Pay verification code is: ${otp}. This code expires in 10 minutes.`);
  }

  async sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
    return sendEmail(to, subject, html, text);
  }

  async testConnection(): Promise<boolean> {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY is not set');
      return false;
    }
    console.log('✅ Resend email service configured');
    return true;
  }
}


export const emailService = new EmailService();
