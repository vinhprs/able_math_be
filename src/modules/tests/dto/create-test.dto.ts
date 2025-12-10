import { Term } from '@shared/types/enum';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ValidateTotalScore } from '../../../common/validators/total-score.validator';
import { CreateQuestionDto } from './create-question.dto';

export class CreateTestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  curriculum: string;

  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsString()
  @IsNotEmpty()
  semester: string;

  @IsEnum(Term)
  term: Term;

  @IsInt()
  @Min(1)
  level: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @ValidateTotalScore(100, {
    message: 'Total score of all questions must equal 100 points',
  })
  questions?: CreateQuestionDto[];
}
