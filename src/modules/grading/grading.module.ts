import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradingService } from './grading.service';
import { AchievementGradingService } from './achievement-grading.service';
import { AdtmGradingService } from './adtm-grading.service';
import { GradingController } from './grading.controller';
import { AdtmController } from './adtm.controller';
import { TeacherAdtmController } from './teacher-adtm.controller';
import { TestsModule } from '../tests/tests.module';
import { StudentsModule } from '../students/students.module';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { AdtmSubmission } from '../../database/entities/adtm-submission.entity';
import { Test } from '../../database/entities/test.entity';
import { User } from '../../database/entities/user.entity';
import { StudentAssignment } from '../../database/entities/student-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestQuestion,
      StudentAnswer,
      StudentSubmission,
      AdtmSubmission,
      Test,
      User,
      StudentAssignment,
    ]),
    forwardRef(() => TestsModule),
    forwardRef(() => StudentsModule),
  ],
  controllers: [GradingController, AdtmController, TeacherAdtmController],
  providers: [GradingService, AchievementGradingService, AdtmGradingService],
  exports: [GradingService, AchievementGradingService, AdtmGradingService],
})
export class GradingModule {}
