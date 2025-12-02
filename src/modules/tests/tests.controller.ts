import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';

@Controller('tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async create(@Body() createTestDto: CreateTestDto, @CurrentUser() user: IJwtPayload) {
    return this.testsService.create(createTestDto, user.sub);
  }

  @Get()
  async findAll() {
    return this.testsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.findOne(id);
  }

  @Post(':id/questions')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async addQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() questions: CreateQuestionDto[],
  ) {
    return this.testsService.addQuestions(id, questions);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.testsService.remove(id);
    return { message: 'Test deleted successfully' };
  }
}

