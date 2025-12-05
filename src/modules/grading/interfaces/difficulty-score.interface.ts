/**
 * Difficulty score interface for grouping questions by difficulty level
 * Difficulty: 1-4 (1=Easy, 2=Medium, 3=Hard, 4=Very Hard)
 */
export interface DifficultyScore {
  difficulty: number; // 1-4
  rawScore: number;
  maxScore: number;
  standardScore: number;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
}
