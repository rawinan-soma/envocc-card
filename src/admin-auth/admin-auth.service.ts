import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AdminCreateDto } from './dto/admin-create.dto/admin-create.dto';
import * as bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { $Enums } from '@prisma/client';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createAdmin(dto: AdminCreateDto) {
    try {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const { orgId, ...rest } = dto;
      return await this.prisma.admins.create({
        data: {
          ...rest,
          password: hashedPassword,
          organizationId: orgId,
        },
        select: { username: true, role: true },
      });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        switch (err.code) {
          case 'P2002':
            throw new BadRequestException('username or email alredy exists');
          default:
            throw new BadRequestException('create user failed');
        }
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async getAuthenticatedAdmin(username: string, password: string) {
    try {
      const admin: {
        username: string;
        password: string;
        role: string;
        organization: {
          level: $Enums.OrgLevel;
        };
        id: number;
      } | null = await this.prisma.admins.findFirst({
        where: { username: username },
        select: {
          username: true,
          password: true,
          id: true,
          role: true,
          organization: { select: { level: true } },
        },
      });

      if (!admin) {
        throw new UnauthorizedException('invalid credential');
      }

      await this.verifyPassword(password, admin?.password || '');
      admin.password = '';

      return {
        username: admin.username,
        id: admin.id,
        role: admin.role,
        level: admin.organization.level,
      };
    } catch (err) {
      this.logger.error(err);
      if (err instanceof UnauthorizedException) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  private async verifyPassword(password: string, hashedPassword: string) {
    const isPasswordMatched = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('invalid credential');
    }
  }

  async setCurrentRefreshToken(refreshToken: string, id: number) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.admins.update({
      where: { id: id },
      data: { hashedRefreshToken: hashedRefreshToken },
    });
  }

  async getAdminFromRefreshToken(refreshToken: string, id: number) {
    const admin = await this.prisma.admins.findUnique({
      where: { id: id },
    });
    const isTokenMatch = await bcrypt.compare(
      refreshToken,
      (admin?.hashedRefreshToken as string) ?? '',
    );

    if (isTokenMatch) {
      return {
        id: admin?.id,
        username: admin?.username,
        role: admin?.role,
      };
    }
  }

  async removeRefreshToken(id: number) {
    await this.prisma.admins.update({
      where: { id: id },
      data: { hashedRefreshToken: '' },
    });
  }
}
