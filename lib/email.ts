import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter?: nodemailer.Transporter;
  private _usingTestAccount = false;
  private _testAccount: any = null;

  constructor() {
    // Support both Gmail service and custom SMTP servers
    const smtpConfig: any = {
      tls: {
        rejectUnauthorized: false
      }
    };

    // Check if using custom SMTP server
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      smtpConfig.host = process.env.SMTP_HOST;
      smtpConfig.port = parseInt(process.env.SMTP_PORT);
      smtpConfig.secure = process.env.SMTP_PORT === '465'; // true for 465, false for other ports
      smtpConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
      console.log(`📧 Email service using SMTP server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
      this.transporter = nodemailer.createTransport(smtpConfig);
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Try using Gmail or configured provider via 'service' when explicit host/port not provided
      smtpConfig.service = 'gmail';
      smtpConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
      console.log('📧 Email service using Gmail (service) with provided SMTP_USER');
      this.transporter = nodemailer.createTransport(smtpConfig);
    } else {
      // No SMTP configured — create a test account using Ethereal for development
      console.log('📧 No SMTP configuration found — creating Ethereal test account for development');
      // createTestAccount is async; set transporter once created
      nodemailer.createTestAccount()
        .then((testAccount) => {
          this._testAccount = testAccount
          this._usingTestAccount = true
          this.transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          })
          console.log(`📧 Ethereal test account created — user: ${testAccount.user}`)
        })
        .catch((err) => {
          console.error('❌ Failed to create Ethereal test account:', err)
          // As a last resort, create a no-op transporter that throws on send
          this.transporter = nodemailer.createTransport({ jsonTransport: true })
        })
    }
  }

  async sendEmail({ to, subject, text, html }: EmailOptions): Promise<boolean> {
    try {
      console.log(`📧 Attempting to send email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html: html || text,
      };

      if (!this.transporter) {
        console.error('❌ No mail transporter configured')
        return false
      }

      const result = await this.transporter.sendMail(mailOptions as any);
      console.log('✅ Email sent successfully:', result?.messageId || '(no messageId)');

      // If using Ethereal test account, print preview URL
      try {
        if (this._usingTestAccount) {
          const preview = nodemailer.getTestMessageUrl(result)
          if (preview) console.log('📧 Preview URL:', preview)
        }
      } catch (err) {
        // ignore preview errors
      }

      return true;
    } catch (error: any) {
      console.error('❌ Email sending failed:', error && error.stack ? error.stack : error)
      return false;
    }
  }

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

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your Nillar Pay password reset code is: ${otp}. This code expires in 10 minutes.`
    });
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

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your Nillar Pay verification code is: ${otp}. This code expires in 10 minutes.`
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.warn('⚠️ testConnection: no transporter configured')
        return false
      }
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error: any) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }
}


export const emailService = new EmailService();
