import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getAllAdmins() {
    try {
      return await this.prisma.admins.findMany({
        omit: { password: true },
        include: {
          adminOnOrg: {
            select: { organization: { select: { id: true, name_th: true } } },
          },
        },

        // include: { institutions: { include: { departments: true } } },
      });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async getAdminByUsername(username: string) {
    try {
      const admin = await this.prisma.admins.findFirst({
        where: { username: username },
      });

      if (!admin) {
        throw new NotFoundException('admin not found');
      }
      return admin;
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async getAdminByEmail(email: string) {
    try {
      const admin = await this.prisma.admins.findFirst({
        where: { email: email },
        omit: { password: true },
      });

      if (!admin) {
        throw new NotFoundException('admin not found');
      }

      return admin;
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async getAdminById(id: number) {
    try {
      const admin = await this.prisma.admins.findUnique({
        where: { id: id },
        omit: { password: true },
        include: {
          adminOnOrg: {
            select: {
              organization: {
                select: {
                  id: true,
                  name_th: true,
                  level: true,
                  orgOnSeal: true,
                  orgOnSignature: true,
                },
              },
            },
          },
        },
      });

      if (!admin) {
        throw new NotFoundException('admin not found');
      }
      return admin;
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else if (err instanceof NotFoundException) {
        throw err;
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }
}
