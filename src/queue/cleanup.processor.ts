import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'prisma/prisma.service';

@Processor('cleanup')
export class CleanupProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'delete-qr-token') {
      const { id } = job.data;
      await this.prisma.members.update({
        where: { member_id: id },
        data: { qrcode_token: null },
      });
    }
  }
}
