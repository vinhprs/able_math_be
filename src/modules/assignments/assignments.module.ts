import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsController } from './assignments.controller';
import { StudentAssignmentsController } from './student-assignments.controller';
import { AssignmentsService } from './assignments.service';
import { StudentAssignment } from '../../database/entities/student-assignment.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { Test } from '../../database/entities/test.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentAssignment, StudentSubmission, Test, User])],
  controllers: [AssignmentsController, StudentAssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
