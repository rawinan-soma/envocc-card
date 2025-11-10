import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async getChildIds(orgId: number): Promise<number[]> {
    const parent = await this.prisma.organizations.findUnique({
      where: { id: orgId },
      include: { children: true },
    });

    if (!parent) return [];

    let ids: number[] = [parent.id];
    for (const child of parent.children) {
      const childIds = await this.getChildIds(child.id);
      ids = ids.concat(childIds);
    }

    return ids;
  }

  async getAllAdmins(adminId: number, pageNumber: number) {
    try {
      const limit = 10;
      const offset = (pageNumber - 1) * limit;

      const orgId = (
        await this.prisma.admins.findUnique({
          where: { id: adminId },
        })
      )?.organizationId;

      if (!orgId) {
        throw new InternalServerErrorException();
      }

      const ids = await this.getChildIds(orgId);

      const admins = await this.prisma.admins.findMany({
        where: { organizationId: { in: ids } },
        omit: { password: true },
        include: {
          organization: true,
          position: true,
          position_lv: true,
        },
        orderBy: { id: 'asc' },
      });

      console.log(admins.slice(offset, offset + limit));

      const totalItems = admins.length;
      const totalPages = Math.ceil(totalItems / limit);
      return {
        data: admins.slice(offset, offset + limit),
        pageData: {
          totalItems: totalItems,
          totalPages: totalPages,
          currentPage: pageNumber,
          limit: limit,
        },
      };
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
      const admin:
        | ({
            organization: {
              id: number;
              code: string;
              name_th: string;
              name_eng: string;
              level: $Enums.OrgLevel;
              parentId: number | null;
              sealId: number;
              signatureId: number;
              provinceId: number | null;
            };
          } & {
            role: string;
            username: string;
            pname: string;
            fname: string;
            lname: string;
            private_number: string;
            work_number: string;
            email: string;
            is_validate: boolean;
            create_date: Date;
            hashedRefreshToken: string | null;
            id: number;
            positionId: number;
            positionLvId: number;
            organizationId: number;
          })
        | null = await this.prisma.admins.findUnique({
        where: { id: id },
        omit: { password: true },
        include: {
          organization: true,
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
