import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SubmissionsController,
  TeacherSubmissionsController,
  AdminSubmissionsController,
} from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { StudentAssignment } from '../../database/entities/student-assignment.entity';
import { Test } from '../../database/entities/test.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { User } from '../../database/entities/user.entity';
import { GradingModule } from '../grading/grading.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentSubmission,
      StudentAnswer,
      StudentAssignment,
      Test,
      TestQuestion,
      User,
    ]),
    GradingModule,
    ReportsModule,
  ],
  controllers: [SubmissionsController, TeacherSubmissionsController, AdminSubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
