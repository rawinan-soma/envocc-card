import { Module } from '@nestjs/common';
import { ExperiencesService } from './experiences.service';

@Module({
  providers: [ExperiencesService],
})
export class ExperiecesModule {}
