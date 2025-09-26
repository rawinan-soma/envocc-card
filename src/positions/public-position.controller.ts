import { Controller, Get, Query } from '@nestjs/common';
import { PositionsService } from './positions.service';

@Controller('public')
export class PublicPositionController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get('positions')
  async getAllPositionQuery(@Query('orgId') orgId?: number) {
    return await this.positionsService.getAllPositions(orgId);
  }
}
