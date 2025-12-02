import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../database/entities/user.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole, SubmissionStatus } from '@shared/types/enum';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudentSubmission)
    private readonly submissionRepository: Repository<StudentSubmission>,
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
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = this.configService.get<number>(
      'app.bcryptSaltRounds',
      10,
    );
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
        ? recentSubmissions.reduce(
            (sum, s) => sum + (s.standardScore || 0),
            0,
          ) / recentSubmissions.length
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
}

