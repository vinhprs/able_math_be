import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, LessThan } from 'typeorm';
import {
  StudentAssignment,
  AssignmentStatus,
} from '../../database/entities/student-assignment.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { Test } from '../../database/entities/test.entity';
import { User } from '../../database/entities/user.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { StudentAssignmentQueryDto } from './dto/student-assignment-query.dto';
import { TestStatus, UserRole } from '@shared/types/enum';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(StudentAssignment)
    private assignmentRepo: Repository<StudentAssignment>,
    @InjectRepository(StudentSubmission)
    private submissionRepo: Repository<StudentSubmission>,
    @InjectRepository(Test)
    private testRepo: Repository<Test>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Create single assignment
   */
  async create(createDto: CreateAssignmentDto, teacherId: string) {
    // Validate test exists and is published
    const test = await this.testRepo.findOne({
      where: { id: createDto.testId },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    if (test.status !== TestStatus.PUBLISHED) {
      throw new BadRequestException('Cannot assign unpublished test');
    }

    // Validate student exists
    const student = await this.userRepo.findOne({
      where: { id: createDto.studentId, role: UserRole.STUDENT },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if already assigned
    const existingAssignment = await this.assignmentRepo.findOne({
      where: {
        testId: createDto.testId,
        studentId: createDto.studentId,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException('Test already assigned to this student');
    }

    // Create assignment
    const assignment = this.assignmentRepo.create({
      testId: createDto.testId,
      studentId: createDto.studentId,
      assignedById: teacherId,
      deadline: createDto.deadline && new Date(createDto.deadline),
      status: AssignmentStatus.PENDING,
    });

    await this.assignmentRepo.save(assignment);

    return {
      ...assignment,
      test: { id: test.id, title: test.title, testCode: test.testCode },
      student: { id: student.id, fullName: student.fullName },
    };
  }

  /**
   * Bulk assign test to multiple students
   */
  async bulkAssign(bulkDto: BulkAssignDto, teacherId: string) {
    // Validate test
    const test = await this.testRepo.findOne({
      where: { id: bulkDto.testId },
    });

    if (!test || test.status !== TestStatus.PUBLISHED) {
      throw new BadRequestException('Test not found or not published');
    }

    // Validate students
    const students = await this.userRepo.find({
      where: { id: In(bulkDto.studentIds), role: UserRole.STUDENT },
    });

    if (students.length !== bulkDto.studentIds.length) {
      throw new BadRequestException('Some students not found');
    }

    // Check existing assignments
    const existingAssignments = await this.assignmentRepo.find({
      where: {
        testId: bulkDto.testId,
        studentId: In(bulkDto.studentIds),
      },
    });

    const existingStudentIds = new Set(existingAssignments.map((a) => a.studentId));

    // Filter out already assigned students
    const studentsToAssign = students.filter((s) => !existingStudentIds.has(s.id));

    if (studentsToAssign.length === 0) {
      throw new BadRequestException('All students already assigned this test');
    }

    // Create assignments
    const assignments = studentsToAssign.map((student) =>
      this.assignmentRepo.create({
        testId: bulkDto.testId,
        studentId: student.id,
        assignedById: teacherId,
        deadline: bulkDto.deadline && new Date(bulkDto.deadline),
        status: AssignmentStatus.PENDING,
      }),
    );

    await this.assignmentRepo.save(assignments);

    return {
      assigned: assignments.length,
      skipped: existingStudentIds.size,
      assignments: assignments.map((a) => ({
        id: a.id,
        studentName: studentsToAssign.find((s) => s.id === a.studentId)?.fullName,
      })),
    };
  }

  /**
   * Get teacher's assignments with filters
   */
  async getTeacherAssignments(teacherId: string, query: AssignmentQueryDto) {
    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.test', 'test')
      .leftJoinAndSelect('assignment.student', 'student')
      .where('assignment.assignedById = :teacherId', { teacherId });

    // Filters
    if (query.status) {
      qb.andWhere('assignment.status = :status', { status: query.status });
    }

    if (query.testId) {
      qb.andWhere('assignment.testId = :testId', { testId: query.testId });
    }

    if (query.studentId) {
      qb.andWhere('assignment.studentId = :studentId', { studentId: query.studentId });
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.skip((page - 1) * limit).take(limit);

    // Sort by created date (newest first)
    qb.orderBy('assignment.createdAt', 'DESC');

    const [assignments, total] = await qb.getManyAndCount();

    return {
      data: assignments.map((a) => ({
        id: a.id,
        test: {
          id: a.test.id,
          title: a.test.title,
          testCode: a.test.testCode,
          totalScore: a.test.totalScore,
        },
        student: {
          id: a.student.id,
          fullName: a.student.fullName,
          grade: a.student.grade,
        },
        status: a.status,
        deadline: a.deadline,
        createdAt: a.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get assignment details
   */
  async findOne(id: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['test', 'test.questions', 'student', 'assignedBy'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return {
      ...assignment,
      test: {
        id: assignment.test.id,
        title: assignment.test.title,
        testCode: assignment.test.testCode,
        totalScore: assignment.test.totalScore,
        questionCount: assignment.test.questions?.length || 0,
      },
      student: {
        id: assignment.student.id,
        fullName: assignment.student.fullName,
        email: assignment.student.email,
        grade: assignment.student.grade,
      },
      assignedBy: {
        id: assignment.assignedBy.id,
        fullName: assignment.assignedBy.fullName,
      },
    };
  }

  /**
   * Get students who received specific test
   */
  async getAssignedStudents(testId: string, teacherId: string) {
    const assignments = await this.assignmentRepo.find({
      where: {
        testId,
        assignedById: teacherId,
      },
      relations: ['student'],
      order: { createdAt: 'DESC' },
    });

    return assignments.map((a) => ({
      assignmentId: a.id,
      student: {
        id: a.student.id,
        fullName: a.student.fullName,
        grade: a.student.grade,
      },
      status: a.status,
      assignedAt: a.createdAt,
      deadline: a.deadline,
    }));
  }

  /**
   * Delete assignment (only if not started)
   */
  async remove(id: string, teacherId: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check ownership
    if (assignment.assignedById !== teacherId) {
      throw new ForbiddenException('You can only delete your own assignments');
    }

    // Cannot delete if student already started
    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new BadRequestException('Cannot delete assignment that has been started');
    }

    await this.assignmentRepo.remove(assignment);
  }

  /**
   * Extend deadline
   */
  async extendDeadline(id: string, newDeadline: Date, teacherId: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check ownership
    if (assignment.assignedById !== teacherId) {
      throw new ForbiddenException('You can only modify your own assignments');
    }

    // Validate new deadline is in future
    if (new Date(newDeadline) <= new Date()) {
      throw new BadRequestException('New deadline must be in the future');
    }

    assignment.deadline = new Date(newDeadline);
    await this.assignmentRepo.save(assignment);

    return {
      message: 'Deadline extended successfully',
      newDeadline: assignment.deadline,
    };
  }

  /**
   * Get student's assignments with filters
   */
  async getStudentAssignments(studentId: string, query: StudentAssignmentQueryDto) {
    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.test', 'test')
      .leftJoinAndSelect('assignment.assignedBy', 'teacher')
      .where('assignment.studentId = :studentId', { studentId });

    // Filter by status
    if (query.status) {
      qb.andWhere('assignment.status = :status', { status: query.status });
    }

    // Filter by deadline existence
    if (query.hasDeadline !== undefined) {
      if (query.hasDeadline) {
        qb.andWhere('assignment.deadline IS NOT NULL');
      } else {
        qb.andWhere('assignment.deadline IS NULL');
      }
    }

    // Filter overdue (has deadline and deadline passed and not completed)
    if (query.overdue) {
      qb.andWhere('assignment.deadline < :now', { now: new Date() }).andWhere(
        'assignment.status NOT IN (:...completedStatuses)',
        {
          completedStatuses: [AssignmentStatus.SUBMITTED, AssignmentStatus.GRADED],
        },
      );
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.skip((page - 1) * limit).take(limit);

    // Sort: Overdue first, then by deadline (nulls last), then by created date
    // Use addSelect with CASE expression as alias, then order by it
    qb.addSelect('CASE WHEN assignment.deadline IS NULL THEN 1 ELSE 0 END', 'deadline_null_order')
      .orderBy('deadline_null_order', 'ASC')
      .addOrderBy('assignment.deadline', 'ASC')
      .addOrderBy('assignment.createdAt', 'DESC');

    const [assignments, total] = await qb.getManyAndCount();

    // Enrich with submission info if exists
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await this.submissionRepo.findOne({
          where: {
            assignmentId: assignment.id,
            studentId,
          },
          order: { createdAt: 'DESC' },
        });

        const now = new Date();
        const isOverdue =
          assignment.deadline &&
          new Date(assignment.deadline) < now &&
          assignment.status !== AssignmentStatus.SUBMITTED &&
          assignment.status !== AssignmentStatus.GRADED;

        return {
          id: assignment.id,
          test: {
            id: assignment.test.id,
            title: assignment.test.title,
            testCode: assignment.test.testCode,
            totalScore: assignment.test.totalScore,
          },
          assignedBy: {
            fullName: assignment.assignedBy.fullName,
          },
          status: assignment.status,
          deadline: assignment.deadline,
          isOverdue,
          assignedAt: assignment.createdAt,
          submission: submission
            ? {
                id: submission.id,
                status: submission.status,
                score: submission.standardScore,
                submittedAt: submission.submittedAt,
              }
            : null,
        };
      }),
    );

    return {
      data: enrichedAssignments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get assignment detail for student
   */
  async getStudentAssignmentDetail(assignmentId: string, studentId: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, studentId },
      relations: ['test', 'test.questions', 'assignedBy'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Get submission if exists
    const submission = await this.submissionRepo.findOne({
      where: {
        assignmentId: assignment.id,
        studentId,
      },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const isOverdue =
      assignment.deadline &&
      new Date(assignment.deadline) < now &&
      assignment.status !== AssignmentStatus.SUBMITTED &&
      assignment.status !== AssignmentStatus.GRADED;

    // Calculate time remaining
    let timeRemaining = null;
    if (assignment.deadline && !isOverdue) {
      const diff = new Date(assignment.deadline).getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      timeRemaining = { days, hours };
    }

    return {
      id: assignment.id,
      test: {
        id: assignment.test.id,
        title: assignment.test.title,
        testCode: assignment.test.testCode,
        totalScore: assignment.test.totalScore,
        questionCount: assignment.test.questions?.length || 0,
      },
      assignedBy: {
        fullName: assignment.assignedBy.fullName,
      },
      status: assignment.status,
      deadline: assignment.deadline,
      isOverdue,
      timeRemaining,
      assignedAt: assignment.createdAt,
      submission: submission
        ? {
            id: submission.id,
            status: submission.status,
            score: submission.standardScore,
            submittedAt: submission.submittedAt,
            gradedAt: submission.gradedAt,
          }
        : null,
      canStart: assignment.status === AssignmentStatus.PENDING,
      canContinue: assignment.status === AssignmentStatus.IN_PROGRESS && submission,
      canViewResult: assignment.status === AssignmentStatus.GRADED && submission,
    };
  }

  /**
   * Get upcoming deadlines (next 7 days)
   */
  async getUpcomingDeadlines(studentId: string) {
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);

    const assignments = await this.assignmentRepo.find({
      where: {
        studentId,
        deadline: Between(now, sevenDaysLater),
        status: AssignmentStatus.PENDING,
      },
      relations: ['test'],
      order: { deadline: 'ASC' },
      take: 5,
    });

    return assignments.map((assignment) => {
      const diff = new Date(assignment.deadline).getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return {
        id: assignment.id,
        testTitle: assignment.test.title,
        testCode: assignment.test.testCode,
        deadline: assignment.deadline,
        timeRemaining: { days, hours },
      };
    });
  }

  /**
   * Get student assignment statistics
   */
  async getStudentAssignmentStats(studentId: string) {
    const now = new Date();

    // Total assignments
    const total = await this.assignmentRepo.count({
      where: { studentId },
    });

    // Pending (not started)
    const pending = await this.assignmentRepo.count({
      where: {
        studentId,
        status: AssignmentStatus.PENDING,
      },
    });

    // In progress
    const inProgress = await this.assignmentRepo.count({
      where: {
        studentId,
        status: AssignmentStatus.IN_PROGRESS,
      },
    });

    // Submitted (waiting for grading)
    const submitted = await this.assignmentRepo.count({
      where: {
        studentId,
        status: AssignmentStatus.SUBMITTED,
      },
    });

    // Graded (completed)
    const graded = await this.assignmentRepo.count({
      where: {
        studentId,
        status: AssignmentStatus.GRADED,
      },
    });

    // Overdue
    const overdue = await this.assignmentRepo.count({
      where: {
        studentId,
        deadline: LessThan(now),
        status: AssignmentStatus.PENDING,
      },
    });

    // Due soon (next 48 hours)
    const twoDaysLater = new Date();
    twoDaysLater.setDate(now.getDate() + 2);

    const dueSoon = await this.assignmentRepo.count({
      where: {
        studentId,
        deadline: Between(now, twoDaysLater),
        status: AssignmentStatus.PENDING,
      },
    });

    return {
      total,
      pending,
      inProgress,
      submitted,
      graded,
      overdue,
      dueSoon,
      completionRate: total > 0 ? Math.round((graded / total) * 100) : 0,
    };
  }
}
