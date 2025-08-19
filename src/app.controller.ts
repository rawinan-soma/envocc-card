import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import type { RequestwithUserData } from './common/request-with-data.interface';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@Req() request: RequestwithUserData): string {
    console.log(request.user);
    return this.appService.getHello();
  }
}
