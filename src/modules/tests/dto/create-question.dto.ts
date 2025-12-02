import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { DifficultyLevel } from '@shared/types/enum';

export class CreateQuestionDto {
  @IsInt()
  @Min(1)
  questionNumber: number;

  @IsInt()
  @Min(1)
  section: number;

  @IsOptional()
  @IsString()
  unitName?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  correctAnswer: string;

  @IsInt()
  @Min(1)
  score: number;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;
}

