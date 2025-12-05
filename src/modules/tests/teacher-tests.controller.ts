import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestQueryDto } from './dto/test-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../../../frontend/src/shared/types/enum';

@Controller('teacher/tests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherTestsController {
  constructor(private readonly testsService: TestsService) {}

  /**
   * Get published Achievement tests available for assignment
   * Teachers can only see PUBLISHED tests
   */
  @Get('achievement')
  async getPublishedTests(@Query() query: TestQueryDto) {
    return this.testsService.getPublishedTests(query);
  }

  /**
   * Get test details for assignment preview
   */
  @Get('achievement/:id')
  async getTestDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.getTestDetailsForTeacher(id);
  }

  /**
   * Get test statistics (how many times assigned, avg score, etc)
   */
  @Get('achievement/:id/stats')
  async getTestStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.getTestStatistics(id);
  }
}
