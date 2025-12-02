import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsService } from './students.service';
import { StudentProfileController } from './students.controller';
import { User } from '../../database/entities/user.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StudentSubmission]),
    ConfigModule,
  ],
  controllers: [StudentProfileController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}

