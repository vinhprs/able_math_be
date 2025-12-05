import {
  Controller,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdtmGradingService } from './adtm-grading.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/types/enum';

@Controller('grading')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradingController {
  constructor(private readonly adtmGradingService: AdtmGradingService) {}

  /**
   * Grade an A-DTM submission
   * POST /api/grading/adtm/:submissionId
   * Only teachers and admins can grade submissions
   */
  @Post('adtm/:submissionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async gradeAdtmSubmission(@Param('submissionId', ParseUUIDPipe) submissionId: string) {
    return this.adtmGradingService.gradeAdtmSubmission(submissionId);
  }
}
