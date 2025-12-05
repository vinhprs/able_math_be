import { AdtmAnswerType } from '../../../../../frontend/src/shared/types/enum';

/**
 * Answer input for Section 1 calculation
 */
export interface Section1AnswerInput {
  questionId: string;
  score: number;
  maxScore: number;
}

/**
 * Section 1 input data
 */
export interface Section1Input {
  concentrationLevel: number; // 1-5
  currentMood: number; // 1-5
  expectedScore: number;
  answers: Section1AnswerInput[];
}

/**
 * Section 1 result
 */
export interface Section1Result {
  rawScore: number;
  standardScore: number;
  maxScore: number;
  correctCount: number;
  mistakeCount: number;
  unsolvedCount: number;
}

/**
 * Answer input for Sections 2-5 (unit-based)
 */
export interface SectionAnswerInput {
  questionId: string;
  score: number;
  maxScore: number;
  unitName: string;
}

/**
 * Section input for Sections 2-5
 */
export interface SectionInput {
  sectionNumber: number;
  answers: SectionAnswerInput[];
}

/**
 * Unit score result
 */
export interface UnitScoreResult {
  unitName: string;
  rawScore: number;
  maxScore: number;
  standardScore: number;
  questionCount: number;
}

/**
 * Section result for Sections 2-5
 */
export interface SectionResult {
  sectionNumber: number;
  rawScore: number;
  standardScore: number;
  maxScore: number;
  unitScores: UnitScoreResult[];
}

/**
 * Complete A-DTM grading result
 */
export interface AdtmGradingResult {
  section1: Section1Result;
  section2: SectionResult;
  section3: SectionResult;
  section4: SectionResult;
  section5: SectionResult;
  overallStandardScore: number;
  totalRawScore: number;
  totalMaxScore: number;
}
