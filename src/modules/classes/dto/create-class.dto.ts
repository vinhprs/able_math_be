import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(20)
  grade: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  term?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  schoolYear?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

