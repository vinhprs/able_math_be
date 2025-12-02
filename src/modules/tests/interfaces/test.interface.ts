import { Test } from '../../../database/entities/test.entity';
import { TestQuestion } from '../../../database/entities/test-question.entity';

export interface TestWithQuestions extends Test {
  questions: TestQuestion[];
}

export interface TestStatistics {
  totalSubmissions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

export interface TestDetailResponse extends TestWithQuestions {
  statistics?: TestStatistics;
}

export interface PaginatedTestResponse {
  data: Test[];
  total: number;
  page: number;
  totalPages: number;
}
