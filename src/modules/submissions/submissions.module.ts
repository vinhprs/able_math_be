import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { StudentAssignment } from '../../database/entities/student-assignment.entity';
import { Test } from '../../database/entities/test.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { GradingModule } from '../grading/grading.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentSubmission,
      StudentAnswer,
      StudentAssignment,
      Test,
      TestQuestion,
    ]),
    GradingModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
