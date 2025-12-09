import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerEntryDto {
  @IsInt()
  @Min(1)
  questionNo: number;

  @IsString()
  @IsNotEmpty()
  correctAnswer: string;
}

export class EnterAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerEntryDto)
  answers: AnswerEntryDto[];
}
