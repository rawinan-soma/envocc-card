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

        // adminLevelFilter.institutions.province  = (
        //   await this.prismaService.institutions.findUnique({
        //     where: { institution_id: queryData.adminInst },
        //     select: { province: true },
        //   })
        // ).province;
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

        // adminLevelFilter.institutions.health_region = (
        //   await this.prismaService.institutions.findUnique({
        //     where: { institution_id: queryData.adminInst },
        //     select: { health_region: true },
        //   })
        // ).health_region;
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

        // adminLevelFilter.institutions.department = (
        //   await this.prismaService.institutions.findUnique({
        //     where: { institution_id: queryData.adminInst },
        //     select: { department: true },
        //   })
        // ).department;
      } else {
        throw new BadRequestException('invalid query');
      }

      const limit = 10;
      const offset = (queryData.page - 1) * limit;

      const users = await this.prisma.users.findMany({
        skip: offset,
        take: limit,
        orderBy: { members: { end_date: 'desc' } },
        select: {
          id: true,
          pname_th: true,
          pname_other_th: true,
          fname_th: true,
          lname_th: true,
          institutions: {
            select: {
              institution_name_th: true,
              departments: {
                select: {
                  department_name_th: true,
                  ministries: { select: { ministry_name_th: true } },
                },
              },
            },
          },
          members: { select: { start_date: true, end_date: true } },
          requests: { select: { request_status: true } },
        },
        where: adminLevelFilter,
        // where: {
        //   institutions: {},
        //   requests: { some: { request_status: { in: filtered } } },
        //   OR: [
        //     { fname_th: { startsWith: queryData.fname_th } },
        //     { lname_th: `%${queryData.lname_th}%` },
        //     {
        //       institutions: {
        //         institution_name_th: `%${queryData.institution_name}%`,
        //       },
        //     },
        //   ],
        // },
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
                  sign_persons: true,
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
              photo: true,
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

      if (!user) {
        return new NotFoundException('user did not exist');
      }

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
          experience: true,
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
}
