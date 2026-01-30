import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MailService {
  private mg;
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({
      username: 'api',
      key: this.configService.get<string>('MAILGUN_API_KEY') || 'dummy_key',
    });
  }

  async sendResetPasswordEmail(email: string, token: string) {
    await this.emailQueue.add('reset-password', {
      email,
      token,
    });
    this.logger.log(`Added reset password email job for ${email} to queue`);
  }

  async sendResetPasswordEmailActual(email: string, token: string) {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN');
    const from =
      this.configService.get<string>('MAILGUN_FROM_EMAIL') ||
      'noreply@example.com';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    if (!domain) {
      this.logger.warn('MAILGUN_DOMAIN is not set. Email will not be sent.');
      return;
    }

    try {
      await this.mg.messages.create(domain, {
        from: `Support <${from}>`,
        to: [email],
        subject: 'Reset Password Request',
        text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
        html: `<p>You requested a password reset.</p><p>Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
      });
      this.logger.log(`Reset password email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error);
      throw error;
    }
  }
}