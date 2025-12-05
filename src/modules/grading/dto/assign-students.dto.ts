import { IsArray, IsString, IsDateString, IsOptional, IsBoolean, ArrayMinSize } from 'class-validator';

export class AssignStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  studentIds: string[];

  @IsString()
  templateId: string;

  @IsDateString()
  testDate: string;

  @IsOptional()
  @IsDateString()
  gradingDueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsBoolean()
  notifyStudents: boolean;

  @IsBoolean()
  notifyParents: boolean;
}

