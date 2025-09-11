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
import { FilesService } from 'src/files/files.service';
import { FileCreateDto } from 'src/files/dto/file-create.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

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
        throw error;
      } else if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }
  // TODO: แก้ admin level -> เป็น string, เพิ่ม adminDep query

  async getAllUsers(queryData: {
    page: number;
    status: string;
    adminLevel?: string;
    adminDep?: number;
    adminInst?: number;
    search_term?: string;
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

      let adminLevelFilter: Prisma.usersWhereInput = {
        requests: { some: { request_status: { in: filtered } } },
        OR: [
          { fname_th: { contains: queryData.search_term } },
          { lname_th: { contains: queryData.search_term } },
          {
            userInst: {
              institutions: {
                name_th: { contains: queryData.search_term },
              },
            },
            userDep: {
              departments: {
                name_th: { contains: queryData.search_term },
              },
            },
          },
        ],
      };

      if (!queryData.adminDep && !queryData.adminInst) {
        throw new BadRequestException('invalid query');
      }

      if (
        queryData.adminInst &&
        adminLevelFilter.userInst &&
        !queryData.adminDep
      ) {
        adminLevelFilter.userInst.institution = queryData.adminInst;
      } else {
        throw new BadRequestException('invalid institution query');
      }

      if (queryData.adminDep && !queryData.adminInst) {
        // adminLevelFilter.userDep.department = queryData.adminDep;
        switch (queryData.adminLevel) {
          case 'provincial': {
            adminLevelFilter = {
              ...adminLevelFilter,
              OR: [
                { userDep: { department: queryData.adminDep } },
                {
                  userInst: {
                    institutions: { department: queryData.adminDep },
                  },
                },
              ],
            };
            break;
          }
          case 'regional': {
            const region = await this.prisma.institutions.findFirst({
              where: { department: queryData.adminDep },
              select: { health_region: true },
            });
            adminLevelFilter = {
              ...adminLevelFilter,
              OR: [
                { userDep: { department: queryData.adminDep } },
                {
                  userInst: {
                    institutions: {
                      health_region: region?.health_region,
                    },
                  },
                },
              ],
            };
            break;
          }
          case 'national': {
            adminLevelFilter = { ...adminLevelFilter };
          }
        }
      } else {
        throw new BadRequestException('invalid department query');
      }

      const limit = 10;
      const offset = (queryData.page - 1) * limit;

      const users = await this.prisma.users.findMany({
        skip: offset,
        take: limit,
        select: {
          id: true,
          cid: true,
          pname_th: true,
          pname_other_th: true,
          fname_th: true,
          lname_th: true,
          userInst: {
            select: {
              institutions: {
                select: {
                  name_th: true,
                  departments: {
                    select: {
                      name_th: true,
                      sign_persons: { select: { id: true } },
                      ministries: { select: { name_th: true } },
                    },
                  },
                },
              },
            },
          },
          members: {
            select: { start_date: true, end_date: true },
            orderBy: { end_date: 'desc' },
          },
          requests: {
            select: {
              request_status: true,
            },
            orderBy: { date_update: 'desc' },
          },
          positions: { select: { position_name: true } },
          position_lvs: { select: { position_lv_name: true } },
        },
        where: adminLevelFilter,
        orderBy: { id: 'asc' },
      });

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
          userInst: {
            select: {
              institutions: {
                select: {
                  name_th: true,
                  name_eng: true,
                  departments: {
                    select: {
                      name_th: true,
                      name_eng: true,
                      seals: { select: { url: true } },
                      ministries: { select: { name_eng: true, name_th: true } },
                      sign_persons: {
                        select: {
                          sign_person_pname: true,
                          sign_person_name: true,
                          sign_person_lname: true,
                          position: true,
                          url: true,
                        },
                      },
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

  async txUploadFileandUpdateRequest(
    expFilesDto: FileCreateDto,
    govcardDto: FileCreateDto,
    reqFileDto: FileCreateDto,
    user: number,
    // requestUpdate: RequestCreateDto
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.filesService.txUploadFileForUser('expfile', expFilesDto, tx);
        await this.filesService.txUploadFileForUser('govcard', govcardDto, tx);
        await this.filesService.txUploadFileForUser('reqFile', reqFileDto, tx);
        await tx.requests.create({
          data: { user: user, request_type: 1, request_status: 4 },
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
