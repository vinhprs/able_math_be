import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from '../../database/entities/test.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { CurriculumUnit } from '../../database/entities/curriculum-unit.entity';
import { AchievementTestsController } from './achievement-tests.controller';
import { AchievementTestsService } from './achievement-tests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Test, TestQuestion, CurriculumUnit])],
  controllers: [AchievementTestsController],
  providers: [AchievementTestsService],
  exports: [AchievementTestsService],
})
export class AchievementTestsModule {}
