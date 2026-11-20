import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrgLevel, organizations, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';
import { UserUpdateDto, UserUpdateInternalDto } from './dto/user-update.dto';
import {
  addStatusEntry,
  latestStatusEntry,
  lockUser,
} from 'src/request/status-history';
import { editPersonalData, toUserUpdate } from './edit-personal-data';
import { expYears } from 'src/experiences/exp-years';
import { REQUEST_TYPES, USER_STARTED_TYPES } from 'src/request/request-types';
import { FilesService } from 'src/files/files.service';
import { startNewCard } from 'src/members/cards';

interface UsersPageQuery {
  page: number;
  search_term?: string;
  request_type?: number;
}

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
    levels: string[] = ['UNIT', 'PROVINCE', 'DEPARTMENT', 'MINISTRY', 'REGION'],
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

  private latestRequestType(requests: { request_type: number }[]) {
    const type = requests[0]?.request_type ?? null;
    return {
      request_type: type,
      request_type_name:
        type === null ? null : (REQUEST_TYPES[type]?.name ?? null),
    };
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

  async getAllUsers(
    queryData: UsersPageQuery & {
      status: string;
      adminId: number;
      orgId: number;
    },
  ) {
    let statuses: number[];
    if (queryData.status === 'ongoing') {
      statuses = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    } else if (queryData.status === 'activated') {
      statuses = [15];
    } else if (queryData.status === 'suspended') {
      statuses = [16];
    } else {
      throw new BadRequestException('Invalid Status query');
    }

    return await this.getUsersPage({
      page: queryData.page,
      search_term: queryData.search_term,
      request_type: queryData.request_type,
      statuses,
      orgId: queryData.orgId,
    });
  }

  // Every user at every request status, across every organization.
  async getAllUsersUnfiltered(queryData: UsersPageQuery) {
    return await this.getUsersPage({ ...queryData, includeUsername: true });
  }

  private async getUsersPage(
    queryData: UsersPageQuery & {
      statuses?: number[];
      orgId?: number;
      includeUsername?: boolean;
    },
  ) {
    try {
      const { statuses, request_type, orgId } = queryData;

      const where: Prisma.usersWhereInput = {
        OR: [
          { fname_th: { contains: queryData.search_term } },
          { lname_th: { contains: queryData.search_term } },
          { organization: { name_th: { contains: queryData.search_term } } },
        ],
      };
      // Narrows to users with any matching entry; only their latest entry
      // counts, so the rows are filtered again below.
      const anyEntry: Prisma.requestsWhereInput = {};
      if (statuses) {
        anyEntry.request_status = { in: statuses };
      }
      if (request_type !== undefined) {
        anyEntry.request_type = request_type;
      }
      if (statuses || request_type !== undefined) {
        where.requests = { some: anyEntry };
      }
      if (orgId !== undefined) {
        where.organizationId = { in: await this.getChildIds(orgId) };
      }

      const limit = 10;
      const offset = (queryData.page - 1) * limit;

      const users = await this.prisma.users.findMany(
        Prisma.validator<Prisma.usersFindManyArgs>()({
          select: {
            id: true,
            username: queryData.includeUsername,
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
              orderBy: { end_date: { sort: 'desc', nulls: 'last' } },
            },
            requests: {
              select: {
                request_status: true,
                request_type: true,
              },
              orderBy: { date_update: 'desc' },
              take: 1,
            },
            position: { select: { position_name: true } },
            position_lv: { select: { position_lv_name: true } },
          },
          where,
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
          request_status: user.requests[0]?.request_status ?? null,
          ...this.latestRequestType(user.requests),
          position: user.position?.position_name,
          position_lv: user.position_lv?.position_lv_name,
          unit:
            flatOrg?.UNIT ??
            flatOrg?.PROVINCE ??
            flatOrg?.REGION ??
            flatOrg?.DEPARTMENT,
          department: flatOrg?.DEPARTMENT ?? null,
          ministry: flatOrg?.MINISTRY ?? null,
        };
      });

      const filteredData = data.filter(
        (d) =>
          (!statuses ||
            (d.request_status !== null &&
              statuses.includes(d.request_status))) &&
          (request_type === undefined || d.request_type === request_type),
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
            experiences: true,
            requests: {
              select: {
                request_type: true,
              },
              orderBy: { date_update: 'desc' },
              take: 1,
            },
          },
          omit: {
            password: true,
            positionId: true,
            position_lvId: true,
          },
        }),
      );

      if (!user) {
        throw new NotFoundException('user not found');
      }

      const flatOrg = this.pickLevelForRequestForm(user.organization);
      const unit = await this.prisma.organizations.findUnique(
        Prisma.validator<Prisma.organizationsFindUniqueArgs>()({
          where: {
            id: user.organizationId,
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

      let department: organizations | null | undefined;
      let province: organizations | null | undefined;
      let region: organizations | null | undefined;
      let ministry: organizations | null | undefined;

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
        requests: undefined,
        ...this.latestRequestType(user.requests),
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
          is_validate: true,
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

  async updateUser(id: number, data: UserUpdateInternalDto) {
    try {
      return await editPersonalData(this.prisma, id, async (tx) =>
        tx.users.update({
          where: { id: id },
          data: await toUserUpdate(tx, data),
        }),
      );
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
        await lockUser(tx, id);
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

        const currentStatus = await latestStatusEntry(tx, id);

        if (!currentStatus) {
          throw new BadRequestException('bad request by user');
        }

        if (
          currentStatus.request_status !== 0 &&
          currentStatus.request_status === 1
        ) {
          throw new BadRequestException('user cannot re-activated');
        }

        const { entry } = await addStatusEntry(tx, {
          userId: id,
          status: 1,
          approver: approver,
          from: currentStatus.request_status,
        });
        return { id: entry.id, request_status: entry.request_status };
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

  async createNewCardRequest(
    userId: number,
    data: UserUpdateDto,
    requestType: number,
  ) {
    const type = REQUEST_TYPES[requestType];
    const startsFrom = type?.userStartsFrom;
    if (!startsFrom) {
      throw new BadRequestException(
        `requestType must be one of ${USER_STARTED_TYPES.join(', ')}`,
      );
    }
    const sentAgain = type.oldCardStaysValid
      ? (['govcard', 'policeReport'] as const)
      : (['govcard', 'policeReport', 'photo'] as const);
    let deleted: string[];
    try {
      deleted = await this.prisma.$transaction(async (tx) => {
        if ((await lockUser(tx, userId)).length === 0) {
          throw new NotFoundException('user not found');
        }
        const current = await latestStatusEntry(tx, userId);
        if (!current || !startsFrom.includes(current.request_status)) {
          throw new ForbiddenException(
            `a new card can be requested only at request status ${startsFrom.join(' or ')}`,
          );
        }

        await startNewCard(tx, userId, requestType, current.request_status);

        await tx.users.update({
          where: { id: userId },
          data: {
            ...(await toUserUpdate(tx, data.user ?? {})),
            experiences: data.experiences && {
              createMany: {
                data: data.experiences.map((exp) => ({
                  ...exp,
                  exp_years: expYears(exp.exp_fdate, exp.exp_ldate),
                })),
              },
            },
          },
        });

        await addStatusEntry(tx, {
          userId,
          status: 1,
          requestType,
          from: current.request_status,
        });

        return this.filesService.txDeleteFilesForUser(sentAgain, userId, tx);
      });
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('bad request by user');
      }
      this.logger.error(err);
      throw new InternalServerErrorException('failed to create request');
    }

    await this.filesService.deleteFilesFromDisk(deleted);
  }
}
