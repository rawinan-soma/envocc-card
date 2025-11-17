import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CleanupProcessor } from './cleanup.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'cleanup',
    }),
  ],
  providers: [CleanupProcessor, PrismaService],
  exports: [BullModule],
})
export class QueueModule {}
