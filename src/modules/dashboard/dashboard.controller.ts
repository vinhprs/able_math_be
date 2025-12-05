import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get admin dashboard statistics
   * GET /admin/dashboard/stats
   */
  @Get('admin/dashboard/stats')
  @Roles(UserRole.ADMIN)
  async getAdminStats() {
    return this.dashboardService.getAdminStats();
  }

  /**
   * Get admin recent activity
   * GET /admin/dashboard/recent-activity
   */
  @Get('admin/dashboard/recent-activity')
  @Roles(UserRole.ADMIN)
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }

  /**
   * Get teacher dashboard statistics
   * GET /teacher/dashboard/stats
   */
  @Get('teacher/dashboard/stats')
  @Roles(UserRole.TEACHER)
  async getTeacherStats(@CurrentUser() user: IJwtPayload) {
    return this.dashboardService.getTeacherStats(user.sub);
  }

  /**
   * Get teacher's classes
   * GET /teacher/classes
   */
  @Get('teacher/classes')
  @Roles(UserRole.TEACHER)
  async getTeacherClasses(@CurrentUser() user: IJwtPayload) {
    return this.dashboardService.getTeacherClasses(user.sub);
  }

  /**
   * Get teacher's upcoming deadlines
   * GET /teacher/dashboard/deadlines
   */
  @Get('teacher/dashboard/deadlines')
  @Roles(UserRole.TEACHER)
  async getUpcomingDeadlines(@CurrentUser() user: IJwtPayload) {
    return this.dashboardService.getUpcomingDeadlines(user.sub);
  }

  /**
   * Get student dashboard statistics
   * GET /student/dashboard/stats
   */
  @Get('student/dashboard/stats')
  @Roles(UserRole.STUDENT)
  async getStudentStats(@CurrentUser() user: IJwtPayload) {
    return this.dashboardService.getStudentStats(user.sub);
  }

  /**
   * Get student's assigned tests
   * GET /student/tests
   */
  @Get('student/tests')
  @Roles(UserRole.STUDENT)
  async getStudentTests(@CurrentUser() user: IJwtPayload) {
    return this.dashboardService.getStudentTests(user.sub);
  }
}
