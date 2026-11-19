import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';
import { MemeberCreateDto } from './dto/create-member.dto';
import { FilesService } from 'src/files/files.service';
import { OrgLevel, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  addStatusEntry,
  latestStatusEntry,
  lockUser,
} from 'src/request/status-history';
import {
  assertApprovalDate,
  cardVerifiesAt,
  inEffectToday,
  latestCard,
} from './cards';
import { SIGNING_METHOD_STATUSES } from 'src/request/request-statuses';
// import { RequestService } from 'src/request/request.service';

interface OrganizationWithParent {
  id: number;
  name_th: string;
  level: OrgLevel;
  parent?: OrganizationWithParent | null;
}

const CARD_SELECT = Prisma.validator<Prisma.membersSelect>()({
  qrcode: true,
  is_active: true,
  member_no: true,
  start_date: true,
  end_date: true,
  user: {
    select: {
      cid: true,
      pname_th: true,
      pname_other_th: true,
      fname_th: true,
      lname_th: true,
      pname_en: true,
      pname_other_en: true,
      fname_en: true,
      lname_en: true,
      blood: true,
      position: true,
      positionId: true,
      position_lv: true,
      photos: {
        select: {
          url: true,
        },
      },
      organizationId: true,
      organization: {
        include: {
          seal: true,
          signature: true,
          parent: {
            include: {
              seal: true,
              signature: true,
              parent: {
                include: {
                  parent: {
                    include: {
                      parent: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    @InjectQueue('cleanup') private queue: Queue,
    // private readonly requestService: RequestService,
  ) {}

  private pickLevelForRequestForm(
    org: OrganizationWithParent | undefined | null,
    levels: string[] = ['UNIT', 'PROVINCE', 'DEPARTMENT', 'MINISTRY'],
  ): Record<string, string> | null {
    if (!org) {
      return null;
    }

    const result = {};
    if (levels.includes(org.level)) {
      result[org.level] = org.name_th;
    }

    const parentResult = this.pickLevelForRequestForm(org.parent, levels);
    return { ...parentResult, ...result };
  }

  async getAllMembers() {
    try {
      const members = await this.prisma.members.findMany();

      return members;
    } catch (error: any) {
      this.logger.error(error);
      throw new InternalServerErrorException('somethong went wrong');
    }
  }

  // The online card: the card in effect today. Also shown to whoever verifies a
  // QR code.
  getMember(user_id: number) {
    return this.findCard({
      where: { userId: user_id, ...inEffectToday() },
      orderBy: { start_date: 'desc' },
    });
  }

  // For admins: the user's latest card, valid or not, such as the one being
  // issued and printed.
  getLatestCard(user_id: number) {
    return this.findCard({
      where: { userId: user_id },
      orderBy: { member_id: 'desc' },
    });
  }

  private async findCard(
    args: Pick<Prisma.membersFindFirstArgs, 'where' | 'orderBy'>,
  ) {
    try {
      const member = await this.prisma.members.findFirst({
        ...args,
        select: CARD_SELECT,
      });

      if (!member) {
        throw new NotFoundException('not found member');
      }

      return member;
    } catch (error: any) {
      this.logger.error(error);
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async deactivateMember(user_id: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockUser(tx, user_id);
        const selectedMember = await latestCard(tx, user_id);

        if (!selectedMember) {
          throw new NotFoundException('member not found');
        }

        // A type 2 Old card may still be valid next to the new card, which is
        // not yet valid itself.
        const { count } = await tx.members.updateMany({
          where: { userId: user_id, is_active: true },
          data: { is_active: false },
        });
        if (count === 0) {
          throw new BadRequestException('member already inactivated');
        }
        return { ...selectedMember, is_active: false };
      });
    } catch (error: any) {
      this.logger.error(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async setQrPassword(user_id: number, password: string) {
    try {
      const selectedMember = await latestCard(this.prisma, user_id);

      if (!selectedMember) {
        throw new NotFoundException('member not found');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      return this.prisma.members.update({
        where: { member_id: selectedMember.member_id },
        data: { qrcode_pass: hashedPassword },
        omit: {
          qrcode_pass: true,
        },
      });
    } catch (err: any) {
      this.logger.error(err);
      if (err instanceof NotFoundException) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async getMemberByQrcode(qrcode_no: string) {
    try {
      const member = await this.prisma.members.findFirst({
        where: { qrcode: qrcode_no, ...inEffectToday() },
        orderBy: { start_date: 'desc' },
      });

      const current =
        member && (await latestStatusEntry(this.prisma, member.userId));
      if (!current || !cardVerifiesAt(current)) {
        throw new BadRequestException('cannot generate qr code');
      }

      return member;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async validateQrCode(qrcode: string, inputPassword: string) {
    try {
      const member = await this.prisma.members.findFirst({
        where: { qrcode: qrcode },
        orderBy: { member_id: 'desc' },
      });

      if (!member) {
        throw new NotFoundException('member not found');
      }

      if (await bcrypt.compare(inputPassword, member.qrcode_pass as string)) {
        const initToken = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();

        await this.prisma.members.update({
          where: { member_id: member.member_id },
          data: { qrcode_token: initToken },
        });

        await this.queue.add(
          'delete-qr-token',
          { id: member.member_id },
          { delay: 5 * 60 * 1000 },
        );

        return { token: initToken, user_id: member.userId };
      }

      throw new UnauthorizedException('qrcode or password incorrect');
    } catch (err) {
      console.log(err);
      if (
        err instanceof NotFoundException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async verifyToken(token: string) {
    try {
      const member = await this.prisma.members.findFirst({
        where: { qrcode_token: token },
      });

      if (!member) {
        throw new BadRequestException('qr code token not found');
      }

      return { token: member.qrcode_token, user_id: member.userId };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException();
    }
  }

  async transactionUpdateStartDate(
    user: number,
    start_date: string,
    approver: number,
  ) {
    try {
      return this.prisma.$transaction(async (tx) => {
        await lockUser(tx, user);
        const targetMember = await latestCard(tx, user);

        if (!targetMember) {
          throw new NotFoundException('member not found');
        }

        const current = await latestStatusEntry(tx, user);

        const isReady =
          current?.request_status === 8 || current?.request_status === 11;

        if (isReady) {
          const startDate = new Date(start_date);
          await assertApprovalDate(tx, user, current.request_type, startDate);

          const endDate: Date = new Date(start_date);
          endDate.setFullYear(startDate.getFullYear() + 5);
          endDate.setDate(endDate.getDate() - 1);

          await tx.members.update({
            where: { member_id: targetMember.member_id },
            data: { start_date: startDate, end_date: endDate },
          });

          const { entry } = await addStatusEntry(tx, {
            userId: user,
            status: current.request_status + 1,
            approver: approver,
          });
          return entry;
        } else {
          throw new BadRequestException('Error Setting start date see-logs');
        }
      });
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err);
    }
  }

  async transactionCreateMember(data: MemeberCreateDto, admin: number) {
    try {
      const { signature_method, ...rest } = data;
      if (!SIGNING_METHOD_STATUSES.includes(signature_method)) {
        throw new BadRequestException(
          `signature_method must be ${SIGNING_METHOD_STATUSES.join(' or ')}`,
        );
      }
      return await this.prisma.$transaction(async (tx) => {
        await lockUser(tx, data.userId);
        const current = await latestStatusEntry(tx, data.userId);
        if (current?.request_status !== 7) {
          throw new BadRequestException(
            'the signing method can be chosen only at request status 7',
          );
        }
        const initPassword = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();

        const initQRCode = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();

        const existedMember = await latestCard(tx, data.userId);

        await addStatusEntry(tx, {
          userId: data.userId,
          status: signature_method,
          approver: admin,
          from: current.request_status,
        });

        // A Revert keeps the card record, so passing step 7 again reuses it
        // (same Member Number and QR code) rather than adding a second one.
        if (existedMember) {
          return await tx.members.update({
            where: { member_id: existedMember.member_id },
            data: rest,
            select: { member_id: true },
          });
        }

        // member_no is left to its default, nextval of members_member_no_seq:
        // never shared by concurrent creations, never given out again after
        // a user is deleted. See .claude/skills/member-number.
        return await tx.members.create({
          data: {
            qrcode: initQRCode,
            qrcode_pass: initPassword,
            ...rest,
          },
          select: { member_id: true },
        });
      });
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }
}
