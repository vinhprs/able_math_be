import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import {
  StudentAssignment,
  AssignmentStatus,
} from '../../database/entities/student-assignment.entity';
import { Test } from '../../database/entities/test.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { StartTestDto } from './dto/start-test.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { SubmissionStatus, TestType } from '@shared/types/enum';
import { GradingService } from '../grading/grading.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(StudentSubmission)
    private submissionRepo: Repository<StudentSubmission>,
    @InjectRepository(StudentAnswer)
    private answerRepo: Repository<StudentAnswer>,
    @InjectRepository(StudentAssignment)
    private assignmentRepo: Repository<StudentAssignment>,
    @InjectRepository(Test)
    private testRepo: Repository<Test>,
    @InjectRepository(TestQuestion)
    private questionRepo: Repository<TestQuestion>,
    private dataSource: DataSource,
    private gradingService: GradingService,
    private reportsService: ReportsService,
  ) {}

  /**
   * Start test - create draft submission
   */
  async startTest(startDto: StartTestDto, studentId: string) {
    // Verify assignment belongs to student
    const assignment = await this.assignmentRepo.findOne({
      where: {
        id: startDto.assignmentId,
        studentId,
      },
      relations: ['test'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check deadline
    if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
      throw new BadRequestException('This test is overdue');
    }

    // Check if already has submission
    const existingSubmission = await this.submissionRepo.findOne({
      where: {
        assignmentId: assignment.id,
        studentId,
      },
    });

    if (existingSubmission) {
      // Return existing submission if not submitted yet
      if (
        existingSubmission.status !== SubmissionStatus.SUBMITTED &&
        existingSubmission.status !== SubmissionStatus.GRADED
      ) {
        return {
          submissionId: existingSubmission.id,
          message: 'Continuing existing test',
        };
      }
      throw new BadRequestException('Test already submitted');
    }

    // Create submission
    const submission = this.submissionRepo.create({
      assignmentId: assignment.id,
      studentId,
      testId: assignment.testId,
      status: SubmissionStatus.IN_PROGRESS,
    });

    await this.submissionRepo.save(submission);

    // Update assignment status
    assignment.status = AssignmentStatus.IN_PROGRESS;
    await this.assignmentRepo.save(assignment);

    return {
      submissionId: submission.id,
      testId: assignment.testId,
      message: 'Test started successfully',
    };
  }

  /**
   * Get submission with questions for taking test
   */
  async getSubmissionForTaking(submissionId: string, studentId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, studentId },
      relations: ['test', 'test.questions', 'answers', 'assignment'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Cannot take test if already submitted
    if (
      submission.status === SubmissionStatus.SUBMITTED ||
      submission.status === SubmissionStatus.GRADED
    ) {
      throw new BadRequestException('Test already submitted');
    }

    // Get all questions with current answers
    const questions = submission.test.questions.map((question) => {
      const answer = submission.answers.find((a) => a.questionId === question.id);

      return {
        id: question.id,
        questionNumber: question.questionNumber,
        questionText: question.questionText,
        questionImage: question.questionImage,
        score: question.score,
        unitName: question.unitName,
        difficulty: question.difficulty,
        // Don't send correct answer to student!
        studentAnswer: answer?.studentAnswer || '',
        answerId: answer?.id,
      };
    });

    // Sort by question number
    questions.sort((a, b) => a.questionNumber - b.questionNumber);

    return {
      submission: {
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt,
      },
      test: {
        id: submission.test.id,
        title: submission.test.title,
        testCode: submission.test.testCode,
        totalScore: submission.test.totalScore,
        testType: submission.test.testType,
      },
      assignment: {
        deadline: submission.assignment.deadline,
      },
      questions,
      progress: {
        answered: submission.answers.filter((a) => a.studentAnswer).length,
        total: questions.length,
      },
    };
  }

  /**
   * Save single answer (auto-save)
   */
  async saveAnswer(
    submissionId: string,
    questionId: string,
    saveDto: SaveAnswerDto,
    studentId: string,
  ) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, studentId },
    });

    if (!submission) {
      throw new ForbiddenException('Not authorized');
    }

    if (
      submission.status === SubmissionStatus.SUBMITTED ||
      submission.status === SubmissionStatus.GRADED
    ) {
      throw new BadRequestException('Cannot modify submitted test');
    }

    // Verify question belongs to test
    const question = await this.questionRepo.findOne({
      where: {
        id: questionId,
        testId: submission.testId,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Find or create answer
    let answer = await this.answerRepo.findOne({
      where: {
        submissionId,
        questionId,
      },
    });

    if (answer) {
      // Update existing answer
      answer.studentAnswer = saveDto.answer;
      answer.updatedAt = new Date();
    } else {
      // Create new answer
      answer = this.answerRepo.create({
        submissionId,
        questionId,
        studentAnswer: saveDto.answer,
      });
    }

    await this.answerRepo.save(answer);

    return {
      success: true,
      answerId: answer.id,
      message: 'Answer saved',
    };
  }

  /**
   * Save multiple answers at once (batch)
   */
  async saveAnswersBatch(submissionId: string, answers: SaveAnswerDto[], studentId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, studentId },
    });

    if (!submission) {
      throw new ForbiddenException('Not authorized');
    }

    if (
      submission.status === SubmissionStatus.SUBMITTED ||
      submission.status === SubmissionStatus.GRADED
    ) {
      throw new BadRequestException('Cannot modify submitted test');
    }

    // Use transaction for batch save
    await this.dataSource.transaction(async (manager) => {
      for (const answerDto of answers) {
        // Verify question belongs to test
        const question = await manager.findOne(TestQuestion, {
          where: {
            id: answerDto.questionId,
            testId: submission.testId,
          },
        });

        if (!question) continue; // Skip invalid questions

        // Find or create answer
        let answer = await manager.findOne(StudentAnswer, {
          where: {
            submissionId,
            questionId: answerDto.questionId,
          },
        });

        if (answer) {
          answer.studentAnswer = answerDto.answer;
        } else {
          answer = manager.create(StudentAnswer, {
            submissionId,
            questionId: answerDto.questionId,
            studentAnswer: answerDto.answer,
          });
        }

        await manager.save(StudentAnswer, answer);
      }
    });

    return {
      success: true,
      saved: answers.length,
      message: 'Answers saved',
    };
  }

  /**
   * Submit test - final submission
   * Automatically grades Achievement tests
   */
  async submitTest(submissionId: string, studentId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, studentId },
      relations: ['assignment', 'test', 'answers'],
    });

    if (!submission) {
      throw new ForbiddenException('Not authorized');
    }

    if (
      submission.status === SubmissionStatus.SUBMITTED ||
      submission.status === SubmissionStatus.GRADED
    ) {
      throw new BadRequestException('Test already submitted');
    }

    // Check if all questions have answers (optional warning)
    const totalQuestions = await this.questionRepo.count({
      where: { testId: submission.testId },
    });

    const answeredQuestions = submission.answers.filter(
      (a) => a.studentAnswer && a.studentAnswer.trim() !== '',
    ).length;

    // Update submission
    submission.status = SubmissionStatus.SUBMITTED;
    submission.submittedAt = new Date();
    await this.submissionRepo.save(submission);

    // Update assignment status
    submission.assignment.status = AssignmentStatus.SUBMITTED;
    await this.assignmentRepo.save(submission.assignment);

    // AUTO-GRADE Achievement tests
    let gradingResult = null;
    let reportGenerated = false;

    if (submission.test.testType === TestType.ACHIEVEMENT) {
      try {
        this.logger.log(`Auto-grading Achievement test submission ${submissionId}`);
        gradingResult = await this.gradingService.autoGradeOnSubmit(submissionId);
        this.logger.log(`Auto-grading completed: ${gradingResult.standardScore.toFixed(2)}%`);

        // AUTO-GENERATE REPORT CARD
        try {
          this.logger.log(`Auto-generating report card for submission ${submissionId}`);
          await this.reportsService.generateAchievementReport(submissionId);
          reportGenerated = true;
          this.logger.log(`Report card generated successfully for submission ${submissionId}`);
        } catch (reportError) {
          this.logger.error(
            `Failed to generate report for submission ${submissionId}:`,
            reportError,
          );
          // Don't fail the submission if report generation fails
          // Report can be generated later by teacher/admin
        }
      } catch (error) {
        this.logger.error(`Auto-grading failed for submission ${submissionId}:`, error);
        // Don't fail the submission if grading fails
        // Can be re-graded later
      }
    }

    return {
      success: true,
      submissionId: submission.id,
      submittedAt: submission.submittedAt,
      answeredQuestions,
      totalQuestions,
      testType: submission.test.testType,
      message:
        submission.test.testType === TestType.ACHIEVEMENT
          ? reportGenerated
            ? 'Test submitted, graded, and report generated successfully'
            : 'Test submitted and graded successfully'
          : 'Test submitted successfully',
      grading: gradingResult
        ? {
            totalRawScore: gradingResult.totalRawScore,
            maxScore: gradingResult.maxScore,
            standardScore: gradingResult.standardScore,
            correctCount: gradingResult.correctCount,
            incorrectCount: gradingResult.incorrectCount,
          }
        : null,
      reportGenerated, // Indicate if report was created
    };
  }

  /**
   * Get submission progress
   */
  async getSubmissionProgress(submissionId: string, studentId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, studentId },
      relations: ['test', 'answers'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const totalQuestions = await this.questionRepo.count({
      where: { testId: submission.testId },
    });

    const answeredQuestions = submission.answers.filter(
      (a) => a.studentAnswer && a.studentAnswer.trim() !== '',
    ).length;

    const unansweredQuestions = await this.questionRepo
      .createQueryBuilder('q')
      .leftJoin(StudentAnswer, 'a', 'a.questionId = q.id AND a.submissionId = :submissionId', {
        submissionId,
      })
      .where('q.testId = :testId', { testId: submission.testId })
      .andWhere('(a.studentAnswer IS NULL OR a.studentAnswer = "")')
      .select('q.questionNumber', 'questionNumber')
      .orderBy('q.questionNumber', 'ASC')
      .getRawMany();

    return {
      total: totalQuestions,
      answered: answeredQuestions,
      percentage: Math.round((answeredQuestions / totalQuestions) * 100),
      unansweredQuestions: unansweredQuestions.map((q) => q.questionNumber),
    };
  }
}
