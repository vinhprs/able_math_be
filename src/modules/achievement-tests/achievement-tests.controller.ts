import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';
import { AchievementTestsService } from './achievement-tests.service';
import { CreateTestSetupDto } from './dto/create-test-setup.dto';
import { SelectUnitsDto } from './dto/select-units.dto';
import { ConfigureQuestionsDto } from './dto/configure-questions.dto';
import { EnterAnswersDto } from './dto/enter-answers.dto';
import { FinalizeTestDto } from './dto/finalize-test.dto';

@Controller('achievement-tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AchievementTestsController {
  constructor(private readonly achievementTestsService: AchievementTestsService) {}

  @Post('setup')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createSetup(@Body() dto: CreateTestSetupDto, @CurrentUser() user: IJwtPayload) {
    return this.achievementTestsService.createTestSetup(dto, user.sub);
  }

  @Get('units')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getUnits(@Query('grade') grade: string, @Query('semester') semester: string) {
    return this.achievementTestsService.getUnits(grade, semester);
  }

  @Post(':testId/units')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async selectUnits(@Param('testId', ParseUUIDPipe) testId: string, @Body() dto: SelectUnitsDto) {
    return this.achievementTestsService.selectUnits(testId, dto);
  }

  @Post(':testId/questions/config')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async configureQuestions(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body() dto: ConfigureQuestionsDto,
  ) {
    return this.achievementTestsService.configureQuestions(testId, dto);
  }

  @Post(':testId/answers')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async enterAnswers(@Param('testId', ParseUUIDPipe) testId: string, @Body() dto: EnterAnswersDto) {
    return this.achievementTestsService.enterAnswers(testId, dto);
  }

  @Post(':testId/finalize')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async finalizeTest(@Param('testId', ParseUUIDPipe) testId: string, @Body() dto: FinalizeTestDto) {
    return this.achievementTestsService.finalizeTest(testId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getTestList(@Query() query: any) {
    return this.achievementTestsService.getTestList(query);
  }

  @Get(':testId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getTestDetail(@Param('testId', ParseUUIDPipe) testId: string) {
    return this.achievementTestsService.getTestDetail(testId);
  }
}
