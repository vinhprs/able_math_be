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
} from '@nestjs/common';
import { AdtmGradingService } from './adtm-grading.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, SubmissionStatus } from '../../../../frontend/src/shared/types/enum';
import { IJwtPayload } from '../../../../frontend/src/shared/types/users.types';
import { RegisterStudentDto, GradeSection1Dto, GradeSectionDto } from './dto/adtm-workflow.dto';
import { SaveProgressDto } from './dto/save-progress.dto';

/**
 * Controller for A-DTM grading workflow
 * Handles teacher grading process for A-DTM tests
 */
@Controller('teacher/adtm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class AdtmController {
  constructor(private readonly adtmGradingService: AdtmGradingService) {}

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
    return this.adtmGradingService.updateSection1(id, dto);
  }

  /**
   * Update Section 2 grades
   * PUT /api/teacher/adtm/submissions/:id/section2
   */
  @Put('submissions/:id/section2')
  @HttpCode(HttpStatus.OK)
  async updateSection2(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSectionDto) {
    return this.adtmGradingService.updateSection(id, 2, dto);
  }

  /**
   * Update Section 3 grades
   * PUT /api/teacher/adtm/submissions/:id/section3
   */
  @Put('submissions/:id/section3')
  @HttpCode(HttpStatus.OK)
  async updateSection3(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSectionDto) {
    return this.adtmGradingService.updateSection(id, 3, dto);
  }

  /**
   * Update Section 4 grades
   * PUT /api/teacher/adtm/submissions/:id/section4
   */
  @Put('submissions/:id/section4')
  @HttpCode(HttpStatus.OK)
  async updateSection4(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSectionDto) {
    return this.adtmGradingService.updateSection(id, 4, dto);
  }

  /**
   * Update Section 5 grades
   * PUT /api/teacher/adtm/submissions/:id/section5
   */
  @Put('submissions/:id/section5')
  @HttpCode(HttpStatus.OK)
  async updateSection5(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GradeSectionDto) {
    return this.adtmGradingService.updateSection(id, 5, dto);
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
   * Finalize grading
   * POST /api/teacher/adtm/submissions/:id/submit
   */
  @Post('submissions/:id/submit')
  @HttpCode(HttpStatus.OK)
  async submitGrading(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: IJwtPayload) {
    return this.adtmGradingService.submitGrading(id, user.sub);
  }
}
