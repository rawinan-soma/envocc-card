import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrgLevel } from '@prisma/client';

interface OrganizationWithParent {
  id: number;
  name_th: string;
  level: OrgLevel;
  parent?: OrganizationWithParent | null;
}

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private readonly prismaServicce: PrismaService) {}

  // private flattenOrg();

  async getOrganizationsOnQuery(search_term?: string) {
    try {
      const organizations = await this.prismaServicce.organizations.findMany({
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
      const organization = await this.prismaServicce.organizations.findUnique({
        where: { id: id },
        include: {
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
      };
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
