import { IsUUID, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * DTO for A-DTM grading request
 */
export class GradeAdtmSubmissionDto {
  @IsUUID()
  @IsNotEmpty()
  submissionId: string;
}

/**
 * DTO for Section 1 pre-test information (optional, if not provided, will use existing data)
 */
export class Section1PreTestInfoDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  concentrationLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  currentMood?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedScore?: number;
}
