import { Module, forwardRef } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [ConfigModule, forwardRef(() => QueueModule)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
