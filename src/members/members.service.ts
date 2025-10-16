import {
  BadRequestException,
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
// import { RequestService } from 'src/request/request.service';

interface OrganizationWithParent {
  id: number;
  name_th: string;
  level: OrgLevel;
  parent?: OrganizationWithParent | null;
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
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

  async getMember(user_id: number) {
    try {
      const member = await this.prisma.members.findFirst(
        Prisma.validator<Prisma.membersFindFirstArgs>()({
          where: { userId: user_id, is_active: true },
          orderBy: { end_date: 'desc' },
          include: {
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
                position_lv: true,
                photos: {
                  select: {
                    url: true,
                  },
                },
                organizationId: true,
                organization: {
                  include: {
                    parent: {
                      include: {
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
          },
        }),
      );

      if (!member) {
        throw new NotFoundException('not found member');
      }

      const flatOrg = this.pickLevelForRequestForm(member?.user.organization);
      const organization = await this.prisma.organizations.findFirst({
        where: {
          id: member.user.organizationId,
        },
        include: { signature: true, seal: true },
      });

      const data = {
        cid: member.user.cid,
        pname_th: member.user.pname_th,
        pname_other_th: member.user.pname_other_th,
        fname_th: member.user.fname_th,
        lname_th: member.user.lname_th,
        pname_en: member.user.pname_en,
        pname_other_en: member.user.pname_other_en,
        fname_en: member.user.fname_en,
        lname_en: member.user.lname_en,
        blood: member.user.blood,
        position: member.user.position?.position_name,
        position_lv: member.user.position_lv?.position_lv_name,
        photo: member.user.photos[0].url,
        seal: organization?.seal.url,
        department: flatOrg?.DEPARTMENT,
        province_org: flatOrg?.PROVINCE,
        member_no: member.member_no,
        start_date: member.start_date,
        end_date: member.end_date,
        signature_name: organization?.signature.sign_person_name,
        signature_lname: organization?.signature.sign_person_lname,
        signature_pname: organization?.signature.sign_person_pname,
        signature_file: organization?.signature.url,
        signature_position: organization?.signature.sign_person_position,
      };

      return data;
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
      const selectedMember = await this.prisma.members.findFirst({
        where: { userId: user_id },
        orderBy: { start_date: 'desc' },
        select: { member_id: true, is_active: true },
      });

      if (!selectedMember) {
        throw new NotFoundException('member not found');
      }

      const isInactive = selectedMember.is_active === false;

      if (!isInactive) {
        return this.prisma.members.update({
          where: { member_id: selectedMember.member_id },
          data: {
            is_active: false,
          },
        });
      } else {
        throw new BadRequestException('member already inactivated');
      }
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
      const selectedMember = await this.prisma.members.findFirst({
        where: { userId: user_id },
        orderBy: { start_date: 'desc' },
        select: { member_id: true, is_active: true, qrcode_pass: true },
      });

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

  // async getMemberByQrcode(qrcode_no: string) {
  //   try {
  //     return this.prisma.members.findFirst({
  //       where: { qrcode: qrcode_no },
  //       select: { user: true },
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException('something went wrong');
  //   }
  // }

  async validateQrCode(qrcode: string, inputPassword: string) {
    try {
      const member = await this.prisma.members.findFirst({
        where: { qrcode: qrcode },
      });

      if (!member) {
        throw new NotFoundException('member not found');
      }

      if (await bcrypt.compare(inputPassword, member.qrcode_pass as string)) {
        return await this.getMember(member.userId);
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

  async transactionUpdateStartDate(
    user: number,
    start_date: string,
    approver: number,
  ) {
    try {
      return this.prisma.$transaction(async (tx) => {
        // console.log(user);
        const targetMember = await tx.members.findFirst({
          where: { userId: user },
          orderBy: { create_date: 'desc' },
          select: { member_id: true },
        });

        if (!targetMember) {
          throw new NotFoundException('member not found');
        }

        const startDate = new Date(start_date);
        const endDate: Date = new Date(start_date);
        endDate.setFullYear(startDate.getFullYear() + 5);
        endDate.setDate(endDate.getDate() - 1);

        await tx.members.update({
          where: { member_id: targetMember.member_id },
          data: { start_date: startDate, end_date: endDate },
        });

        const current = await tx.requests.findFirst({
          where: { userId: user },
          orderBy: { date_update: 'desc' },
        });

        const isReady =
          current?.request_status === 8 || current?.request_status === 11;

        if (isReady) {
          return await tx.requests.create({
            data: {
              userId: user,
              request_type: 1,
              request_status: current.request_status + 1,
              approver: approver,
            },
          });
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
      return this.prisma.$transaction(async (tx) => {
        const initPassword = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();

        const initQRCode = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();

        const existedMember = await tx.members.findFirst({
          where: { userId: data.userId },
        });

        const latestMember = await tx.members.findFirst({
          orderBy: { member_no: 'desc' },
        });

        let nextMemberNo: number;
        if (!latestMember) {
          nextMemberNo = 1;
        } else if (existedMember) {
          nextMemberNo = existedMember.member_no as number;
        } else {
          nextMemberNo = (latestMember.member_no as number) + 1;
        }

        await tx.requests.create({
          data: {
            request_type: 1,
            approver: admin,
            request_status: signature_method,
            userId: data.userId,
          },
        });

        return await tx.members.create({
          data: {
            member_no: nextMemberNo,
            qrcode: initQRCode,
            qrcode_pass: initPassword,
            ...rest,
          },
          select: { member_id: true },
        });
      });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }
}
