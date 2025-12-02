import { DifficultyLevel } from '@shared/types/enum';

/**
 * Difficulty score interface for grouping questions by difficulty level
 */
export interface DifficultyScore {
  difficulty: DifficultyLevel;
  rawScore: number;
  maxScore: number;
  standardScore: number;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
}
