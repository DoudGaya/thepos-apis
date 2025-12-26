import axios from 'axios';

interface TermiiSMSResponse {
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

interface SendSMSParams {
  to: string;
  message: string;
}

class SMSService {
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TERMII_API_KEY || 'TLPKjucDosWbPhSjyoUlxSQSclkPPEiyFzJmdOfaLCUFLtywTdWObsYBAMaiwg';
    this.senderId = process.env.TERMII_SENDER_ID || 'CCSA';
    this.baseUrl = process.env.TERMII_BASE_URL || 'https://v3.api.termii.com';
    
    if (!this.apiKey) {
      console.warn('⚠️ TERMII_API_KEY not configured. SMS will not be sent.');
    } else {
      console.log(`🔑 Termii API configured with key: ${this.apiKey.substring(0, 8)}...`);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      console.log('❌ Cannot test connection - no API key configured');
      return false;
    }

    try {
      console.log('🔄 Testing Termii API connection...');
      const response = await axios.get(`${this.baseUrl}/api/get-balance?api_key=${this.apiKey}`, {
        timeout: 10000
      });
      
      console.log('✅ Termii API connection successful:', response.data);
      return true;
    } catch (error: any) {
      console.error('❌ Termii API connection failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return false;
    }
  }

  async sendSMS({ to, message }: SendSMSParams): Promise<TermiiSMSResponse | null> {
    if (!this.apiKey) {
      console.log(`📱 SMS would be sent to ${to}: ${message}`);
      console.log('💡 Configure TERMII_API_KEY to enable actual SMS sending');
      return null;
    }

    try {
      console.log(`🔄 Sending SMS to ${to}`);
      console.log(`📱 Message: ${message}`);

      const payload = {
        api_key: this.apiKey,
        to: to,
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: 'generic'
      };

      console.log(`📤 SMS Payload:`, { ...payload, api_key: '***' });

      const response = await axios.post(`${this.baseUrl}/api/sms/send`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000 // 15 second timeout
      });

      console.log('✅ SMS sent successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ SMS sending failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
      
      // Don't throw error - just log it so registration can continue
      console.log('⚠️ SMS service unavailable - registration will continue without SMS verification');
      return null;
    }
  }

  async sendOTP(phone: string, code: string): Promise<void> {
    const message = `Your NillarPay verification code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`;
    
    await this.sendSMS({
      to: phone,
      message: message
    });
  }

  formatPhoneForSMS(phone: string): string {
    // Ensure phone number is in international format for Termii
    if (phone.startsWith('0')) {
      return `234${phone.substring(1)}`;
    }
    if (phone.startsWith('+234')) {
      return phone.substring(1);
    }
    if (phone.startsWith('234')) {
      return phone;
    }
    return `234${phone}`;
  }
}

export const smsService = new SMSService();
