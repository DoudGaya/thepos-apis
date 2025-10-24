import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

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
    } else {
      // Fallback to Gmail
      smtpConfig.service = 'gmail';
      smtpConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
      console.log('📧 Email service using Gmail');
    }

    this.transporter = nodemailer.createTransport(smtpConfig);
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

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return true;
    } catch (error: any) {
      console.error('❌ Email sending failed:', error.message);
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
