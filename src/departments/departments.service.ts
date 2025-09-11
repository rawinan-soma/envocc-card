import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getDepartmentById(ministry: number) {
    try {
      const department = await this.prisma.departments.findMany({
        where: { ministry: ministry },
      });

      return department;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('something went wrong');
    }
  }
}
