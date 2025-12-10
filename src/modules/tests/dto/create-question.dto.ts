import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  IsEnum,
  IsObject,
  ValidateIf,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MultipleChoiceOptionsDto {
  @IsString()
  @IsOptional()
  A?: string;

  @IsString()
  @IsOptional()
  B?: string;

  @IsString()
  @IsOptional()
  C?: string;

  @IsString()
  @IsOptional()
  D?: string;

  @IsString()
  @IsOptional()
  E?: string;
}

export class CreateQuestionDto {
  @IsInt()
  @Min(1)
  questionNumber: number;

  @IsString()
  @IsNotEmpty()
  unitName: string;

  @IsEnum(['TEXT', 'MULTIPLE_CHOICE', 'TRUE_FALSE'])
  @IsOptional()
  questionType?: 'TEXT' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

  @IsObject()
  @IsOptional()
  @ValidateIf((o) => o.questionType === 'MULTIPLE_CHOICE')
  @ValidateNested()
  @Type(() => MultipleChoiceOptionsDto)
  options?: MultipleChoiceOptionsDto;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.questionType === 'MULTIPLE_CHOICE')
  @Matches(/^[A-E]$/, {
    message: 'For multiple choice, correct answer must be A, B, C, D, or E',
  })
  correctAnswer: string;

  @IsInt()
  @Min(1)
  score: number;

  @IsInt()
  @Min(1)
  @Max(4)
  difficulty: number; // 1-4: 1=Easy, 2=Medium, 3=Hard, 4=Very Hard

  @IsOptional()
  @IsString()
  questionText?: string;

  @IsOptional()
  @IsString()
  questionImage?: string;
}
