import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Res,
  NotFoundException,
  Body,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, TestType } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';
import { ReportsService } from './reports.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ReportStatus } from '../../database/entities/report-card.entity';
import * as fs from 'fs';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  // TEACHER ENDPOINTS

  /**
   * Get pending reports for review
   * GET /api/reports/pending
   */
  @Get('pending')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getPendingReports(@CurrentUser() user: IJwtPayload) {
    return this.reportsService.getPendingReports(user.sub);
  }

  /**
   * Get all reports for teacher (with optional filters)
   * GET /api/reports/teacher/all
   * Query params: status, testType
   */
  @Get('teacher/all')
  @Roles(UserRole.TEACHER)
  async getAllReportsForTeacher(
    @CurrentUser() user: IJwtPayload,
    @Query('status') status?: string,
    @Query('testType') testType?: string,
  ) {
    const filters: {
      status?: ReportStatus;
      testType?: TestType;
    } = {};

    if (status) {
      filters.status = status as ReportStatus;
    }

    if (testType) {
      filters.testType = testType as TestType;
    }

    return this.reportsService.getAllReportsForTeacher(user.sub, filters);
  }

  /**
   * Get report card by ID for teacher
   * GET /api/reports/teacher/:reportId
   */
  @Get('teacher/:reportId')
  @Roles(UserRole.TEACHER)
  async getReportCardForTeacher(
    @Param('reportId') reportId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    const report = await this.reportsService.getReportCardById(reportId);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Verify that the report belongs to a test created by this teacher
    if (report.student.createdBy !== user.sub) {
      throw new ForbiddenException('You can only access reports for your own tests');
    }

    return report;
  }

  /**
   * Get report card by submission ID for teacher
   * GET /api/reports/teacher/by-submission/:submissionId
   */
  @Get('teacher/by-submission/:submissionId')
  @Roles(UserRole.TEACHER)
  async getReportCardBySubmissionForTeacher(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    const report = await this.reportsService.getReportCard(submissionId);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Verify that the report belongs to a test created by this teacher
    if (report.test.creatorId !== user.sub) {
      throw new ForbiddenException('You can only access reports for your own tests');
    }

    return report;
  }

  /**
   * Get all reports for admin (with optional filters)
   * GET /api/reports/admin/all
   * Query params: status, testType, teacherId
   */
  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  async getAllReports(
    @Query('status') status?: string,
    @Query('testType') testType?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const filters: {
      status?: ReportStatus;
      testType?: TestType;
      teacherId?: string;
    } = {};

    if (status) {
      filters.status = status as ReportStatus;
    }

    if (testType) {
      filters.testType = testType as TestType;
    }

    if (teacherId) {
      filters.teacherId = teacherId;
    }

    return this.reportsService.getAllReports(filters);
  }

  /**
   * Approve report
   * POST /api/reports/:reportId/approve
   */
  @Post(':reportId/approve')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async approveReport(
    @Param('reportId') reportId: string,
    @Body() body: { comment?: string },
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.reportsService.approveReport(reportId, user.sub, body.comment);
  }

  /**
   * Publish report to student
   * POST /api/reports/:reportId/publish
   */
  @Post(':reportId/publish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async publishReport(@Param('reportId') reportId: string, @CurrentUser() user: IJwtPayload) {
    return this.reportsService.publishReport(reportId, user.sub);
  }

  /**
   * Reject report
   * POST /api/reports/:reportId/reject
   */
  @Post(':reportId/reject')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async rejectReport(
    @Param('reportId') reportId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.reportsService.rejectReport(reportId, user.sub, body.reason);
  }

  // STUDENT ENDPOINTS

  /**
   * Get my published reports
   * GET /api/reports/student/my-reports
   */
  @Get('student/my-reports')
  @Roles(UserRole.STUDENT)
  async getMyReports(@CurrentUser() user: IJwtPayload) {
    return this.reportsService.getPublishedReportsForStudent(user.sub);
  }

  /**
   * Get published report detail
   * GET /api/reports/student/:reportId
   */
  @Get('student/:reportId')
  @Roles(UserRole.STUDENT)
  async getPublishedReport(@Param('reportId') reportId: string, @CurrentUser() user: IJwtPayload) {
    const report = await this.reportsService.getReportCardById(reportId);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.studentId !== user.sub) {
      throw new ForbiddenException('Not your report');
    }

    if (report.status !== ReportStatus.PUBLISHED) {
      throw new ForbiddenException('Report not published yet');
    }

    // Return report data based on test type
    if (report.test.testType === TestType.ACHIEVEMENT) {
      return this.reportsService.generateAchievementReport(report.submissionId);
    } else {
      return this.reportsService.generateAdtmReport(report.submissionId);
    }
  }

  /**
   * Get Achievement Test report
   * GET /api/reports/achievement/:submissionId
   */
  @Get('achievement/:submissionId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async getAchievementReport(@Param('submissionId') submissionId: string) {
    return await this.reportsService.generateAchievementReport(submissionId);
  }

  /**
   * Get A-DTM Test report
   * GET /api/reports/adtm/:submissionId
   */
  @Get('adtm/:submissionId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async getAdtmReport(@Param('submissionId') submissionId: string) {
    return await this.reportsService.generateAdtmReport(submissionId);
  }

  /**
   * Get PDF file directly (alternative endpoint)
   * GET /api/reports/pdf/:fileName
   */
  @Get('pdf/:fileName')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async getPdfFile(@Param('fileName') fileName: string, @Res() res: Response) {
    const filePath = this.pdfGeneratorService.getPdfPath(fileName);

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`PDF file not found: ${fileName}`);
      }

      // Set headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`PDF file not found: ${fileName}`);
    }
  }

  /**
   * Generate PDF for a report
   * POST /api/reports/:submissionId/generate-pdf
   */
  @Post(':submissionId/generate-pdf')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async generatePdf(@Param('submissionId') submissionId: string, @Res() res: Response) {
    // Determine report type from submission
    const reportCard = await this.reportsService.getReportCard(submissionId);
    if (!reportCard) {
      throw new NotFoundException(`Report not found for submission ${submissionId}`);
    }

    const testType = reportCard.reportData.testInfo.testType as 'ACHIEVEMENT' | 'ADTM';
    const pdfUrl = await this.reportsService.generatePdf(submissionId, testType);

    return res.json({
      success: true,
      pdfUrl,
      message: 'PDF generated successfully',
    });
  }

  /**
   * Download PDF file
   * GET /api/reports/:submissionId/download-pdf
   */
  @Get(':submissionId/download-pdf')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async downloadPdf(@Param('submissionId') submissionId: string, @Res() res: Response) {
    const reportCard = await this.reportsService.getReportCard(submissionId);
    if (!reportCard || !reportCard.pdfUrl) {
      throw new NotFoundException(
        `PDF not found for submission ${submissionId}. Please generate it first.`,
      );
    }

    // Extract filename from URL
    const fileName = reportCard.pdfUrl.split('/').pop() || '';
    const filePath = this.pdfGeneratorService.getPdfPath(fileName);

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`PDF file not found: ${fileName}`);
      }

      // Set headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`PDF file not found: ${fileName}`);
    }
  }
}
