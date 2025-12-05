import { IsString, IsOptional, Length, Matches } from 'class-validator';

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  parentName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-() ]+$/, { message: 'Invalid phone number format' })
  parentContact?: string;
}
