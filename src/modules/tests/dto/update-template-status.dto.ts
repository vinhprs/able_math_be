import { IsBoolean } from 'class-validator';

export class UpdateTemplateStatusDto {
  @IsBoolean()
  isActive: boolean;
}
