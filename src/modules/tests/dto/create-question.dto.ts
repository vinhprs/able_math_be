import { IsInt, IsNotEmpty, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateQuestionDto {
  @IsInt()
  @Min(1)
  questionNumber: number;

  @IsString()
  @IsNotEmpty()
  unitName: string;

  @IsString()
  @IsNotEmpty()
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
