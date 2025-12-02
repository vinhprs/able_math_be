import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  testId: string;

  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
