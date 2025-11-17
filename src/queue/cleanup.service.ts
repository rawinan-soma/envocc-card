import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class CleanupService {
  constructor(@InjectQueue('cleanUp') private queue: Queue) {}

  async scheduleCleanUp(recordId: number) {
    await this.queue.add(
      'delete-qr-token',
      { id: recordId },
      { delay: 5 * 60 * 100 },
    );
  }
}
