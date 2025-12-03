import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AddStudentsDto } from './dto/add-students.dto';
import { ClassQueryDto } from './dto/class-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createClassDto: CreateClassDto, @CurrentUser() user: IJwtPayload) {
    return this.classesService.create(createClassDto, user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAll(@Query() query: ClassQueryDto, @CurrentUser() user: IJwtPayload) {
    return this.classesService.findAll(query, user.sub, user.role);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: IJwtPayload) {
    return this.classesService.findOne(id, user.sub, user.role);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClassDto: UpdateClassDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.classesService.update(id, updateClassDto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: IJwtPayload) {
    await this.classesService.remove(id, user.sub, user.role);
    return { message: 'Class deleted successfully' };
  }

  @Post(':id/students')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  addStudents(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addStudentsDto: AddStudentsDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.classesService.addStudents(id, addStudentsDto, user.sub, user.role);
  }

  @Delete(':id/students/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  removeStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.classesService.removeStudent(id, studentId, user.sub, user.role);
  }

  @Get(':id/statistics')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getStatistics(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: IJwtPayload) {
    return this.classesService.getStatistics(id, user.sub, user.role);
  }
}

