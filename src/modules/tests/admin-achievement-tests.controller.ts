import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TestsService } from './tests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/types/enum';
import { CreateQuestionDto } from './dto/create-question.dto';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for score validation request
 */
class ValidateScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

/**
 * Admin controller for managing Achievement Tests
 */
@Controller('admin/tests/achievement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAchievementTestsController {
  constructor(private readonly testsService: TestsService) {}

  /**
   * Validate that total scores equal 100
   * POST /api/admin/tests/achievement/validate-scores
   */
  @Post('validate-scores')
  @HttpCode(HttpStatus.OK)
  async validateScores(@Body() body: ValidateScoresDto) {
    const { questions } = body;
    const totalScore = questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
    const isValid = Math.abs(totalScore - 100) < 0.01;

    return {
      isValid,
      totalScore: Number(totalScore.toFixed(2)),
      targetScore: 100,
      difference: Number((totalScore - 100).toFixed(2)),
      message: isValid
        ? 'Total score is valid'
        : `Total score must equal 100. Current: ${totalScore.toFixed(2)}`,
      details: {
        questionScores: questions.map((q) => ({
          questionNumber: q.questionNumber,
          score: q.score,
        })),
      },
    };
  }
}
