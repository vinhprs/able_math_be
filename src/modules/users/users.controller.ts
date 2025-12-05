import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../../../frontend/src/shared/types/enum';
import { IJwtPayload } from '../../../../frontend/src/shared/types/users.types';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: IJwtPayload) {
    return {
      success: true,
      data: await this.usersService.create(dto, user.sub),
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async findAll(@Query() query: UserQueryDto, @CurrentUser() user: IJwtPayload) {
    return {
      success: true,
      ...(await this.usersService.findAll(query, user.sub)),
    };
  }

  @Get('me')
  async getProfile(@CurrentUser() user: IJwtPayload) {
    return {
      success: true,
      data: await this.usersService.findOne(user.sub),
    };
  }

  @Get('my-students')
  @Roles(UserRole.TEACHER)
  async getMyStudents(@Query() query: UserQueryDto, @CurrentUser() user: IJwtPayload) {
    return {
      success: true,
      ...(await this.usersService.findAll(
        { ...query, createdBy: user.sub, role: UserRole.STUDENT },
        user.sub,
      )),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: IJwtPayload) {
    return {
      success: true,
      data: await this.usersService.findOne(id, user.sub),
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return {
      success: true,
      data: await this.usersService.update(id, dto, user.sub),
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: IJwtPayload) {
    await this.usersService.delete(id, user.sub);
  }
}
