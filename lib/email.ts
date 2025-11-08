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
    const subject = 'Password Reset Code - ThePOS';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">ThePOS Password Reset</h2>
        <p>You requested a password reset for your ThePOS account.</p>
        <p>Your verification code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #10b981; font-size: 32px; margin: 0; letter-spacing: 8px;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">ThePOS - Your Digital Utility Platform</p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your ThePOS password reset code is: ${otp}. This code expires in 10 minutes.`
    });
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    const subject = 'Account Verification - ThePOS';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Welcome to ThePOS!</h2>
        <p>Thank you for registering with ThePOS. Please verify your email address to complete your registration.</p>
        <p>Your verification code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #10b981; font-size: 32px; margin: 0; letter-spacing: 8px;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't create this account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">ThePOS - Your Digital Utility Platform</p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your ThePOS verification code is: ${otp}. This code expires in 10 minutes.`
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
