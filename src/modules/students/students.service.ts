import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../database/entities/user.entity';
import { Class } from '../../database/entities/class.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import {
  AssignmentStatus,
  StudentAssignment,
} from '../../database/entities/student-assignment.entity';
import { Test } from '../../database/entities/test.entity';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AvailableStudentsQueryDto } from './dto/available-students-query.dto';
import { UserRole, SubmissionStatus, TestType } from '../../../../frontend/src/shared/types/enum';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudentSubmission)
    private readonly submissionRepository: Repository<StudentSubmission>,
    @InjectRepository(StudentAssignment)
    private readonly assignmentRepository: Repository<StudentAssignment>,
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get student profile
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.STUDENT },
      select: [
        'id',
        'username',
        'email',
        'fullName',
        'school',
        'grade',
        'parentName',
        'parentContact',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Student not found');
    }

    return user;
  }

  /**
   * Update student profile
   */
  async updateProfile(userId: string, updateDto: UpdateStudentProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.STUDENT },
    });

    if (!user) {
      throw new NotFoundException('Student not found');
    }

    // Update allowed fields only
    if (updateDto.fullName !== undefined) {
      user.fullName = updateDto.fullName;
    }
    if (updateDto.school !== undefined) {
      user.school = updateDto.school;
    }
    if (updateDto.parentName !== undefined) {
      user.parentName = updateDto.parentName;
    }
    if (updateDto.parentContact !== undefined) {
      user.parentContact = updateDto.parentContact;
    }

    await this.userRepository.save(user);

    // Return without password
    const { password, ...result } = user;
    return result;
  }

  /**
   * Change password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = this.configService.get<number>('app.bcryptSaltRounds', 10);
    user.password = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  /**
   * Get test history summary
   */
  async getTestHistorySummary(studentId: string) {
    // Total tests
    const totalTests = await this.submissionRepository.count({
      where: { studentId },
    });

    // Completed tests
    const completedTests = await this.submissionRepository.count({
      where: {
        studentId,
        status: SubmissionStatus.GRADED,
      },
    });

    // Pending tests
    const pendingTests = totalTests - completedTests;

    // Get recent submissions with scores
    const recentSubmissions = await this.submissionRepository.find({
      where: {
        studentId,
        status: SubmissionStatus.GRADED,
      },
      relations: ['test'],
      order: { gradedAt: 'DESC' },
      take: 5,
    });

    // Calculate average score
    const avgScore =
      recentSubmissions.length > 0
        ? recentSubmissions.reduce((sum, s) => sum + (s.standardScore || 0), 0) /
          recentSubmissions.length
        : 0;

    return {
      totalTests,
      completedTests,
      pendingTests,
      avgScore: Math.round(avgScore),
      recentTests: recentSubmissions.map((s) => ({
        testTitle: s.test.title,
        testCode: s.test.testCode,
        score: s.standardScore,
        gradedAt: s.gradedAt,
      })),
    };
  }

  /**
   * Get students available for A-DTM assignment
   * Returns students that don't have an active A-DTM test
   */
  async getAvailableStudentsForAdtm(query: AvailableStudentsQueryDto, teacherId: string) {
    const { page = 1, limit = 50, grade, classId, search } = query;
    const skip = (page - 1) * limit;

    // Step 1: Get student IDs that match the criteria (using manual joins)
    const studentIdsQuery = this.userRepository
      .createQueryBuilder('user')
      .innerJoin('class_students', 'cs', 'cs.student_id = user.id')
      .innerJoin('classes', 'classes', 'classes.id = cs.class_id')
      .select('DISTINCT user.id', 'id')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('classes.teacher_id = :teacherId', { teacherId });

    // Filter by grade
    if (grade) {
      studentIdsQuery.andWhere('user.grade = :grade', { grade });
    }

    // Filter by class (only teacher's classes)
    if (classId) {
      studentIdsQuery.andWhere('classes.id = :classId', { classId });
    }

    // Search by name, username, or student ID
    if (search) {
      studentIdsQuery.andWhere(
        '(user.fullName ILIKE :search OR user.username ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get student IDs
    const studentIdsResult = await studentIdsQuery.getRawMany();
    const studentIds = studentIdsResult.map((r) => r.id);

    if (studentIds.length === 0) {
      return {
        students: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }

    // Step 2: Get full student entities (without relations to avoid TypeORM issues)
    const students = await this.userRepository.find({
      where: { id: In(studentIds) },
      order: { fullName: 'ASC' },
      skip,
      take: limit,
    });

    // Step 3: Manually load classes for each student using the join table
    const studentIdsForClasses = students.map((s) => s.id);
    if (studentIdsForClasses.length > 0) {
      const classStudents = await this.userRepository.manager
        .createQueryBuilder()
        .select('cs.student_id', 'studentId')
        .addSelect('c.id', 'classId')
        .addSelect('c.name', 'className')
        .from('class_students', 'cs')
        .innerJoin('classes', 'c', 'c.id = cs.class_id')
        .where('cs.student_id IN (:...studentIds)', { studentIds: studentIdsForClasses })
        .getRawMany();

      // Group classes by student ID
      const classesByStudent = new Map<string, Array<{ id: string; name: string }>>();
      classStudents.forEach((row) => {
        if (!classesByStudent.has(row.studentId)) {
          classesByStudent.set(row.studentId, []);
        }
        classesByStudent.get(row.studentId)?.push({
          id: row.classId,
          name: row.className,
        });
      });

      // Assign classes to students
      students.forEach((student) => {
        const classes = classesByStudent.get(student.id) || [];
        // Create a simple array that matches the expected structure
        student.enrolledClasses = classes.map(
          (c) =>
            ({
              id: c.id,
              name: c.name,
            }) as Class,
        );
      });
    }

    // Get total count (need separate query for distinct count)
    const countQuery = this.userRepository
      .createQueryBuilder('user')
      .innerJoin('class_students', 'cs', 'cs.student_id = user.id')
      .innerJoin('classes', 'classes', 'classes.id = cs.class_id')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('classes.teacher_id = :teacherId', { teacherId })
      .select('COUNT(DISTINCT user.id)', 'count');

    if (grade) {
      countQuery.andWhere('user.grade = :grade', { grade });
    }

    if (classId) {
      countQuery.andWhere('classes.id = :classId', { classId });
    }

    if (search) {
      countQuery.andWhere(
        '(user.fullName ILIKE :search OR user.username ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const totalResult = await countQuery.getRawOne();
    const total = parseInt(totalResult.count, 10);

    // Get all active A-DTM assignments for these students
    const studentIdsForAssignments = students.map((s) => s.id);
    const activeAdtmAssignments = await this.assignmentRepository.find({
      where: {
        studentId: In(studentIdsForAssignments),
        status: In([AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS]),
      },
      relations: ['test'],
    });

    // Filter to only A-DTM tests
    const activeAdtmTestIds = new Set(
      activeAdtmAssignments
        .filter((a) => a.test.testType === TestType.ADTM)
        .map((a) => a.studentId),
    );

    // Get last A-DTM test for each student
    const lastAdtmSubmissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.test', 'test')
      .where('submission.studentId IN (:...studentIds)', { studentIds: studentIdsForAssignments })
      .andWhere('test.testType = :testType', { testType: TestType.ADTM })
      .andWhere('submission.status = :status', { status: SubmissionStatus.GRADED })
      .orderBy('submission.gradedAt', 'DESC')
      .getMany();

    const lastAdtmByStudent = new Map<string, StudentSubmission>();
    lastAdtmSubmissions.forEach((s) => {
      if (!lastAdtmByStudent.has(s.studentId)) {
        lastAdtmByStudent.set(s.studentId, s);
      }
    });

    // Build response
    const result = students.map((student) => {
      const hasActiveAdtm = activeAdtmTestIds.has(student.id);
      const lastAdtm = lastAdtmByStudent.get(student.id);

      // Get student's class name
      const studentClass = student.enrolledClasses?.[0];

      return {
        id: student.id,
        studentId: student.username,
        name: student.fullName,
        avatar: null, // Can be added later if avatars are implemented
        grade: student.grade || '',
        class: studentClass?.name || 'No Class',
        classId: studentClass?.id || null,
        hasActiveAdtm,
        lastAdtmTest: lastAdtm
          ? {
              testCode: lastAdtm.test.testCode,
              date: lastAdtm.gradedAt || lastAdtm.createdAt,
              score: lastAdtm.standardScore || 0,
            }
          : null,
      };
    });

    return {
      students: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
