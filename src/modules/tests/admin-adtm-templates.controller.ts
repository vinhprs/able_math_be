import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TestsService } from './tests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/types/enum';
import { AdtmTemplateQueryDto } from './dto/adtm-template-query.dto';
import { UpdateTemplateStatusDto } from './dto/update-template-status.dto';

/**
 * Admin controller for managing A-DTM templates
 */
@Controller('admin/adtm/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAdtmTemplatesController {
  constructor(private readonly testsService: TestsService) {}

  /**
   * Get all A-DTM templates with filters
   * GET /api/admin/adtm/templates
   */
  @Get()
  async findAll(@Query() query: AdtmTemplateQueryDto) {
    return this.testsService.findAllAdtmTemplates(query);
  }

  /**
   * Get A-DTM template details with full structure
   * GET /api/admin/adtm/templates/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.findAdtmTemplateDetails(id);
  }

  /**
   * Update template status (active/inactive)
   * PUT /api/admin/adtm/templates/:id/status
   */
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateStatusDto) {
    return this.testsService.updateAdtmTemplateStatus(id, dto.isActive);
  }

  /**
   * Get template statistics
   * GET /api/admin/adtm/templates/:id/statistics
   */
  @Get(':id/statistics')
  async getStatistics(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.getAdtmTemplateStatistics(id);
  }
}
