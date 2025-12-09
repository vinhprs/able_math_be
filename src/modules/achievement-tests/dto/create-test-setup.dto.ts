import { IsEnum, IsInt, IsNotEmpty, IsString, Matches, Max, Min } from 'class-validator';

// ✅ Only Elementary grades
export enum GradeLevel {
  E4 = 'E4',
  E5 = 'E5',
  E6 = 'E6',
}

export class CreateTestSetupDto {
  @IsEnum(GradeLevel)
  @IsNotEmpty()
  grade: GradeLevel;

  @IsInt()
  @Min(1)
  @Max(2)
  semester: number;

  @IsEnum(['MIDTERM', 'FINAL'])
  @IsNotEmpty()
  examType: 'MIDTERM' | 'FINAL';

  @IsEnum(['L1', 'L2', 'L3'])
  @IsNotEmpty()
  level: 'L1' | 'L2' | 'L3';

  @IsString()
  @Matches(/^0[1-3]$/, { message: 'testNumber must be 01, 02, or 03' })
  testNumber: string;

  @IsInt()
  @Min(1)
  totalQuestions: number;
}
