import { IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';

export class AssignToClassDto {
  @IsUUID()
  testId: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

