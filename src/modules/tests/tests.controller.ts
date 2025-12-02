import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { TestQueryDto } from './dto/test-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';

@Controller('tests/achievement')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  /**
   * Create Achievement Test (Admin only)
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTestDto: CreateTestDto, @CurrentUser() user: IJwtPayload) {
    return this.testsService.create(createTestDto, user.sub);
  }

  /**
   * List Achievement Tests with pagination and filters
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findAll(@Query() query: TestQueryDto) {
    return this.testsService.findAll(query);
  }

  /**
   * Get Achievement Test details with questions and statistics
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.findOne(id);
  }

  /**
   * Update Achievement Test metadata (Admin only)
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateTestDto: UpdateTestDto) {
    return this.testsService.update(id, updateTestDto);
  }

  /**
   * Delete Achievement Test (Admin only - soft delete)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.testsService.remove(id);
    return { message: 'Test archived successfully' };
  }

  /**
   * Add question to Achievement Test (Admin only)
   */
  @Post(':id/questions')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.testsService.addQuestion(id, createQuestionDto);
  }

  /**
   * Update question in Achievement Test (Admin only)
   */
  @Put(':id/questions/:qid')
  @Roles(UserRole.ADMIN)
  async updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qid', ParseUUIDPipe) questionId: string,
    @Body() updateData: Partial<CreateQuestionDto>,
  ) {
    return this.testsService.updateQuestion(id, questionId, updateData);
  }

  /**
   * Delete question from Achievement Test (Admin only)
   */
  @Delete(':id/questions/:qid')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qid', ParseUUIDPipe) questionId: string,
  ) {
    await this.testsService.removeQuestion(id, questionId);
    return { message: 'Question deleted successfully' };
  }

  /**
   * Publish Achievement Test (Admin only)
   */
  @Post(':id/publish')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.publish(id);
  }
}
