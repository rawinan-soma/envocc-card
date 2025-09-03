/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';
import { UserUpdateDto } from './dto/user-update.dto';
import { StatusCreateDto } from 'src/request/dto/status-create.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(id: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: id },
        omit: { password: true },
      });

      if (!user) {
        throw new NotFoundException('user not found');
      }
    } catch (error) {
      this.logger.error(error);
      if (error instanceof NotFoundException) {
        return error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }
  async getAllUsers(queryData: {
    page: number;
    status: string;
    adminLevel: number;
    adminInst: number;
    fname_th?: string;
    lname_th?: string;
    institution_name?: string;
  }) {
    try {
      let filtered: number[];
      if (queryData.status === 'ongoing') {
        filtered = [0, 1, 2, 3, 4, 5, 6, 7];
      } else if (queryData.status === 'activated') {
        filtered = [8, 9, 10, 11, 12, 13, 14, 15];
      } else if (queryData.status === 'suspended') {
        filtered = [16];
      } else {
        throw new BadRequestException('Invalid Status query');
      }

      const adminLevelFilter: Prisma.usersWhereInput = {
        requests: { some: { request_status: { in: filtered } } },
        OR: [
          { fname_th: { startsWith: queryData.fname_th } },
          { lname_th: { contains: queryData.lname_th } },
          {
            institutions: {
              institution_name_th: { contains: queryData.institution_name },
            },
          },
        ],
      };

      if (queryData.adminLevel === 4) {
        adminLevelFilter.institution = queryData.adminInst;
      } else if (queryData.adminLevel === 3) {
        const province = await this.prisma.institutions.findUnique({
          where: { institution_id: queryData.adminInst },
          select: { province: true },
        });
        if (province?.province) {
          adminLevelFilter.institutions = {
            province: province.province,
          };
        }
      } else if (queryData.adminLevel === 5) {
        const healthRegion = await this.prisma.institutions.findUnique({
          where: { institution_id: queryData.adminInst },
          select: { health_region: true },
        });

        if (healthRegion?.health_region) {
          adminLevelFilter.institutions = {
            health_region: healthRegion.health_region,
          };
        }
      } else if (queryData.adminLevel === 2) {
        const department = await this.prisma.institutions.findUnique({
          where: { institution_id: queryData.adminInst },
          select: { department: true },
        });

        if (department?.department) {
          adminLevelFilter.institutions = {
            department: department.department,
          };
        }
      } else {
        throw new BadRequestException('invalid query');
      }

      const limit = 10;
      const offset = (queryData.page - 1) * limit;

      const allUserList: number[] = [];
      const allUser = await this.prisma.requests.findMany({
        select: { user: true },
        distinct: ['user'],
      });

      let users: any[] = [];

      allUser.forEach((item) => {
        if (item.user) {
          allUserList.push(item.user);
        }
      });

      for (let index = 0; index < allUserList.length; index++) {
        const user = await this.prisma.users.findFirst({
          skip: offset,
          take: limit,
          select: {
            id: true,
            cid: true,
            pname_th: true,
            pname_other_th: true,
            fname_th: true,
            lname_th: true,
            institutions: {
              select: {
                institution_name_th: true,
                sign_persons: { select: { id: true } },
                departments: {
                  select: {
                    department_name_th: true,
                    ministries: { select: { ministry_name_th: true } },
                  },
                },
              },
            },
            members: {
              select: { start_date: true, end_date: true },
              orderBy: { end_date: 'desc' },
              take: 1,
            },
            requests: {
              select: { request_status: true },
              orderBy: { date_update: 'desc' },
              take: 1,
            },
            positions: { select: { position_name: true } },
            position_lvs: { select: { position_lv_name: true } },
          },
          // where: { id: allUserList[index] },
          where: { AND: [{ id: allUserList[index] }, adminLevelFilter] },
        });
        if (!user) {
          continue;
        }
        if (user) {
          users.push(user);
        }
      }

      try {
        users = users.filter((item) =>
          filtered.includes(item.requests[0].request_status),
        );
      } catch (error) {
        console.log(error);
        users = [];
      }

      const totalItems = await this.prisma.users.count();
      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: users,
        pageData: {
          totalItems: totalItems,
          totalPages: totalPages,
          currentPage: queryData.page,
          limit: limit,
        },
      };
    } catch (error: any) {
      this.logger.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async getUserPrintForm(id: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: id },
        include: {
          members: {
            orderBy: { create_date: 'desc' },
            select: { start_date: true, end_date: true, member_no: true },
            take: 1,
          },
          epositions: true,
          positions: {
            select: {
              position_id: true,
              position_name: true,
              position_name_eng: true,
            },
          },
          institutions: {
            select: {
              institution_name_th: true,
              institution_name_eng: true,
              seals: { select: { url: true } },
              sign_persons: {
                select: {
                  sign_person_pname: true,
                  sign_person_name: true,
                  sign_person_lname: true,
                  url: true,
                  position: true,
                },
              },
              departments: {
                select: {
                  department_name_th: true,
                  department_name_eng: true,
                  ministries: {
                    select: {
                      ministry_name_th: true,
                      ministry_name_eng: true,
                    },
                  },
                },
              },
            },
          },
          position_lvs: {
            select: {
              position_lv_id: true,
              position_lv_name: true,
              position_lv_name_eng: true,
            },
          },
          photos: {
            select: {
              url: true,
            },
          },
        },
        omit: {
          password: true,
          institution: true,
          position: true,
          position_lv: true,
        },
      });
      return user;
    } catch (error) {
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

  async getUserPrintExpForm(id: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: id },
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
          experiences: true,
        },
      });

      if (!user) {
        throw new NotFoundException('user not found');
      }

      return user;
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

  async updateUser(id: number, data: UserUpdateDto) {
    try {
      const user = await this.prisma.users.findUnique({ where: { id: id } });

      if (!user) {
        throw new NotFoundException('user not found');
      }

      // const filteredData = Object.fromEntries(
      //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
      //   Object.entries(data).filter(([_, value]) => value !== undefined),
      // );

      return await this.prisma.users.update({
        where: { id: id },
        data: data as Prisma.usersUpdateInput,
      });
    } catch (error) {
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

  async deleteUserById(id: number) {
    try {
      const existedUser = await this.prisma.users.findUnique({
        where: { id: id },
      });

      if (!existedUser) {
        throw new NotFoundException(`user not found`);
      }

      return await this.prisma.users.delete({
        where: { id: id },
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

  async validateUser(id: number, approver: number) {
    try {
      return this.prisma.$transaction(async (tx) => {
        const existedUser = await tx.users.findUnique({
          where: { id: id },
        });

        if (!existedUser) {
          throw new NotFoundException(`user not found`);
        }

        if (existedUser.is_validate === true) {
          throw new BadRequestException(`user already activated`);
        }

        await tx.users.update({
          where: { id: id },
          data: { is_validate: true },
        });

        const currentStatus = await tx.requests.findFirst({
          where: { user: id },
          orderBy: { date_update: 'desc' },
        });

        if (!currentStatus) {
          throw new BadRequestException('bad request by user');
        }

        if (
          currentStatus.request_status !== 0 &&
          currentStatus.request_status === 1
        ) {
          throw new BadRequestException('user cannot re-activated');
        }

        const data: StatusCreateDto = {
          user: id,
          next_status: 1,
          request_type: 1,
          current_status: 0,
        };

        return await tx.requests.create({
          data: {
            user: data.user,
            request_status: data.next_status,
            request_type: data.request_type,
            approver: approver,
          },
          select: {
            user: true,
            req_id: true,
            request_status: true,
          },
        });
      });
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async invalidateUser(id: number) {
    try {
      const existedUser = await this.prisma.users.findUnique({
        where: { id: id },
      });

      if (!existedUser) {
        throw new NotFoundException('user not found');
      }

      if (existedUser.is_validate === false) {
        throw new BadRequestException('user not yet validated');
      }

      return await this.prisma.users.update({
        where: { id: id },
        data: { is_validate: false },
      });
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  // private async transactionDeleteUser(
  //   tx: Prisma.TransactionClient,
  //   id: number,
  // ) {
  //   const existedUser = await tx.users.findUnique({
  //     where: { id: id },
  //   });

  //   if (!existedUser) {
  //     throw new NotFoundException(`user not found`);
  //   }

  //   await tx.users.delete({
  //     where: { id: id },
  //   });
  // }

  // async deleteUserAndRequest(id: number) {
  //   try {
  //     await this.prisma.$transaction(async (tx) => {
  //       await this.request.transactionDeleteRequest(tx, id);
  //       await this.transactionDeleteUser(tx, id);
  //     });
  //   } catch (error: any) {
  //     this.logger.error(error);
  //   }
  // }
}
