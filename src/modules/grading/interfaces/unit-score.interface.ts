/**
 * Unit score interface for grouping questions by unit
 */
export interface UnitScore {
  unitName: string;
  rawScore: number;
  maxScore: number;
  standardScore: number;
  questionCount: number;
}
