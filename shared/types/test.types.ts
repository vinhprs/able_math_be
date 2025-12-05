import {
  TestType,
  TestStatus,
  SubmissionStatus,
  GradeLevel,
  Term,
  AdtmAnswerType,
  DifficultyLevel,
} from "./enum";

/**
 * Test interface
 */
export interface ITest {
  id: string;
  testCode: string;
  title: string;
  description?: string;
  testType: TestType;
  gradeLevel: GradeLevel;
  term: Term;
  level: number;
  version: string;
  status: TestStatus;
  totalScore: number;
  duration: number; // in minutes
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Test question interface
 */
export interface ITestQuestion {
  id: string;
  testId: string;
  questionNumber: number;
  section: number;
  unitName?: string;
  content: string;
  correctAnswer: string;
  score: number;
  difficulty?: DifficultyLevel;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Test submission interface
 */
export interface ITestSubmission {
  id: string;
  testId: string;
  studentId: string;
  status: SubmissionStatus;
  startedAt?: Date;
  submittedAt?: Date;
  totalScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Submission answer interface
 */
export interface ISubmissionAnswer {
  id: string;
  submissionId: string;
  questionId: string;
  studentAnswer?: string;
  isCorrect?: boolean;
  scoreEarned?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A-DTM specific grading data
 */
export interface IAdtmGradingData {
  section1: {
    correct: number;
    mistake: number;
    unsolved: number;
    standardScore: number;
  };
  section2: IAdtmSectionScore;
  section3: IAdtmSectionScore;
  section4: IAdtmSectionScore;
  section5: IAdtmSectionScore;
  overallScore: number;
  recommendedLevel: number;
}

/**
 * A-DTM section score (for sections 2-5)
 */
export interface IAdtmSectionScore {
  units: {
    unitName: string;
    rawScore: number;
    maxScore: number;
  }[];
  totalRawScore: number;
  maxScore: number;
  standardScore: number;
}

/**
 * Create test payload
 */
export interface ICreateTest {
  title: string;
  description?: string;
  testType: TestType;
  gradeLevel: GradeLevel;
  term: Term;
  level: number;
  version: string;
  duration: number;
}

/**
 * Update test payload
 */
export interface IUpdateTest {
  title?: string;
  description?: string;
  status?: TestStatus;
  duration?: number;
}

/**
 * Create question payload
 */
export interface ICreateQuestion {
  questionNumber: number;
  section: number;
  unitName?: string;
  content: string;
  correctAnswer: string;
  score: number;
  difficulty?: DifficultyLevel;
}

/**
 * Test assignment interface
 */
export interface ITestAssignment {
  id: string;
  testId: string;
  studentId: string;
  assignedBy: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
