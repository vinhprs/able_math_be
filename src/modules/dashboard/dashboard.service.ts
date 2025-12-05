import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Test } from '../../database/entities/test.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAssignment } from '../../database/entities/student-assignment.entity';
import { UserRole, SubmissionStatus, TestType } from '../../../../frontend/src/shared/types/enum';
import {
  AdminStatsDto,
  RecentActivityDto,
  TeacherStatsDto,
  TeacherClassDto,
  UpcomingDeadlineDto,
  StudentStatsDto,
  StudentTestDto,
} from './dto/dashboard-stats.dto';
// Date utility functions
function startOfWeek(date: Date, weekStartsOn: number = 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date, weekStartsOn: number = 1): Date {
  const start = startOfWeek(date, weekStartsOn);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatDate(date: Date, formatStr: string): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const d = new Date(date);
  if (formatStr === 'MMM d') {
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
  return d.toISOString();
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    @InjectRepository(StudentSubmission)
    private readonly submissionRepository: Repository<StudentSubmission>,
    @InjectRepository(StudentAssignment)
    private readonly assignmentRepository: Repository<StudentAssignment>,
  ) {}

  /**
   * Get admin dashboard statistics
   */
  async getAdminStats(): Promise<AdminStatsDto> {
    // Count users by role
    const totalStudents = await this.userRepository.count({
      where: { role: UserRole.STUDENT, isActive: true },
    });

    const totalTeachers = await this.userRepository.count({
      where: { role: UserRole.TEACHER, isActive: true },
    });

    // Count all tests
    const totalTests = await this.testRepository.count();

    // Count active submissions (submitted but not graded, or in progress)
    const activeSubmissions = await this.submissionRepository.count({
      where: [{ status: SubmissionStatus.SUBMITTED }, { status: SubmissionStatus.IN_PROGRESS }],
    });

    // Tests by grade
    const testsByGrade = await this.testRepository
      .createQueryBuilder('test')
      .select('test.grade', 'grade')
      .addSelect('COUNT(*)', 'count')
      .groupBy('test.grade')
      .getRawMany();

    // Submissions this week
    const weekStart = startOfWeek(new Date(), 1);
    const weekEnd = endOfWeek(new Date(), 1);
    const submissionsThisWeek = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('DATE(submission.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('submission.created_at >= :start', { start: weekStart })
      .andWhere('submission.created_at <= :end', { end: weekEnd })
      .groupBy('DATE(submission.created_at)')
      .orderBy('DATE(submission.created_at)', 'ASC')
      .getRawMany();

    // Format submissions this week data
    const formattedSubmissions = submissionsThisWeek.map((item) => ({
      date: formatDate(new Date(item.date), 'MMM d'),
      count: parseInt(item.count, 10),
    }));

    return {
      totalStudents,
      totalTeachers,
      totalTests,
      activeSubmissions,
      testsByGrade: testsByGrade.map((item) => ({
        grade: item.grade,
        count: parseInt(item.count, 10),
      })),
      submissionsThisWeek: formattedSubmissions,
    };
  }

  /**
   * Get recent activity for admin
   */
  async getRecentActivity(): Promise<RecentActivityDto> {
    // Recent tests (last 5)
    const recentTests = await this.testRepository.find({
      take: 5,
      order: { createdAt: 'DESC' },
      select: ['id', 'testCode', 'title', 'createdAt'],
    });

    // Recent students (last 5)
    const recentStudents = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
      take: 5,
      order: { createdAt: 'DESC' },
      select: ['id', 'username', 'fullName', 'createdAt'],
    });

    // Recent submissions (last 5)
    // Fetch more than needed, then sort and take top 5
    const allRecentSubmissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.test', 'test')
      .leftJoinAndSelect('submission.student', 'student')
      .where('submission.status = :status', { status: SubmissionStatus.SUBMITTED })
      .take(20) // Fetch more to ensure we get the 5 most recent after sorting
      .getMany();

    // Sort by submittedAt or createdAt, then take top 5
    const recentSubmissions = allRecentSubmissions
      .sort((a, b) => {
        const dateA = a.submittedAt || a.createdAt;
        const dateB = b.submittedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);

    return {
      tests: recentTests.map((test) => ({
        id: test.id,
        testCode: test.testCode,
        title: test.title,
        createdAt: test.createdAt,
      })),
      students: recentStudents.map((student) => ({
        id: student.id,
        username: student.username,
        fullName: student.fullName,
        createdAt: student.createdAt,
      })),
      submissions: recentSubmissions.map((submission) => ({
        id: submission.id,
        testCode: submission.test?.testCode || '',
        studentName: submission.student?.fullName || '',
        submittedAt: submission.submittedAt || submission.createdAt,
      })),
    };
  }

  /**
   * Get teacher dashboard statistics
   */
  async getTeacherStats(teacherId: string): Promise<TeacherStatsDto> {
    // Count unique students assigned to this teacher
    const assignments = await this.assignmentRepository.find({
      where: { assignedById: teacherId },
      relations: ['student'],
    });

    const uniqueStudents = new Set(assignments.map((a) => a.studentId)).size;

    // Count pending grading (A-DTM submissions assigned by this teacher that need grading)
    const pendingGrading = await this.submissionRepository
      .createQueryBuilder('submission')
      .innerJoin('submission.assignment', 'assignment')
      .innerJoin('submission.test', 'test')
      .where('assignment.assigned_by_id = :teacherId', { teacherId })
      .andWhere('test.test_type = :testType', { testType: TestType.ADTM })
      .andWhere('submission.status = :status', { status: SubmissionStatus.SUBMITTED })
      .andWhere('submission.graded_at IS NULL')
      .getCount();

    // Count tests assigned this week
    const weekStart = startOfWeek(new Date(), 1);
    const thisWeekTests = await this.assignmentRepository.count({
      where: {
        assignedById: teacherId,
        createdAt: MoreThanOrEqual(weekStart),
      },
    });

    return {
      totalClasses: 0, // TODO: Implement class system
      pendingGrading,
      thisWeekTests,
      totalStudents: uniqueStudents,
    };
  }

  /**
   * Get teacher's classes
   * Note: This is a placeholder - class system needs to be implemented
   */
  async getTeacherClasses(teacherId: string): Promise<TeacherClassDto[]> {
    // TODO: Implement class system
    // For now, return empty array or group by some criteria
    const assignments = await this.assignmentRepository.find({
      where: { assignedById: teacherId },
      relations: ['student'],
    });

    // Group students by grade as a temporary solution
    const studentsByGrade = new Map<string, Set<string>>();
    assignments.forEach((assignment) => {
      const grade = assignment.student?.grade || 'Unknown';
      if (!studentsByGrade.has(grade)) {
        studentsByGrade.set(grade, new Set());
      }
      studentsByGrade.get(grade)?.add(assignment.studentId);
    });

    return Array.from(studentsByGrade.entries()).map(([grade, studentIds]) => ({
      id: `class-${grade}`,
      name: `Grade ${grade}`,
      studentCount: studentIds.size,
      recentActivity: 'No recent activity',
    }));
  }

  /**
   * Get upcoming deadlines for teacher
   */
  async getUpcomingDeadlines(teacherId: string): Promise<UpcomingDeadlineDto[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // Next 30 days

    const assignments = await this.assignmentRepository.find({
      where: {
        assignedById: teacherId,
        deadline: Between(now, futureDate),
      },
      relations: ['test', 'submissions'],
      order: { deadline: 'ASC' },
      take: 10,
    });

    return assignments.map((assignment) => {
      const pendingGrading =
        assignment.submissions?.filter(
          (s) => s.status === SubmissionStatus.SUBMITTED && !s.gradedAt,
        ).length || 0;

      return {
        id: assignment.id,
        testCode: assignment.test?.testCode || '',
        title: assignment.test?.title || '',
        dueDate: assignment.deadline || assignment.createdAt,
        pendingGrading,
      };
    });
  }

  /**
   * Get student dashboard statistics
   */
  async getStudentStats(studentId: string): Promise<StudentStatsDto> {
    // Get all assignments for this student
    const assignments = await this.assignmentRepository.find({
      where: { studentId },
      relations: ['submissions', 'test'],
    });

    // Count pending tests (not started or in progress)
    const pendingTests = assignments.filter(
      (a) =>
        !a.submissions?.some(
          (s) => s.status === SubmissionStatus.SUBMITTED || s.status === SubmissionStatus.GRADED,
        ),
    ).length;

    // Count completed tests (graded)
    const completedTests = assignments.filter((a) =>
      a.submissions?.some((s) => s.status === SubmissionStatus.GRADED),
    ).length;

    // Get all graded submissions
    const gradedSubmissions = await this.submissionRepository.find({
      where: {
        studentId,
        status: SubmissionStatus.GRADED,
      },
      order: { gradedAt: 'DESC' },
    });

    // Calculate average score
    const scores = gradedSubmissions
      .map((s) => s.standardScore || s.totalScore)
      .filter((score): score is number => score !== null && score !== undefined);

    const averageScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    // Latest score
    const latestSubmission = gradedSubmissions[0];
    const latestScore = latestSubmission?.standardScore || latestSubmission?.totalScore || 0;
    const latestResultId = latestSubmission?.id || null;

    // Score trend (last 10 submissions)
    const recentSubmissions = gradedSubmissions.slice(0, 10).reverse();
    const scoreTrend = recentSubmissions.map((submission) => ({
      date: formatDate(
        submission.gradedAt || submission.submittedAt || submission.createdAt,
        'MMM d',
      ),
      score: submission.standardScore || submission.totalScore || 0,
    }));

    return {
      pendingTests,
      completedTests,
      averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      latestScore: Math.round(latestScore * 10) / 10,
      latestResultId,
      scoreTrend,
    };
  }

  /**
   * Get student's assigned tests
   */
  async getStudentTests(studentId: string): Promise<StudentTestDto[]> {
    const assignments = await this.assignmentRepository.find({
      where: { studentId },
      relations: ['test', 'submissions'],
      order: { createdAt: 'DESC' },
    });

    return assignments.map((assignment) => {
      const latestSubmission = assignment.submissions?.sort((a, b) => {
        const dateA = a.submittedAt || a.createdAt;
        const dateB = b.submittedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      })[0];

      // Determine status
      let status = 'NOT_STARTED';
      if (latestSubmission) {
        status = latestSubmission.status;
      } else if (assignment.status === 'IN_PROGRESS') {
        status = 'IN_PROGRESS';
      }

      return {
        id: assignment.id,
        testId: assignment.testId,
        testCode: assignment.test?.testCode || '',
        title: assignment.test?.title || '',
        status,
        dueDate: assignment.deadline,
        submittedAt: latestSubmission?.submittedAt || null,
        score: latestSubmission?.standardScore || latestSubmission?.totalScore || null,
      };
    });
  }
}
