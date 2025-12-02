import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { StartTestDto } from './dto/start-test.dto';
import { SubmissionsService } from './submissions.service';

@Controller('student/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /**
   * Start a test - creates draft submission
   * Called when student clicks "Start Test"
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startTest(@Body() startDto: StartTestDto, @CurrentUser() user: IJwtPayload) {
    return this.submissionsService.startTest(startDto, user.sub);
  }

  /**
   * Get submission with questions for test-taking
   * Returns test questions and current answers
   */
  @Get(':submissionId/take')
  async getSubmissionForTaking(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.submissionsService.getSubmissionForTaking(submissionId, user.sub);
  }

  /**
   * Save single answer (auto-save)
   * Can be called multiple times for same question
   */
  @Put(':submissionId/answers/:questionId')
  @HttpCode(HttpStatus.OK)
  async saveAnswer(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() saveDto: SaveAnswerDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.submissionsService.saveAnswer(submissionId, questionId, saveDto, user.sub);
  }

  /**
   * Save multiple answers at once (batch save)
   */
  @Put(':submissionId/answers/batch')
  @HttpCode(HttpStatus.OK)
  async saveAnswersBatch(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() answers: SaveAnswerDto[],
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.submissionsService.saveAnswersBatch(submissionId, answers, user.sub);
  }

  /**
   * Submit test - final submission
   * Cannot be undone (but can add edit feature later)
   */
  @Post(':submissionId/submit')
  @HttpCode(HttpStatus.OK)
  async submitTest(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.submissionsService.submitTest(submissionId, user.sub);
  }

  /**
   * Get submission progress
   * How many questions answered vs total
   */
  @Get(':submissionId/progress')
  async getProgress(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.submissionsService.getSubmissionProgress(submissionId, user.sub);
  }
}
