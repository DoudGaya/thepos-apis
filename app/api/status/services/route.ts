import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/lib/sms';
import { emailService } from '@/lib/email';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Testing SMS and Email services...');
    
    // Test SMS service
    const smsTest = await smsService.testConnection();
    
    // Test Email service
    const emailTest = await emailService.testConnection();
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      services: {
        sms: {
          configured: !!process.env.TERMII_API_KEY,
          working: smsTest,
          provider: 'Termii'
        },
        email: {
          configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
          working: emailTest,
          provider: 'Gmail SMTP'
        }
      },
      environment: {
        termii_api_key_present: !!process.env.TERMII_API_KEY,
        smtp_user_present: !!process.env.SMTP_USER,
        smtp_pass_present: !!process.env.SMTP_PASS,
      }
    });
  } catch (error) {
    console.error('Service status check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check service status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
