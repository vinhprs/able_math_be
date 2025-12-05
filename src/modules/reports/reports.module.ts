import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { ReportCard } from '../../database/entities/report-card.entity';
import { Test } from '../../database/entities/test.entity';
import { User } from '../../database/entities/user.entity';
import { GradingModule } from '../grading/grading.module';

@Module({
  imports: [TypeOrmModule.forFeature([StudentSubmission, ReportCard, Test, User]), GradingModule],
  controllers: [ReportsController],
  providers: [ReportsService, PdfGeneratorService],
  exports: [ReportsService],
})
export class ReportsModule {}
