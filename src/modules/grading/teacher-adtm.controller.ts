import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdtmGradingService } from './adtm-grading.service';
import { TestsService } from '../tests/tests.service';
import { StudentsService } from '../students/students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, TestStatus } from '../../../../frontend/src/shared/types/enum';
import { IJwtPayload } from '../../../../frontend/src/shared/types/users.types';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AvailableStudentsQueryDto } from '../students/dto/available-students-query.dto';
import { AdtmTemplateQueryDto } from '../tests/dto/adtm-template-query.dto';

/**
 * Teacher controller for A-DTM assignment workflow
 */
@Controller('teacher/adtm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherAdtmController {
  constructor(
    private readonly adtmGradingService: AdtmGradingService,
    private readonly testsService: TestsService,
    private readonly studentsService: StudentsService,
  ) {}

  /**
   * Get students available for A-DTM assignment
   * GET /api/teacher/students/available-for-adtm
   */
  @Get('students/available')
  async getAvailableStudents(
    @Query() query: AvailableStudentsQueryDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.studentsService.getAvailableStudentsForAdtm(query, user.sub);
  }

  /**
   * Get active A-DTM templates for assignment
   * GET /api/teacher/adtm/templates
   */
  @Get('templates')
  async getActiveTemplates(@Query() query: AdtmTemplateQueryDto) {
    // Only return PUBLISHED templates
    return this.testsService.findAllAdtmTemplates({
      ...query,
      status: query.status || TestStatus.PUBLISHED,
    });
  }

  /**
   * Assign students to A-DTM test
   * POST /api/teacher/adtm/assign
   */
  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  async assignStudents(@Body() dto: AssignStudentsDto, @CurrentUser() user: IJwtPayload) {
    return this.adtmGradingService.assignStudents(dto, user.sub);
  }
}
