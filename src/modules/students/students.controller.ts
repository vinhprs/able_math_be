import { Controller, Get, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { StudentsService } from './students.service';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../../../frontend/src/shared/types/enum';
import { IJwtPayload } from '../../../../frontend/src/shared/types/users.types';

@Controller('student/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentProfileController {
  constructor(private readonly studentsService: StudentsService) {}

  /**
   * Get current student's profile
   */
  @Get()
  async getProfile(@CurrentUser() user: IJwtPayload) {
    return this.studentsService.getProfile(user.sub);
  }

  /**
   * Update student's own profile
   * Can update: fullName, school, parentName, parentContact
   * Cannot update: email, username, role, grade
   */
  @Put()
  async updateProfile(
    @CurrentUser() user: IJwtPayload,
    @Body() updateDto: UpdateStudentProfileDto,
  ) {
    return this.studentsService.updateProfile(user.sub, updateDto);
  }

  /**
   * Change password
   */
  @Put('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: IJwtPayload, @Body() dto: ChangePasswordDto) {
    return this.studentsService.changePassword(user.sub, dto);
  }

  /**
   * Get student's test history summary
   */
  @Get('test-history')
  async getTestHistory(@CurrentUser() user: IJwtPayload) {
    return this.studentsService.getTestHistorySummary(user.sub);
  }
}
