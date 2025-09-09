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
      const hashedPassword = await bcrypt.hash(dto.user.password, 10);
      dto.user.password = hashedPassword;
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

      dto.experiences.map((item) => {
        item.exp_years = Number(
          this.calculateExpYears(item.exp_ldate, item.exp_fdate),
        );
      });

      return await this.prisma.users.create({
        data: {
          ...dto.user,
          e_learning: 1,

          experiences: { createMany: { data: dto.experiences } },
          requests: { create: { request_status: 0, request_type: 1 } },
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('failed to create user');
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async getAuthenticatedUser(username: string, password: string) {
    try {
      const user = await this.prisma.users.findFirst({
        where: { username: username },
        select: { username: true, password: true, id: true, role: true },
      });

      if (!user) {
        throw new UnauthorizedException('invalid credential');
      }

      await this.verifyPassword(password, user?.password || '');
      user.password = '';

      return user;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof UnauthorizedException) {
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
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
