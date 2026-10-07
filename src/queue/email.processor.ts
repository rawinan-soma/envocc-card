import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from 'src/mail/mail.service';
import { Logger } from '@nestjs/common';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(
    job: Job<{ email: string; token: string }, any, string>,
  ): Promise<any> {
    this.logger.log(`Processing email job ${job.id}`);
    const { email, token } = job.data;
    try {
      await this.mailService.sendResetPasswordEmailActual(email, token);
      this.logger.log(`Email job ${job.id} completed`);
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed`, error);
      throw error;
    }
  }
}
