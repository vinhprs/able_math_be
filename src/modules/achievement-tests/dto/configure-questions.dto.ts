import { IsArray, IsEnum, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionConfigDto {
  @IsInt()
  @Min(1)
  questionNo: number;

  @IsEnum(['MULTIPLE_CHOICE', 'SHORT_ANSWER'])
  type: string;

  @IsUUID()
  unitId: string;

  @IsInt()
  @Min(1)
  score: number;
}

export class ConfigureQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionConfigDto)
  questions: QuestionConfigDto[];
}
