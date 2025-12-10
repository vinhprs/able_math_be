import { UnitScore } from '../../grading/interfaces/unit-score.interface';
import { DifficultyScore } from '../../grading/interfaces/difficulty-score.interface';

/**
 * Chart data structure for report visualizations
 */
export interface ChartData {
  type: 'bar' | 'radar' | 'pie';
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
}

/**
 * Question result breakdown for Achievement reports
 */
export interface QuestionResult {
  questionNumber: number;
  unitName: string;
  difficulty: string;
  isCorrect: boolean;
  scoreEarned: number;
  maxScore: number;
  correctAnswer: string;
  enteredValue: string;
  questionType: string; // 'Multiple choice' or 'Subjective'
}

/**
 * Achievement Test Report Data
 */
export interface AchievementReportData {
  student: {
    name: string;
    grade: string;
    school?: string;
  };
  test: {
    title: string;
    code: string;
    testDate: Date;
    grade: string;
    semester?: string;
    level?: number;
    examType?: string;
    testNumber?: string;
    nationalAverage?: number;
    maxScore?: number;
    totalApplicants?: number;
  };
  scores: {
    totalRaw: number;
    totalMax: number;
    standardScore: number;
    correctCount: number;
    incorrectCount: number;
    accuracy: number;
  };
  unitScores: UnitScore[];
  difficultyScores: DifficultyScore[];
  questionBreakdown: QuestionResult[];
  charts: {
    unitBar: ChartData;
    difficultyPie: ChartData;
  };
}

/**
 * Difficulty Breakdown Data
 */
export interface DifficultyBreakdown {
  difficulty: 1 | 2 | 3 | 4;
  fullMarks: number; // Tổng điểm tối đa của các câu có difficulty này
  rawScore: number; // Tổng điểm đạt được
  standardScore: number; // (rawScore / fullMarks) × 100
}

/**
 * A-DTM Section Data
 */
export interface AdtmSectionData {
  number: number;
  name: string;
  standardScore: number;
  rawScore: number;
  maxScore: number;
  correctCount?: number;
  mistakeCount?: number;
  unsolvedCount?: number;
  unitScores?: Array<{
    unitName: string;
    rawScore: number;
    maxScore: number;
    standardScore: number;
  }>;
  difficultyBreakdown?: DifficultyBreakdown[]; // NEW: Difficulty breakdown for sections 1-3
}

/**
 * Domain data for A-DTM report
 */
export interface AdtmDomainData {
  basicLearningAbility: {
    averageScore: number;
    standardScore: number;
    evaluation: 'high' | 'medium' | 'low';
    evaluationColor: string;
    sections: AdtmSectionData[]; // Sections 1-3
  };
  creativeThinkingAbility: {
    averageScore: number;
    standardScore: number;
    evaluation: 'high' | 'medium' | 'low';
    evaluationColor: string;
    sections: AdtmSectionData[]; // Sections 4-5
  };
}

/**
 * A-DTM Test Report Data
 */
export interface AdtmReportData {
  student: {
    name: string;
    grade: string;
    school?: string;
  };
  test: {
    level: number;
    testDate: Date;
    testCode?: string;
  };
  overallScore: number;
  sections: AdtmSectionData[];
  domains: AdtmDomainData;
  charts: {
    sectionBar: ChartData;
    unitRadar: ChartData;
  };
  recommendations: string[];
}
