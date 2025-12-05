import { IsObject, IsOptional, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class Section1DataDto {
  @IsInt()
  @Min(1)
  @Max(5)
  concentrationLevel: number;

  @IsInt()
  @Min(1)
  @Max(5)
  currentMood: number;

  @IsInt()
  @Min(0)
  expectedScore: number;
}

export class SaveProgressDto {
  @IsObject()
  answers: Record<string, number>;

  @IsOptional()
  @ValidateNested()
  @Type(() => Section1DataDto)
  section1Data?: Section1DataDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  currentSection?: number;
}

