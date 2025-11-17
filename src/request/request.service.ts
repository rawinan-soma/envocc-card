import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';
import { StatusCreateDto } from './dto/status-create.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RequestCreateDto } from './dto/request-create.dto';
// import { Prisma } from '@prisma/client';

@Injectable()
export class RequestService {
  private readonly logger = new Logger(RequestService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentStatus(id: number) {
    try {
      const currentStatus = await this.prisma.requests.findFirst({
        where: {
          userId: id,
        },
        orderBy: {
          date_update: 'desc',
        },
      });

      return currentStatus;
    } catch (err: any) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async updateStatus(updated: StatusCreateDto, approver: number) {
    try {
      const current = await this.getCurrentStatus(updated.user);
      const mismatchedStatus =
        current?.request_status !== updated.current_status;
      const sameStatus = current?.request_status === updated.next_status;

      if (mismatchedStatus) {
        throw new BadRequestException(`user's status mismatched`);
      }

      if (sameStatus) {
        throw new BadRequestException(`user's already in this status`);
      }

      return await this.prisma.requests.create({
        data: {
          userId: updated.user,
          request_status: updated.next_status,
          request_type: current.request_type,
          approver: approver,
          description: updated.description,
        },
      });
    } catch (err: any) {
      this.logger.error(err);
      if (err instanceof BadRequestException) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('somethong went wrong');
      }
    }
  }

  async getAllLatestStatuses() {
    try {
      const statuses = await this.prisma.requests.groupBy({
        by: ['userId'],
        _max: {
          request_status: true,
        },
        orderBy: { userId: 'asc' },
      });

      return statuses;
    } catch (err: any) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async createNewRequest(data: RequestCreateDto) {
    try {
      const user = await this.getCurrentStatus(data.userId);
      if (user) {
        throw new BadRequestException(
          'user already has new card request, please ensure the card from user',
        );
      }

      data.request_status = 1;

      await this.prisma.requests.create({ data: data });
    } catch (err: any) {
      this.logger.error(err);
      if (err instanceof BadRequestException) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async deleteRequestByID(id: number) {
    try {
      const request = await this.getCurrentStatus(id);
      const isInitiate = request?.request_status === 0;
      if (!request || isInitiate) {
        throw new BadRequestException('request not found');
      }

      await this.prisma.requests.delete({
        where: { id: request.id },
      });
    } catch (err: any) {
      this.logger.error(err);

      if (err instanceof BadRequestException) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  // async transactionDeleteRequest(tx: Prisma.TransactionClient, id: number) {
  //   const request = await tx.requests.findFirst({
  //     where: { user: id },
  //     orderBy: { date_update: 'desc' },
  //   });
  //   const isInitiate = request?.request_status === 0;

  //   if (!request || !isInitiate) {
  //     throw new BadRequestException('bad request by user');
  //   }

  //   await tx.requests.delete({ where: { req_id: request.req_id } });
  // }
}
