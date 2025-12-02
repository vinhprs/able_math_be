import { Controller, Get, Post, Param, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/types/enum';
import { ReportsService } from './reports.service';
import { PdfGeneratorService } from './pdf-generator.service';
import * as fs from 'fs';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

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
}
