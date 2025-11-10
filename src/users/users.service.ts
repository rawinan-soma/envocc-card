/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrgLevel, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';
import { UserUpdateDto } from './dto/user-update.dto';
import { StatusCreateDto } from 'src/request/dto/status-create.dto';
import { FilesService } from 'src/files/files.service';
import { FileCreateDto } from 'src/files/dto/file-create.dto';

interface OrganizationWithParent {
  id: number;
  name_th: string;
  level: OrgLevel;
  parent?: OrganizationWithParent | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  private async getChildIds(orgId: number): Promise<number[]> {
    const parent = await this.prisma.organizations.findUnique({
      where: { id: orgId },
      include: { children: true },
    });

    if (!parent) return [];

    let ids: number[] = [parent.id];
    for (const child of parent.children) {
      const childIds = await this.getChildIds(child.id);
      ids = ids.concat(childIds);
    }

    return ids;
  }

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

  async getUserById(id: number) {
    try {
      const user = await this.prisma.users.findUnique(
        Prisma.validator<Prisma.usersFindUniqueArgs>()({
          where: { id: id },
          select: {
            id: true,
            username: true,
            organization: true,
            position: true,
          },
        }),
      );

      if (!user) {
        throw new NotFoundException('user not found');
      }
      return {
        id: user.id,
        username: user.username,
        org: user.organization.id,
        level: user.organization.level,
        executive: user.position?.orgId ? 'executive' : 'non-executive',
      };
    } catch (err) {
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

  async getAllUsers(queryData: {
    page: number;
    status: string;
    adminId: number;
    orgId: number;
    search_term?: string;
  }) {
    try {
      let filtered: number[];
      if (queryData.status === 'ongoing') {
        filtered = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      } else if (queryData.status === 'activated') {
        filtered = [15];
      } else if (queryData.status === 'suspended') {
        filtered = [16];
      } else {
        throw new BadRequestException('Invalid Status query');
      }

      const ids = await this.getChildIds(queryData.orgId);

      const adminLevelFilter = {
        requests: {
          some: { request_status: { in: filtered } },
          // none: { request_status: { notIn: filtered } },
        },
        organizationId: { in: ids },
        OR: [
          { fname_th: { contains: queryData.search_term } },
          { lname_th: { contains: queryData.search_term } },
          { organization: { name_th: { contains: queryData.search_term } } },
        ],
      };

      const limit = 10;
      const offset = (queryData.page - 1) * limit;

      const users = await this.prisma.users.findMany(
        Prisma.validator<Prisma.usersFindManyArgs>()({
          select: {
            id: true,
            pname_th: true,
            pname_other_th: true,
            fname_th: true,
            lname_th: true,
            organization: {
              select: {
                id: true,
                level: true,
                name_th: true,
                parent: {
                  select: {
                    id: true,
                    level: true,
                    name_th: true,
                    parent: {
                      select: {
                        id: true,
                        level: true,
                        name_th: true,
                        parent: {
                          select: {
                            id: true,
                            level: true,
                            name_th: true,
                            parent: {
                              select: {
                                id: true,
                                level: true,
                                name_th: true,
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
            members: {
              select: { start_date: true, end_date: true },
              orderBy: { end_date: 'desc' },
            },
            requests: {
              select: {
                request_status: true,
              },
              orderBy: { date_update: 'desc' },
              // where: { request_status: { in: filtered } },
              take: 1,
            },
            position: { select: { position_name: true } },
            position_lv: { select: { position_lv_name: true } },
          },
          where: adminLevelFilter,
          orderBy: { id: 'asc' },
        }),
      );

      const data = users.map((user) => {
        const flatOrg = this.pickLevelForRequestForm(
          user?.organization ?? undefined,
        );

        return {
          ...user,
          requests: undefined,
          organization: undefined,
          start_date: user.members[0]?.start_date,
          end_date: user.members[0]?.end_date,
          request_status: user.requests[0].request_status,
          position: user.position?.position_name,
          position_lv: user.position_lv?.position_lv_name,
          unit: flatOrg?.UNIT ?? null,
          department: flatOrg?.DEPARTMENT ?? null,
          ministry: flatOrg?.MINISTRY ?? null,
        };
      });

      const filteredData = data.filter((d) =>
        filtered.includes(d.request_status),
      );

      const totalItems = filteredData.length;
      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: filteredData.slice(offset, offset + limit),
        pageData: {
          totalItems: totalItems,
          totalPages: totalPages,
          currentPage: queryData.page,
          limit: limit,
        },
      };
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

  async getUserRequestForm(id: number) {
    try {
      const user = await this.prisma.users.findUnique(
        Prisma.validator<Prisma.usersFindUniqueArgs>()({
          where: { id: id },
          include: {
            position: {
              select: {
                position_id: true,
                position_name: true,
                position_name_eng: true,
              },
            },
            position_lv: {
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
              orderBy: { create_date: 'desc' },
            },

            organization: {
              select: {
                id: true,
                level: true,
                name_th: true,
                name_eng: true,
                parent: {
                  select: {
                    id: true,
                    level: true,
                    name_th: true,
                    name_eng: true,
                    parent: {
                      select: {
                        id: true,
                        level: true,
                        name_th: true,
                        name_eng: true,
                        parent: {
                          select: {
                            id: true,
                            level: true,
                            name_th: true,
                            name_eng: true,
                            parent: {
                              select: {
                                id: true,
                                level: true,
                                name_th: true,
                                name_eng: true,
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
          omit: {
            password: true,
            positionId: true,
            position_lvId: true,
          },
        }),
      );

      const flatOrg = this.pickLevelForRequestForm(user?.organization);
      const unit = await this.prisma.organizations.findUnique(
        Prisma.validator<Prisma.organizationsFindUniqueArgs>()({
          where: {
            id: user!.organizationId,
          },
          include: {
            signature: {
              select: {
                sign_person_position: true,
              },
            },
          },
        }),
      );

      let department: any;
      let province: any;
      let region: any;
      let ministry: any;

      if (flatOrg?.DEPARTMENT) {
        department = await this.prisma.organizations.findFirst({
          where: { name_th: flatOrg?.DEPARTMENT },
        });
      }

      if (flatOrg?.PROVINCE) {
        province = await this.prisma.organizations.findFirst({
          where: { name_th: flatOrg?.PROVINCE },
        });
      }

      if (flatOrg?.MINISTRY) {
        ministry = await this.prisma.organizations.findFirst({
          where: { name_th: flatOrg?.MINISTRY },
        });
      }

      const data = {
        ...user,
        position: undefined,
        position_lv: undefined,
        position_name_th: user?.position?.position_name,
        position_name_eng: user?.position?.position_name_eng,
        position_level_name_th: user?.position_lv?.position_lv_name,
        position_level_name_eng: user?.position_lv?.position_lv_name_eng,
        photo_url: user?.photos[0]?.url,
        unit_en: unit?.name_eng,
        unit: unit?.name_th,
        province: province?.name_th,
        province_en: province?.name_eng,
        region: region?.name_th,
        region_en: region?.name_eng,
        department: department?.name_th,
        department_en: department?.name_eng,
        ministry: ministry?.name_th,
        ministry_en: ministry?.name_eng,
        signature_position: unit?.signature.sign_person_position,
      };

      return data;
    } catch (err) {
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
    } catch (err) {
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
          where: { userId: id },
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
            userId: data.user,
            request_status: data.next_status,
            request_type: data.request_type,
            approver: approver,
          },
          select: {
            id: true,
            request_status: true,
          },
        });
      });
    } catch (err) {
      this.logger.error(err);
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
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
    } catch (err) {
      this.logger.error(err);
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      } else if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      } else {
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }

  async txUploadFileandUpdateRequest(
    govcardDto: FileCreateDto,
    reqFileDto: FileCreateDto,
    user: number,
    expFilesDto?: FileCreateDto,
    // requestUpdate: RequestCreateDto
  ) {
    try {
      if (expFilesDto) {
        await this.prisma.$transaction(async (tx) => {
          await this.filesService.txUploadFileForUser(
            'expfile',
            expFilesDto,
            tx,
          );
          await this.filesService.txUploadFileForUser(
            'govcard',
            govcardDto,
            tx,
          );
          await this.filesService.txUploadFileForUser(
            'reqFile',
            reqFileDto,
            tx,
          );
          await tx.requests.create({
            data: { userId: user, request_type: 1, request_status: 4 },
          });
        });
      } else {
        await this.prisma.$transaction(async (tx) => {
          await this.filesService.txUploadFileForUser(
            'govcard',
            govcardDto,
            tx,
          );
          await this.filesService.txUploadFileForUser(
            'reqFile',
            reqFileDto,
            tx,
          );

          await tx.requests.create({
            data: { userId: user, request_type: 1, request_status: 4 },
          });
        });
      }
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }
}
