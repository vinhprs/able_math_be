/**
 * Unit score interface for grouping questions by unit
 */
export interface UnitScore {
  unitName: string;
  unitNameEnglish?: string; // English name for the unit
  rawScore: number;
  maxScore: number;
  standardScore: number;
  questionCount: number;
}
