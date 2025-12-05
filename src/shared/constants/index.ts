/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * Test code format: {GRADE}_T{TERM}_L{LEVEL}_{VERSION}
 * Example: E4_T1_L1_01
 */
export const TEST_CODE_REGEX = /^[EM]\d_T[12]_L\d+_\d{2}$/;

/**
 * A-DTM Test configuration
 */
export const ADTM_CONFIG = {
  SECTION_1_QUESTIONS: 20,
  SECTION_2_QUESTIONS: 15,
  SECTION_3_QUESTIONS: 15,
  SECTION_4_QUESTIONS: 15,
  SECTION_5_QUESTIONS: 15,
  TOTAL_QUESTIONS: 80,
  STANDARD_SCORE_BASE: 100,
} as const;

/**
 * Achievement Test configuration
 */
export const ACHIEVEMENT_CONFIG = {
  PASSING_SCORE: 80,
  TOTAL_QUESTIONS: 50,
} as const;

/**
 * Password requirements
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 50,
} as const;

/**
 * Username requirements
 */
export const USERNAME_REQUIREMENTS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
} as const;

/**
 * JWT configuration
 */
export const JWT_CONFIG = {
  DEFAULT_EXPIRES_IN: '7d',
} as const;

/**
 * Bcrypt configuration
 */
export const BCRYPT_CONFIG = {
  DEFAULT_SALT_ROUNDS: 10,
} as const;
