import { UnitScore } from './unit-score.interface';
import { DifficultyScore } from './difficulty-score.interface';

/**
 * Complete grading result for a test submission
 */
export interface GradingResult {
  totalRawScore: number;
  standardScore: number;
  maxScore: number;
  unitScores: UnitScore[];
  difficultyScores: DifficultyScore[];
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
}
