import { ContactRequest } from '../types';

export interface ChannelSendResult {
  success: boolean;
  channelPending?: boolean;
  message?: string;
  error?: string;
}

export interface CommunicationChannel {
  type: 'email' | 'whatsapp' | 'telegram';
  name: string;
  isConfigured(settings: any): boolean;
  sendRequest(request: ContactRequest, settings: any): Promise<ChannelSendResult>;
}

export class EmailCommunicationChannel implements CommunicationChannel {
  public type: 'email' = 'email';
  public name = 'E-mail Oficial ADMIR';

  public isConfigured(settings: any): boolean {
    const emailConfig = settings?.emailChannel;
    return Boolean(emailConfig && emailConfig.active && emailConfig.recipientEmail && emailConfig.recipientEmail.includes('@'));
  }

  public async sendRequest(request: ContactRequest, settings: any): Promise<ChannelSendResult> {
    if (!this.isConfigured(settings)) {
      return {
        success: false,
        channelPending: true,
        message: 'Este canal de e-mail ainda não está configurado no painel administrativo.',
      };
    }

    const emailConfig = settings.emailChannel;

    // Simulation log / transport layer hook (In production, wire to Nodemailer, SendGrid, Resend, or SMTP transport if configured in process.env)
    console.log(`[EmailChannel] Dispatching Contact Request [${request.protocol}] to ${emailConfig.recipientEmail}`);
    console.log(`[EmailChannel] Subject: ${request.subject} | From: ${request.name} <${request.email}>`);

    return {
      success: true,
      message: `Mensagem enviada com sucesso para ${emailConfig.displayName || 'Atendimento ADMIR'}. Protocolo: ${request.protocol}`,
    };
  }
}

export class WhatsAppCommunicationChannel implements CommunicationChannel {
  public type: 'whatsapp' = 'whatsapp';
  public name = 'WhatsApp (Futuro Canal)';

  public isConfigured(_settings: any): boolean {
    return false; // Not implemented / Inactive by design in Phase 1
  }

  public async sendRequest(_request: ContactRequest, _settings: any): Promise<ChannelSendResult> {
    return {
      success: false,
      channelPending: true,
      message: 'Canal WhatsApp em desenvolvimento. Utilize o canal de E-mail.',
    };
  }
}

export class TelegramCommunicationChannel implements CommunicationChannel {
  public type: 'telegram' = 'telegram';
  public name = 'Telegram (Futuro Canal)';

  public isConfigured(_settings: any): boolean {
    return false; // Not implemented / Inactive by design in Phase 1
  }

  public async sendRequest(_request: ContactRequest, _settings: any): Promise<ChannelSendResult> {
    return {
      success: false,
      channelPending: true,
      message: 'Canal Telegram em desenvolvimento. Utilize o canal de E-mail.',
    };
  }
}

export const communicationChannels: Record<'email' | 'whatsapp' | 'telegram', CommunicationChannel> = {
  email: new EmailCommunicationChannel(),
  whatsapp: new WhatsAppCommunicationChannel(),
  telegram: new TelegramCommunicationChannel(),
};
