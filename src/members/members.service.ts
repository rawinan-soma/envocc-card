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

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}
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
      const member = await this.prisma.members.findFirst({
        where: { user: user_id, is_active: true },
        orderBy: { end_date: 'desc' },
        include: {
          users: {
            select: {
              username: true,
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
              epositions: {
                select: {
                  eposition_id: true,
                  eposition_name_th: true,
                },
              },
              userInst: {
                select: {
                  institutions: {
                    select: {
                      departments: {
                        select: {
                          id: true,
                          name_eng: true,
                          name_th: true,
                          seals: {
                            select: {
                              url: true,
                              filename: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              // institutions: {
              //   select: {
              //     departments: {
              //       select: {
              //         department_id: true,
              //         department_name_th: true,
              //         department_name_eng: true,
              //       },
              //     },
              //     seals: {
              //       select: {
              //         url: true,
              //         filename: true,
              //       },
              //     },
              //   },
              // },
            },
          },
          sign_persons: {
            select: {
              filename: true,
              sign_person_pname: true,
              sign_person_name: true,
              sign_person_lname: true,
              position: true,
            },
          },
        },
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
      const selectedMember = await this.prisma.members.findFirst({
        where: { user: user_id },
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
        where: { user: user_id },
        orderBy: { start_date: 'desc' },
        select: { member_id: true, is_active: true, qrcode_pass: true },
      });

      if (!selectedMember) {
        throw new NotFoundException('member not found');
      }

      return this.prisma.members.update({
        where: { member_id: selectedMember.member_id },
        data: { qrcode_pass: password },
        omit: {
          qrcode_pass: true,
        },
      });
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

  async getMemberByQrcode(qrcode_no: string) {
    try {
      return this.prisma.members.findFirst({
        where: { qrcode: qrcode_no },
        select: { user: true },
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async validateQrCode(qrcode: string, inputPassword: string) {
    try {
      const member = await this.prisma.members.findFirst({
        where: { qrcode: qrcode },
      });

      if (!member) {
        return new NotFoundException('member not found');
      }

      if (member.qrcode_pass !== inputPassword) {
        throw new UnauthorizedException('password incorrect');
      }

      const fileName = await this.filesService.getFileByUserId(
        'envcard',
        member.user,
      );

      return fileName;
    } catch (error) {
      console.log(error);
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
        console.log(user);
        const targetMember = await tx.members.findFirst({
          where: { user: user },
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
          where: { user: user },
          orderBy: { date_update: 'desc' },
        });

        const isReady =
          current?.request_status === 8 || current?.request_status === 11;

        if (isReady) {
          return await tx.requests.create({
            data: {
              user: user,
              request_type: 1,
              request_status: current.request_status + 1,
              approver: approver,
            },
          });
        } else {
          throw new BadRequestException('Error Setting start date see-logs');
        }
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error);
    }
  }

  async transactionCreateMember(data: MemeberCreateDto) {
    try {
      return this.prisma.$transaction(async (tx) => {
        const initPassword = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();

        const initQRCode = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();

        const existedMember = await tx.members.findFirst({
          where: { user: data.user },
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

        return await tx.members.create({
          data: {
            member_no: nextMemberNo,
            qrcode: initQRCode,
            qrcode_pass: initPassword,
            ...data,
          },
          select: { member_id: true },
        });
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }
}
