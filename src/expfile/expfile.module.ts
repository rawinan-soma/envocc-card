import { Module } from '@nestjs/common';
import { ExpfileService } from './expfile.service';
import { ExpfileController } from './expfile.controller';

@Module({
  controllers: [ExpfileController],
  providers: [ExpfileService],
})
export class ExpfileModule {}
