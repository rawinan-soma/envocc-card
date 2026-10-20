import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrgLevel, organizations, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'prisma/prisma.service';
import { UserUpdateDto, UserUpdateInternalDto } from './dto/user-update.dto';
import { StatusCreateDto } from 'src/request/dto/status-create.dto';
import { FilesService } from 'src/files/files.service';
import { FileCreateDto } from 'src/files/dto/file-create.dto';
import { addStatusEntry } from 'src/request/status-history';

type StepThreeFile = 'govcard' | 'reqFile' | 'expfile';
const STEP_THREE_FILES: StepThreeFile[] = ['govcard', 'reqFile', 'expfile'];
const REQUIRED_STEP_THREE_FILES: StepThreeFile[] = ['govcard'];

interface UsersPageQuery {
  page: number;
  search_term?: string;
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
      statuses,
      orgId: queryData.orgId,
    });
  }

  // Every user at every request status, across every organization.
  async getAllUsersUnfiltered(queryData: UsersPageQuery) {
    return await this.getUsersPage(queryData);
  }

  // statuses filters on each user's latest request; orgId limits the result
  // to that organization and its descendants. Omit either to skip it.
  private async getUsersPage(
    queryData: UsersPageQuery & { statuses?: number[]; orgId?: number },
  ) {
    try {
      const { statuses, orgId } = queryData;

      const where: Prisma.usersWhereInput = {
        OR: [
          { fname_th: { contains: queryData.search_term } },
          { lname_th: { contains: queryData.search_term } },
          { organization: { name_th: { contains: queryData.search_term } } },
        ],
      };
      if (statuses) {
        where.requests = { some: { request_status: { in: statuses } } };
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

      const filteredData = statuses
        ? data.filter(
            (d) =>
              d.request_status !== null && statuses.includes(d.request_status),
          )
        : data;

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

        const { entry } = await addStatusEntry(tx, {
          userId: data.user,
          status: data.next_status,
          requestType: data.request_type,
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

  // Step 3. Each document replaces the user's existing one(s) of that type.
  // A type the user already has may be left out; the government card is
  // required otherwise. The request file is always optional.
  async txUploadFileandUpdateRequest(
    user: number,
    uploads: Partial<Record<StepThreeFile, FileCreateDto>>,
  ) {
    const uploaded = Object.values(uploads).flatMap((dto) =>
      dto ? [dto.url] : [],
    );
    try {
      const replaced = await this.prisma.$transaction(async (tx) => {
        const replaced: string[] = [];
        for (const model of STEP_THREE_FILES) {
          const upload = uploads[model];
          if (upload) {
            replaced.push(
              ...(await this.filesService.txDeleteFilesForUser(
                [model],
                user,
                tx,
              )),
            );
            await this.filesService.txUploadFileForUser(model, upload, tx);
          } else if (
            REQUIRED_STEP_THREE_FILES.includes(model) &&
            (await this.filesService.txCountFilesForUser(model, user, tx)) === 0
          ) {
            throw new BadRequestException(`${model} is required`);
          }
        }

        await addStatusEntry(tx, { userId: user, status: 4, requestType: 1 });

        return replaced;
      });

      await this.filesService.deleteFilesFromDisk(replaced);
    } catch (err) {
      this.logger.error(err);
      await this.filesService.deleteFilesFromDisk(uploaded);
      throw err;
    }
  }

  async checkUserExisting(userId: number) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('user not found');
    }
  }

  async updateUserwithExp(userId: number, data: UserUpdateDto) {
    if (data.user) {
      if (data.experiences) {
        const updatedUser = await this.prisma.users.update({
          where: { id: userId },
          data: {
            ...data.user,
            experiences: { createMany: { data: { ...data.experiences } } },
          },
        });

        return updatedUser;
      }

      if (!data.experiences) {
        const updateUser = await this.prisma.users.update({
          where: { id: userId },
          data: data.user,
        });

        return updateUser;
      }
    }
  }

  async createRequest(userId: number, requestType: number) {
    const { entry } = await addStatusEntry(this.prisma, {
      userId: userId,
      status: 1,
      requestType: requestType,
      approver: userId,
    });
    return entry;
  }

  async createNewCardRequest(
    userId: number,
    data: UserUpdateDto,
    requestType: number,
  ) {
    // 1. update user data
    // 2. create new experience
    // 3. create new request
    try {
      await this.checkUserExisting(userId);
      const updateUser = await this.updateUserwithExp(userId, data);
      if (!updateUser) {
        throw new BadRequestException('invalid user input');
      }
      await this.createRequest(userId, requestType);
    } catch (err) {
      this.logger.error(err);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException('failed to create request');
    }
  }
}
