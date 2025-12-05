/**
 * User roles in the system
 */
export const UserRole = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Test types supported by the system
 */
export const TestType = {
  ACHIEVEMENT: 'ACHIEVEMENT', // Level Maintenance Test (Auto-graded)
  ADTM: 'ADTM', // Entrance Level Diagnostic Test (Manual grading)
  LEVEL_MAINTENANCE: 'LEVEL_MAINTENANCE', // Level Maintenance Test
} as const;

export type TestType = (typeof TestType)[keyof typeof TestType];

/**
 * Test status
 */
export const TestStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type TestStatus = (typeof TestStatus)[keyof typeof TestStatus];

/**
 * Submission status
 */
export const SubmissionStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  GRADED: 'GRADED',
} as const;

export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

/**
 * Grade levels
 */
export const GradeLevel = {
  E1: 'E1', // Elementary 1
  E2: 'E2',
  E3: 'E3',
  E4: 'E4',
  E5: 'E5',
  E6: 'E6',
  M1: 'M1', // Middle 1
  M2: 'M2',
  M3: 'M3',
} as const;

export type GradeLevel = (typeof GradeLevel)[keyof typeof GradeLevel];

/**
 * Term/Semester
 */
export const Term = {
  T1: 'T1', // Term 1
  T2: 'T2', // Term 2
} as const;

export type Term = (typeof Term)[keyof typeof Term];

/**
 * A-DTM Answer classification for Section 1
 */
export const AdtmAnswerType = {
  CORRECT: 'CORRECT',
  MISTAKE: 'MISTAKE',
  UNSOLVED: 'UNSOLVED',
} as const;

export type AdtmAnswerType = (typeof AdtmAnswerType)[keyof typeof AdtmAnswerType];

/**
 * Question difficulty level
 */
export const DifficultyLevel = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type DifficultyLevel = (typeof DifficultyLevel)[keyof typeof DifficultyLevel];

/**
 * Exam type (MIDTERM/FINAL distinction)
 */
export const ExamType = {
  MIDTERM: 'MIDTERM',
  FINAL: 'FINAL',
} as const;

export type ExamType = (typeof ExamType)[keyof typeof ExamType];

/**
 * Answer type for questions (Multiple choice vs Short answer)
 */
export const AnswerType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  SHORT_ANSWER: 'SHORT_ANSWER',
} as const;

export type AnswerType = (typeof AnswerType)[keyof typeof AnswerType];
