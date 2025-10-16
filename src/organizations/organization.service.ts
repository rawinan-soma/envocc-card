import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { OrgLevel } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { OrgCreateDto } from './dto/org-create.dto';

interface OrganizationWithParent {
  id: number;
  name_th: string;
  level: OrgLevel;
  parent?: OrganizationWithParent | null;
}

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private readonly prismaService: PrismaService) {}

  // private flattenOrg();

  async getOrganizationsOnQuery(search_term?: string) {
    try {
      const organizations = await this.prismaService.organizations.findMany({
        where: { name_th: { contains: search_term } },
        select: { name_th: true, id: true },
      });
      return organizations;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  private pickAllLevel(
    org: OrganizationWithParent | undefined | null,
  ): Record<string, { id: number; name_th: string }> | null {
    if (!org) {
      return null;
    }

    const result: Record<string, { id: number; name_th: string }> = {};
    let current: OrganizationWithParent | null | undefined = org;

    while (current) {
      result[current.level] = { id: current.id, name_th: current.name_th };
      current = current.parent;
    }

    return result;
  }

  async getOrganizationById(id: number) {
    try {
      const organization = await this.prismaService.organizations.findUnique({
        where: { id: id },
        include: {
          executive: { select: { position_name: true, position_id: true } },
          parent: {
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
      });

      const flatOrg = this.pickAllLevel(organization);
      return {
        unit_id: flatOrg?.UNIT?.id ?? null,
        unit_name: flatOrg?.UNIT?.name_th ?? null,
        province_id: flatOrg?.PROVINCE?.id ?? null,
        province_name: flatOrg?.PROVINCE?.name_th ?? null,
        region_id: flatOrg?.REGION?.id ?? null,
        region_name: flatOrg?.REGION?.name_th ?? null,
        department_id: flatOrg?.DEPARTMENT?.id ?? null,
        department_name: flatOrg?.DEPARTMENT?.name_th ?? null,
        ministry_id: flatOrg?.MINISTRY?.id,
        ministry_name: flatOrg?.MINISTRY?.name_th,
        executive_name: organization?.executive[0].position_name,
        executive_id: organization?.executive[0].position_id,
      };
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }

  async createOrganization(
    dto: OrgCreateDto,
    seal: number,
    signature: number,
    parentId?: number,
  ) {
    try {
      const org = await this.prismaService.organizations.findFirst({
        where: { code: dto.code },
      });

      if (org) {
        throw new BadRequestException('organization already exists');
      }

      return await this.prismaService.organizations.create({
        data: {
          ...dto,
          parentId: parentId,
          sealId: seal,
          signatureId: signature,
        },
      });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException('something went wrong');
    }
  }

  async getOrganizationChildren(parentId: number) {
    try {
      const children = this.prismaService.organizations.findMany({
        where: { parentId: parentId },
        select: { id: true, name_th: true, level: true },
      });

      return children;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
