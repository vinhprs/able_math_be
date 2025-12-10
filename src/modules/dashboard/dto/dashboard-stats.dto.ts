export class AdminStatsDto {
  totalStudents: number;
  totalTeachers: number;
  totalTests: number;
  activeSubmissions: number;
  testsByGrade: { grade: string; count: number }[];
  submissionsThisWeek: { date: string; count: number }[];
}

export class RecentActivityDto {
  tests: Array<{
    id: string;
    testCode: string;
    title: string;
    createdAt: Date;
  }>;
  students: Array<{
    id: string;
    username: string;
    fullName: string;
    createdAt: Date;
  }>;
  submissions: Array<{
    id: string;
    testCode: string;
    studentName: string;
    submittedAt: Date;
  }>;
}

export class TeacherStatsDto {
  totalClasses: number;
  pendingGrading: number;
  thisWeekTests: number;
  totalStudents: number;
}

export class TeacherClassDto {
  id: string;
  name: string;
  studentCount: number;
  recentActivity: string;
}

export class UpcomingDeadlineDto {
  id: string;
  testCode: string;
  title: string;
  dueDate: Date;
  pendingGrading: number;
}

export class StudentStatsDto {
  pendingTests: number;
  completedTests: number;
  averageScore: number;
  latestScore: number;
  latestResultId: string | null;
  scoreTrend: { date: string; score: number }[];
}

export class StudentTestDto {
  id: string;
  testId: string;
  testCode: string;
  title: string;
  status: string;
  dueDate: Date | null;
  submittedAt: Date | null;
  score: number | null;
}
