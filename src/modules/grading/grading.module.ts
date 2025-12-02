import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradingService } from './grading.service';
import { AchievementGradingService } from './achievement-grading.service';
import { AdtmGradingService } from './adtm-grading.service';
import { GradingController } from './grading.controller';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { AdtmSubmission } from '../../database/entities/adtm-submission.entity';
import { Test } from '../../database/entities/test.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestQuestion,
      StudentAnswer,
      StudentSubmission,
      AdtmSubmission,
      Test,
    ]),
  ],
  controllers: [GradingController],
  providers: [GradingService, AchievementGradingService, AdtmGradingService],
  exports: [GradingService, AchievementGradingService, AdtmGradingService],
})
export class GradingModule {}
