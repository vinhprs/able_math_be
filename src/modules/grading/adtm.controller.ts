import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AdtmGradingService } from './adtm-grading.service';
import { ReportsService } from '../reports/reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, SubmissionStatus } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';
import { RegisterStudentDto, GradeSection1Dto, GradeSectionDto } from './dto/adtm-workflow.dto';
import { SaveProgressDto } from './dto/save-progress.dto';
import { SaveSectionProgressDto } from './dto/save-section-progress.dto';

/**
 * Controller for A-DTM grading workflow
 * Handles teacher grading process for A-DTM tests
 */
@Controller('teacher/adtm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class AdtmController {
  private readonly logger = new Logger(AdtmController.name);

  constructor(
    private readonly adtmGradingService: AdtmGradingService,
    private readonly reportsService: ReportsService,
  ) {}

  /**
   * Register a student for A-DTM test grading
   * POST /api/teacher/adtm/register-student
   */
  @Post('register-student')
  @HttpCode(HttpStatus.CREATED)
  async registerStudent(@Body() dto: RegisterStudentDto, @CurrentUser() user: IJwtPayload) {
    return this.adtmGradingService.registerStudent(dto, user.sub);
  }

  /**
   * Get list of A-DTM submissions for grading
   * GET /api/teacher/adtm/submissions
   */
  @Get('submissions')
  async getSubmissions(
    @CurrentUser() user: IJwtPayload,
    @Query('status') status?: SubmissionStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adtmGradingService.getSubmissions(user.sub, {
      status,
      search,
      page: page || 1,
      limit: limit || 20,
    });
  }

  /**
   * Get full submission with all sections and questions
   * GET /api/teacher/adtm/submissions/:id
   */
  @Get('submissions/:id')
  async getSubmission(@Param('id', ParseUUIDPipe) id: string) {
    return this.adtmGradingService.getSubmission(id);
  }

  /**
   * Update Section 1 grades
   * PUT /api/teacher/adtm/submissions/:id/section1
   */
  @Put('submissions/:id/section1')
  @HttpCode(HttpStatus.OK)
  async updateSection1(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSection1Dto) {
    const result = await this.adtmGradingService.updateSection1(id, dto);
    await this.checkAndAutoFinalize(id, result);
    return result;
  }

  /**
   * Update Section 2 grades
   * PUT /api/teacher/adtm/submissions/:id/section2
   */
  @Put('submissions/:id/section2')
  @HttpCode(HttpStatus.OK)
  async updateSection2(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSectionDto) {
    const result = await this.adtmGradingService.updateSection(id, 2, dto);
    await this.checkAndAutoFinalize(id, result);
    return result;
  }

  /**
   * Update Section 3 grades
   * PUT /api/teacher/adtm/submissions/:id/section3
   */
  @Put('submissions/:id/section3')
  @HttpCode(HttpStatus.OK)
  async updateSection3(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSectionDto) {
    const result = await this.adtmGradingService.updateSection(id, 3, dto);
    await this.checkAndAutoFinalize(id, result);
    return result;
  }

  /**
   * Update Section 4 grades
   * PUT /api/teacher/adtm/submissions/:id/section4
   */
  @Put('submissions/:id/section4')
  @HttpCode(HttpStatus.OK)
  async updateSection4(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSectionDto) {
    const result = await this.adtmGradingService.updateSection(id, 4, dto);
    await this.checkAndAutoFinalize(id, result);
    return result;
  }

  /**
   * Update Section 5 grades
   * PUT /api/teacher/adtm/submissions/:id/section5
   */
  @Put('submissions/:id/section5')
  @HttpCode(HttpStatus.OK)
  async updateSection5(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSectionDto) {
    const result = await this.adtmGradingService.updateSection(id, 5, dto);
    await this.checkAndAutoFinalize(id, result);
    return result;
  }

  /**
   * Check if all domains are complete and auto-finalize if needed
   */
  private async checkAndAutoFinalize(submissionId: string, result: any): Promise<void> {
    if (result.allDomainsComplete) {
      // Auto-finalize after a short delay to ensure transaction is committed
      setTimeout(async () => {
        try {
          this.logger.log(
            `All domains complete for submission ${submissionId}. Auto-finalizing...`,
          );
          await this.finalizeGrading(submissionId);
        } catch (error) {
          // Log error but don't throw - auto-finalization failure shouldn't block response
          this.logger.error(
            `Auto-finalization failed for submission ${submissionId}: ${error.message}`,
            error.stack,
          );
        }
      }, 100);
    }
  }

  /**
   * Calculate all scores and generate report
   * POST /api/teacher/adtm/submissions/:id/calculate
   */
  @Post('submissions/:id/calculate')
  @HttpCode(HttpStatus.OK)
  async calculateScores(@Param('id', ParseUUIDPipe) id: string) {
    return this.adtmGradingService.calculateScores(id);
  }

  /**
   * Save grading progress (auto-save)
   * PUT /api/teacher/adtm/submissions/:id/save-progress
   */
  @Put('submissions/:id/save-progress')
  @HttpCode(HttpStatus.OK)
  async saveProgress(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveProgressDto) {
    return this.adtmGradingService.saveProgress(id, dto);
  }

  /**
   * Save section progress (auto-save by section)
   * POST /api/teacher/adtm/submissions/:id/save-section-progress
   */
  @Post('submissions/:id/save-section-progress')
  @HttpCode(HttpStatus.OK)
  async saveSectionProgress(
    @Param('id', ParseUUIDPipe) submissionId: string,
    @Body() progressDto: SaveSectionProgressDto,
  ) {
    return this.adtmGradingService.saveSectionProgress(
      submissionId,
      progressDto.sectionNumber,
      progressDto.data || {},
    );
  }

  /**
   * Get grading progress status
   * GET /api/teacher/adtm/submissions/:id/progress
   */
  @Get('submissions/:id/progress')
  @HttpCode(HttpStatus.OK)
  async getProgress(@Param('id', ParseUUIDPipe) submissionId: string) {
    return this.adtmGradingService.getGradingProgress(submissionId);
  }

  /**
   * Finalize grading
   * POST /api/teacher/adtm/submissions/:id/submit
   */
  @Post('submissions/:id/submit')
  @HttpCode(HttpStatus.OK)
  async submitGrading(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: IJwtPayload) {
    return this.adtmGradingService.submitGrading(id, user.sub);
  }

  /**
   * Finalize grading and generate report
   * POST /api/teacher/adtm/submissions/:id/finalize
   */
  @Post('submissions/:id/finalize')
  @HttpCode(HttpStatus.OK)
  async finalizeGrading(@Param('id', ParseUUIDPipe) submissionId: string) {
    try {
      // 1. Calculate all scores and domains
      const result = await this.adtmGradingService.gradeAdtmSubmission(submissionId);

      // 2. Generate report with domains
      const report = await this.reportsService.generateAdtmReport(submissionId);

      // 3. Update submission status to GRADED (already done in gradeAdtmSubmission)
      // The status is already set to GRADED in gradeAdtmSubmission

      return {
        success: true,
        message: 'Grading finalized successfully',
        result,
        report: {
          id: report.test.testCode,
          url: `/api/teacher/adtm/submissions/${submissionId}/report`,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to finalize grading: ' + error.message);
    }
  }

  /**
   * Get report for a submission
   * GET /api/teacher/adtm/submissions/:id/report
   */
  @Get('submissions/:id/report')
  @HttpCode(HttpStatus.OK)
  async getReport(@Param('id', ParseUUIDPipe) submissionId: string) {
    return this.reportsService.generateAdtmReport(submissionId);
  }
}
