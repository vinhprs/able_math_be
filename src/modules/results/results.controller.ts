import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultQueryDto } from './dto/result-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@shared/types/enum';
import { IJwtPayload } from '@shared/types/users.types';

@Controller('student/results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  /**
   * Get all results for current student
   */
  @Get()
  async getMyResults(
    @Query() query: ResultQueryDto,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.resultsService.getStudentResults(user.sub, query);
  }

  /**
   * Get result summary/statistics
   * Must come before :submissionId route to avoid route conflicts
   */
  @Get(':submissionId/summary')
  async getResultSummary(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.resultsService.getResultSummary(submissionId, user.sub);
  }

  /**
   * Get detailed result for specific submission
   */
  @Get(':submissionId')
  async getResultDetail(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.resultsService.getResultDetail(submissionId, user.sub);
  }
}

