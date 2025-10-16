import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { FileCreateDto } from 'src/files/dto/file-create.dto';

@Injectable()
export class SealsService {
  private readonly logger = new Logger(SealsService.name);
  constructor(private readonly prismaService: PrismaService) {}

  async getSealsById(id: number) {
    try {
      const seal = await this.prismaService.seals.findUnique({
        where: { id: id },
      });

      if (!seal) {
        throw new NotFoundException('seals not found');
      }

      return seal;
    } catch (err) {
      this.logger.error(err);
      if (err instanceof NotFoundException) {
        throw err;
      }

      throw new InternalServerErrorException('something went wrong');
    }
  }

  async createAndUpdateSealTx(
    seal: FileCreateDto,
    orgId: number,
    seal_name: string,
  ) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        const updateSeal = await tx.seals.create({
          data: {
            seal_name: seal_name,
            adminId: seal.adminId!,
            filename: seal.file_name,
            url: seal.file_name,
          },
        });

        const updateOrgs = await this.prismaService.organizations.findMany({
          where: { OR: [{ id: orgId }, { parentId: orgId }] },
        });

        for (const updateOrg of updateOrgs) {
          await tx.organizations.update({
            where: { id: updateOrg.id },
            data: { seal: { connect: { id: updateSeal.id } } },
          });
        }
      });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(err);
    }
  }

  // TODO: get all seals
}
