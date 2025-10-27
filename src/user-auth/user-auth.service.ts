import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

import * as bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserExpCreateDto } from './dto/user-exp-create.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserAuthService {
  private readonly logger = new Logger(UserAuthService.name);
  constructor(private readonly prisma: PrismaService) {}

  private calculateExpYears(lastDate: Date, startDate: Date): number {
    let yearDiff = lastDate.getFullYear() - startDate.getFullYear();

    if (
      lastDate.getMonth() < startDate.getMonth() ||
      (lastDate.getMonth() === startDate.getMonth() &&
        lastDate.getDay() < startDate.getDay())
    ) {
      yearDiff--;
    }

    return yearDiff;
  }

  async createUser(dto: UserExpCreateDto) {
    try {
      dto.user.password = await bcrypt.hash(dto.user.password, 10);
      const existingUser = await this.prisma.users.findFirst({
        where: {
          OR: [
            { username: dto.user.username },
            { email: dto.user.email },
            { cid: dto.user.cid },
          ],
        },
      });

      if (existingUser) {
        throw new BadRequestException('user already exists');
      }

      if (!dto.experiences || dto.experiences.length === 0) {
        throw new BadRequestException(
          'experiences is required for creating user',
        );
      }

      dto.experiences.map((item) => {
        item.exp_years = Number(
          this.calculateExpYears(item.exp_ldate, item.exp_fdate),
        );
      });

      const { positionId, position_lvId, orgId, ...rest } = dto.user;

      return await this.prisma.users.create({
        data: {
          ...rest,
          position: { connect: { position_id: positionId } },
          position_lv: { connect: { position_lv_id: position_lvId } },

          experiences: { createMany: { data: dto.experiences } },
          requests: { create: { request_status: 0, request_type: 1 } },
          organization: { connect: { id: orgId } },
        },
      });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('failed to create user');
      } else if (err instanceof BadRequestException) {
        throw err;
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async createExecutiveUser(dto: UserExpCreateDto) {
    try {
      const nonExecutivePositions = [201, 202, 203, 204, 205, 206, 207];
      if (nonExecutivePositions.includes(dto.user.positionId)) {
        throw new BadRequestException(
          'non-executive user required experiences',
        );
      }

      dto.user.password = await bcrypt.hash(dto.user.password, 10);
      const existingUser = await this.prisma.users.findFirst({
        where: {
          OR: [
            { username: dto.user.username },
            { email: dto.user.email },
            { cid: dto.user.cid },
          ],
        },
      });

      if (existingUser) {
        throw new BadRequestException('user already exists');
      }

      const { positionId, position_lvId, orgId, ...rest } = dto.user;

      return await this.prisma.users.create({
        data: {
          ...rest,
          position: { connect: { position_id: positionId } },
          position_lv: { connect: { position_lv_id: position_lvId } },

          requests: { create: { request_status: 0, request_type: 1 } },
          organization: { connect: { id: orgId } },
        },
      });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('failed to create user');
      } else if (err instanceof BadRequestException) {
        throw err;
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async getAuthenticatedUser(username: string, password: string) {
    try {
      const user = await this.prisma.users.findFirst(
        Prisma.validator<Prisma.usersFindFirstArgs>()({
          where: { username: username, is_validate: true },
          select: {
            username: true,
            password: true,
            id: true,
            role: true,
            position: true,
            organization: true,
            is_validate: true,
          },
        }),
      );

      if (!user || user.is_validate === false) {
        throw new UnauthorizedException('invalid credential');
      }

      await this.verifyPassword(password, user?.password || '');
      user.password = '';

      const { position, ...rest } = user;

      return {
        ...rest,
        positionId: position?.position_id,
        level: rest.organization.level,
        executive: position?.orgId ? 'executive' : 'non-executive',
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
    await this.prisma.users.update({
      where: { id: id },
      data: { hashedRefreshToken: hashedRefreshToken },
    });
  }

  async getUserFromRefreshToken(refreshToken: string, id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: id },
    });
    const isTokenMatch = await bcrypt.compare(
      refreshToken,
      (user?.hashedRefreshToken as string) ?? '',
    );

    if (isTokenMatch) {
      return {
        id: user?.id,
        username: user?.username,
        role: user?.role,
      };
    }
  }

  async removeRefreshToken(id: number) {
    return this.prisma.users.update({
      where: { id: id },
      data: { hashedRefreshToken: null },
    });
  }
}
