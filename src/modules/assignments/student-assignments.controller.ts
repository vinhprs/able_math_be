import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { StudentAssignmentQueryDto } from './dto/student-assignment-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../../../frontend/src/shared/types/enum';
import { IJwtPayload } from '../../../../frontend/src/shared/types/users.types';

@Controller('student/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * Get all assignments for current student
   * With filters: status, upcoming deadline, etc.
   */
  @Get()
  async getMyAssignments(
    @Query() query: StudentAssignmentQueryDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.assignmentsService.getStudentAssignments(user.sub, query);
  }

  /**
   * Get upcoming deadlines (next 7 days)
   */
  @Get('deadlines/upcoming')
  async getUpcomingDeadlines(@CurrentUser() user: IJwtPayload) {
    return this.assignmentsService.getUpcomingDeadlines(user.sub);
  }

  /**
   * Get assignment statistics summary
   */
  @Get('stats/summary')
  async getAssignmentStats(@CurrentUser() user: IJwtPayload) {
    return this.assignmentsService.getStudentAssignmentStats(user.sub);
  }

  /**
   * Get assignment details for student
   * Includes test info and student's progress
   */
  @Get(':id')
  async getAssignmentDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.assignmentsService.getStudentAssignmentDetail(id, user.sub);
  }
}
