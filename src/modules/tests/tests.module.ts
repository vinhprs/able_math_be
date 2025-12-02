import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { Test } from './entities/test.entity';
import { TestQuestion } from './entities/test-question.entity';
import { TestSubmission } from './entities/test-submission.entity';
import { SubmissionAnswer } from './entities/submission-answer.entity';
import { TestAssignment } from './entities/test-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Test,
      TestQuestion,
      TestSubmission,
      SubmissionAnswer,
      TestAssignment,
    ]),
  ],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}

