import { IsEnum, IsInt, IsNotEmpty, IsString, Min, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { TestType, Term } from '@shared/types/enum';
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
  questions?: CreateQuestionDto[];
}

