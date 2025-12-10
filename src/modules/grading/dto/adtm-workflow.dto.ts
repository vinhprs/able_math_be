import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for registering a student for A-DTM test
 */
export class RegisterStudentDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  testCode: string;
}

/**
 * DTO for question score update
 */
export class QuestionScoreDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsNumber()
  @Min(0)
  score: number;
}

/**
 * DTO for Section 1 grading
 */
export class GradeSection1Dto {
  @IsNumber()
  @Min(1)
  @Max(5)
  concentrationLevel: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  currentMood: number;

  @IsNumber()
  @Min(0)
  expectedScore: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionScoreDto)
  answers: QuestionScoreDto[];
}

/**
 * DTO for Sections 2-5 grading
 */
export class GradeSectionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionScoreDto)
  answers: QuestionScoreDto[];
}
