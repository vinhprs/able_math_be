import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { AssignToClassDto } from './dto/assign-to-class.dto';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * Assign test to single student
   * Teacher only
   */
  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateAssignmentDto, @CurrentUser() user: IJwtPayload) {
    return this.assignmentsService.create(createDto, user.sub);
  }

  /**
   * Bulk assign test to multiple students
   * Teacher only
   */
  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async bulkAssign(@Body() bulkDto: BulkAssignDto, @CurrentUser() user: IJwtPayload) {
    return this.assignmentsService.bulkAssign(bulkDto, user.sub);
  }

  /**
   * Assign test to all students in a class
   * Teacher only
   */
  @Post('assign-to-class')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async assignToClass(@Body() assignDto: AssignToClassDto, @CurrentUser() user: IJwtPayload) {
    return this.assignmentsService.assignToClass(assignDto, user.sub);
  }

  /**
   * Get teacher's assignments with filters
   * Teacher only - see their own assignments
   */
  @Get('teacher')
  @Roles(UserRole.TEACHER)
  async getTeacherAssignments(
    @Query() query: AssignmentQueryDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.assignmentsService.getTeacherAssignments(user.sub, query);
  }

  /**
   * Get students who received a specific test
   */
  @Get('test/:testId/students')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getAssignedStudents(
    @Param('testId', ParseUUIDPipe) testId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.assignmentsService.getAssignedStudents(testId, user.sub);
  }

  /**
   * Get assignment details
   */
  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentsService.findOne(id);
  }

  /**
   * Delete assignment (before student starts)
   * Teacher only
   */
  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: IJwtPayload) {
    await this.assignmentsService.remove(id, user.sub);
    return { message: 'Assignment deleted successfully' };
  }

  /**
   * Extend deadline for assignment
   */
  @Post(':id/extend-deadline')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async extendDeadline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() extendDeadlineDto: ExtendDeadlineDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.assignmentsService.extendDeadline(
      id,
      new Date(extendDeadlineDto.newDeadline),
      user.sub,
    );
  }
}
