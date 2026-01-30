import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CleanupProcessor } from './cleanup.processor';
import { EmailProcessor } from './email.processor';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'cleanup',
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
    forwardRef(() => MailModule),
  ],
  providers: [CleanupProcessor, EmailProcessor, PrismaService],
  exports: [BullModule],
})
export class QueueModule {}
