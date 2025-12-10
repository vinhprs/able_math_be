import { IsInt, IsObject, Min, Max, IsOptional } from 'class-validator';
import { SubmissionStatus } from '@shared/types/enum';

/**
 * DTO for saving progress for a specific section
 */
export class SaveSectionProgressDto {
  @IsInt()
  @Min(1)
  @Max(5)
  sectionNumber: number;

  @IsObject()
  @IsOptional()
  data?: {
    concentration?: number;
    mood?: number;
    expectedScore?: number;
    questionScores?: Record<number, number>;
  };
}

/**
 * Response DTO for progress status
 */
export class ProgressResponseDto {
  submissionId: string;
  status: SubmissionStatus;
  sectionsCompleted: {
    section1: boolean;
    section2: boolean;
    section3: boolean;
    section4: boolean;
    section5: boolean;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  lastSaved: Date;
  canFinalize: boolean;
}
