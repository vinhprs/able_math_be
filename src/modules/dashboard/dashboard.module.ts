import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../../database/entities/user.entity';
import { Test } from '../../database/entities/test.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAssignment } from '../../database/entities/student-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Test, StudentSubmission, StudentAssignment])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
