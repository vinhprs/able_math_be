import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { TestType, GradeLevel, Term } from '@shared/types/enum';

export class CreateTestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TestType)
  testType: TestType;

  @IsEnum(GradeLevel)
  gradeLevel: GradeLevel;

  @IsEnum(Term)
  term: Term;

  @IsInt()
  @Min(1)
  level: number;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsInt()
  @Min(1)
  duration: number;
}

