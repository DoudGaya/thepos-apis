import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email';
import { z } from 'zod';

export const runtime = 'nodejs';

const SUPPORT_INBOX = 'adaag.ad@gmail.com';

const supportSchema = z.object({
  email: z.string().email('Valid email is required'),
  subject: z.string().min(3, 'Subject is too short').max(200, 'Subject is too long'),
  message: z.string().min(10, 'Message is too short').max(5000, 'Message is too long'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = supportSchema.parse(body);

    const { email, subject, message, name } = parsed;
    const displayName = name || email;

    // Send notification email to support inbox
    const supportEmailSent = await emailService.sendEmail({
      to: SUPPORT_INBOX,
      subject: `[Support] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #000; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #fff; margin: 0;">New Support Request</h2>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px;"><strong>From:</strong> ${displayName} &lt;${email}&gt;</p>
            <p style="margin: 0 0 16px;"><strong>Subject:</strong> ${subject}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="margin: 0 0 8px;"><strong>Message:</strong></p>
            <p style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; white-space: pre-wrap; margin: 0;">${message}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Received via NillarPay in-app support. Reply directly to this email to respond to the user.
            </p>
          </div>
        </div>
      `,
      text: `New Support Request\n\nFrom: ${displayName} <${email}>\nSubject: ${subject}\n\nMessage:\n${message}`,
    });

    // Send acknowledgement to the user
    const ackEmailSent = await emailService.sendEmail({
      to: email,
      subject: `We received your message – NillarPay Support`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #000; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #fff; margin: 0;">We got your message!</h2>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Hi ${displayName},</p>
            <p>Thanks for reaching out. We've received your support request and will get back to you within <strong>24 hours</strong>.</p>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px;"><strong>Your message:</strong></p>
              <p style="margin: 0; color: #6b7280; white-space: pre-wrap;">${message}</p>
            </div>
            <p>– The NillarPay Support Team</p>
          </div>
        </div>
      `,
      text: `Hi ${displayName},\n\nThanks for reaching out. We've received your support request and will get back to you within 24 hours.\n\nYour message:\n${message}\n\n– The NillarPay Support Team`,
    });

    if (!supportEmailSent) {
      console.error('❌ Failed to send support email to inbox');
      return NextResponse.json(
        { error: 'Failed to send support message. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Support request sent successfully',
      ackSent: ackEmailSent,
    });
  } catch (error) {
    console.error('Support route error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
