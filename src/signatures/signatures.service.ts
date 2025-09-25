import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SignatureCreateDto } from './dto/signature-create.dto';

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);
  constructor(private readonly prisma: PrismaService) {}
  async createSignature(orgId: number, signature: SignatureCreateDto) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const updateSignature = await tx.signatures.create({
          data: {
            ...signature,
            admin: signature?.admin as number,
            filename: signature?.filename as string,
          },
        });

        const updateOrgs = await this.prisma.organizations.findMany({
          where: { OR: [{ id: orgId }, { parentId: orgId }] },
        });

        for (const org of updateOrgs) {
          await tx.orgOnSignature.create({
            data: {
              organization: { connect: { id: org.id } },
              signature: { connect: { id: updateSignature.id } },
            },
          });
        }
      });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
