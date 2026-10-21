import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrgLevel, Prisma } from '@prisma/client';

import { PrismaService } from 'prisma/prisma.service';
import { StatusCreateDto } from './dto/status-create.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RequestCreateDto } from './dto/request-create.dto';
import { RevertStatusDto } from './dto/revert-status.dto';
import { FilesService } from 'src/files/files.service';
import { assertUserInOrg } from 'src/organizations/user-org-scope';
import { addStatusEntry, latestStatusEntry, lockUser } from './status-history';

// The only moves that are Reverts: each target and the statuses it can be
// reached from (see Revert in CONTEXT.md).
const REVERT_RULES: { target: number; from: [number, number] }[] = [
  { target: 0, from: [1, 6] },
  { target: 1, from: [2, 14] },
  { target: 6, from: [7, 14] },
  { target: 7, from: [8, 14] },
  { target: 15, from: [16, 16] },
];

const REVERT_TARGETS = new Set(REVERT_RULES.map((rule) => rule.target));

const REVERT_TO_0_FILES = ['photo', 'govcard', 'expfile', 'reqFile'] as const;

const isRevert = (from: number, target: number) =>
  REVERT_RULES.some(
    (rule) =>
      rule.target === target && from >= rule.from[0] && from <= rule.from[1],
  );

@Injectable()
export class RequestService {
  private readonly logger = new Logger(RequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async getCurrentStatus(id: number) {
    try {
      return await latestStatusEntry(this.prisma, id);
    } catch (err: any) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async updateStatus(updated: StatusCreateDto, approver: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockUser(tx, updated.user);
        const current = await latestStatusEntry(tx, updated.user);
        const mismatchedStatus =
          current?.request_status !== updated.current_status;
        const sameStatus = current?.request_status === updated.next_status;

        if (mismatchedStatus) {
          throw new BadRequestException(`user's status mismatched`);
        }

        if (sameStatus) {
          throw new BadRequestException(`user's already in this status`);
        }

        // Going back to a Revert target must go through the Revert, so its
        // rules and clean-up can't be bypassed.
        const backwardToRevertTarget =
          REVERT_TARGETS.has(updated.next_status) &&
          updated.next_status < current.request_status;

        if (backwardToRevertTarget) {
          throw new BadRequestException(
            `moving back to ${updated.next_status} is a revert: use POST admins/users/:userId/requests/revert`,
          );
        }

        const { entry } = await addStatusEntry(tx, {
          userId: updated.user,
          status: updated.next_status,
          requestType: current.request_type,
          approver: approver,
          description: updated.description,
          from: current.request_status,
        });
        return entry;
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
      await this.prisma.$transaction(async (tx) => {
        await lockUser(tx, data.userId);
        const user = await latestStatusEntry(tx, data.userId);
        if (user) {
          throw new BadRequestException(
            'user already has new card request, please ensure the card from user',
          );
        }

        await addStatusEntry(tx, {
          userId: data.userId,
          status: 1,
          requestType: data.request_type,
          from: null,
        });
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

  async revertStatus(userId: number, revert: RevertStatusDto, adminId: number) {
    try {
      const { entry, filesToDelete } = await this.prisma.$transaction(
        async (tx) => {
          await lockUser(tx, userId);
          await this.checkCanRevert(tx, adminId, userId);

          const current = await latestStatusEntry(tx, userId);

          if (current?.request_status !== revert.current_status) {
            throw new BadRequestException(`user's status mismatched`);
          }

          if (!isRevert(current.request_status, revert.target_status)) {
            throw new BadRequestException(
              `cannot revert from ${current.request_status} to ${revert.target_status}`,
            );
          }

          const filesToDelete: string[] = [];

          const target = revert.target_status;

          // A clean restart: see docs/adr/0001-revert-to-0-deletes-status-history.md
          if (target === 0) {
            await tx.users.update({
              where: { id: userId },
              data: { is_validate: false },
            });
            await tx.requests.deleteMany({ where: { userId: userId } });
            filesToDelete.push(
              ...(await this.filesService.txDeleteFilesForUser(
                REVERT_TO_0_FILES,
                userId,
                tx,
              )),
            );
          }

          if (target === 1 || target === 6) {
            filesToDelete.push(
              ...(await this.filesService.txDeleteFilesForUser(
                revert.delete_files ?? [],
                userId,
                tx,
              )),
            );
          }

          // The card record (Member Number, QR code) is kept; its dates are
          // set again when the card is re-issued.
          if (target === 1 || target === 6 || target === 7) {
            await tx.members.updateMany({
              where: { userId: userId },
              data: { start_date: null, end_date: null },
            });
          }

          if (target === 15) {
            await tx.members.updateMany({
              where: { userId: userId },
              data: { is_active: true },
            });
          }

          const { entry } = await addStatusEntry(tx, {
            userId: userId,
            status: revert.target_status,
            requestType: current.request_type,
            approver: adminId,
            description: revert.description,
            from: current.request_status,
          });

          return { entry, filesToDelete };
        },
      );

      await this.filesService.deleteFilesFromDisk(filesToDelete);
      return entry;
    } catch (err: any) {
      this.logger.error(err);
      if (
        err instanceof BadRequestException ||
        err instanceof ForbiddenException ||
        err instanceof NotFoundException
      ) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  // Only DEPARTMENT and MINISTRY admins may Revert, and only users in their
  // own organization or one below it.
  private async checkCanRevert(
    tx: Prisma.TransactionClient,
    adminId: number,
    userId: number,
  ) {
    const admin = await tx.admins.findUnique({
      where: { id: adminId },
      select: { organization: { select: { id: true, level: true } } },
    });

    const level = admin?.organization.level;
    if (
      !admin ||
      (level !== OrgLevel.DEPARTMENT && level !== OrgLevel.MINISTRY)
    ) {
      throw new ForbiddenException(
        'only DEPARTMENT or MINISTRY admins can revert',
      );
    }

    await assertUserInOrg(tx, admin.organization.id, userId);
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
