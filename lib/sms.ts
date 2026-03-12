import axios from 'axios';

interface TermiiSMSResponse {
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

interface SendchampSMSResponse {
  status: string;
  data: {
    id: string;
    business_id: string;
    message: string;
    contacts: Array<{
      phone_number: string;
      status: string;
    }>;
  };
}

interface SendSMSParams {
  to: string;
  message: string;
}

class SMSService {
  // Termii Config (Primary)
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  // Sendchamp Config (Fallback)
  private sendchampApiKey: string;
  private sendchampSenderId: string;
  private sendchampBaseUrl: string;

  constructor() {
    // Initialize Termii
    this.apiKey = process.env.TERMII_API_KEY || '';
    this.senderId = process.env.TERMII_SENDER_ID || 'NillarPay';
    this.baseUrl = process.env.TERMII_BASE_URL || 'https://v3.api.termii.com';

    // Initialize Sendchamp
    this.sendchampApiKey = process.env.SENDCHAMP_API_KEY || '';
    this.sendchampSenderId = process.env.SENDCHAMP_SENDER_ID || 'Sendchamp';
    this.sendchampBaseUrl = process.env.SENDCHAMP_BASE_URL || 'https://api.sendchamp.com/api/v1';

    this.logConfiguration();
  }

  private logConfiguration() {
    if (this.apiKey) {
      console.log(`🔑 Termii SMS API configured (Primary).`);
    } else {
      console.warn('⚠️ TERMII_API_KEY not configured.');
    }

    if (this.sendchampApiKey) {
      console.log(`🔑 Sendchamp SMS API configured (Fallback).`);
    } else {
      console.warn('⚠️ SENDCHAMP_API_KEY not configured.');
    }
  }

  /**
   * Tests connection to both providers.
   * Returns true if at least one provider is working.
   */
  async testConnection(): Promise<boolean> {
    let termiiOk = false;
    let sendchampOk = false;

    // Test Termii
    if (this.apiKey) {
      try {
        console.log('🔄 Testing Termii connection...');
        await axios.get(`${this.baseUrl}/api/get-balance?api_key=${this.apiKey}`, { timeout: 5000 });
        console.log('✅ Termii connection successful');
        termiiOk = true;
      } catch (error: any) {
        console.error('❌ Termii connection failed:', error.message);
      }
    }

    // Test Sendchamp
    if (this.sendchampApiKey) {
      try {
        console.log('🔄 Testing Sendchamp connection...');
        await axios.get(`${this.sendchampBaseUrl}/wallet/wallet_balance`, {
          headers: {
            'Authorization': `Bearer ${this.sendchampApiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        console.log('✅ Sendchamp connection successful');
        sendchampOk = true;
      } catch (error: any) {
        console.error('❌ Sendchamp connection failed:', error.message);
      }
    }

    return termiiOk || sendchampOk;
  }

  private async sendWithSendchamp(to: string, message: string): Promise<SendchampSMSResponse> {
    const payload = {
      to: [to], // Sendchamp expects array
      message: message,
      sender_name: this.sendchampSenderId,
      route: 'dnd' // or 'international'/'non_dnd'
    };

    const response = await axios.post(`${this.sendchampBaseUrl}/sms/send`, payload, {
      headers: {
        'Authorization': `Bearer ${this.sendchampApiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    return response.data;
  }

  async sendSMS({ to, message }: SendSMSParams): Promise<any> {
    const formattedPhone = this.formatPhoneForSMS(to);

    // 1. Try Termii First
    if (this.apiKey) {
      try {
        console.log(`🔄 Sending SMS via Termii to ${formattedPhone}`);
        const payload = {
          api_key: this.apiKey,
          to: formattedPhone,
          from: this.senderId,
          sms: message,
          type: 'plain',
          channel: 'generic'
        };

        const response = await axios.post(`${this.baseUrl}/api/sms/send`, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });

        console.log('✅ SMS sent successfully via Termii');
        return response.data;
      } catch (error: any) {
        console.error('❌ Termii SMS failed:', error.message);
        console.log('🔄 Attempting fallback to Sendchamp...');
      }
    }

    // 2. Fallback to Sendchamp
    if (this.sendchampApiKey) {
      try {
        console.log(`🔄 Sending SMS via Sendchamp to ${formattedPhone}`);
        const response = await this.sendWithSendchamp(formattedPhone, message);
        console.log('✅ SMS sent successfully via Sendchamp');
        return response;
      } catch (error: any) {
        console.error('❌ Sendchamp SMS failed:', error.response?.data || error.message);
      }
    }

    console.error('❌ All SMS providers failed to send message.');
    return null;
  }

  async sendOTP(phone: string, code: string): Promise<void> {
    const message = `Your NillarPay verification code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`;
    await this.sendSMS({ to: phone, message });
  }

  formatPhoneForSMS(phone: string): string {
    // Both providers accept international format without + (e.g., 23480...)
    let p = phone.replace(/\s+/g, '');
    if (p.startsWith('0')) return `234${p.substring(1)}`;
    if (p.startsWith('+234')) return p.substring(1);
    if (p.startsWith('234')) return p;
    return `234${p}`;
  }
}

export const smsService = new SMSService();
