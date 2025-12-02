import { IsUUID, IsArray, IsDateString, IsOptional, ArrayMinSize } from 'class-validator';

export class BulkAssignDto {
  @IsUUID()
  testId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
