import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { Test } from '../../database/entities/test.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { AdtmSubmission } from '../../database/entities/adtm-submission.entity';
import { ResultQueryDto } from './dto/result-query.dto';
import { SubmissionStatus, TestType } from '@shared/types/enum';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(StudentSubmission)
    private submissionRepo: Repository<StudentSubmission>,
    @InjectRepository(StudentAnswer)
    private answerRepo: Repository<StudentAnswer>,
    @InjectRepository(Test)
    private testRepo: Repository<Test>,
    @InjectRepository(TestQuestion)
    private questionRepo: Repository<TestQuestion>,
    @InjectRepository(AdtmSubmission)
    private adtmRepo: Repository<AdtmSubmission>,
  ) {}

  /**
   * Get all graded results for student
   */
  async getStudentResults(studentId: string, query: ResultQueryDto) {
    const qb = this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.test', 'test')
      .leftJoinAndSelect('submission.assignment', 'assignment')
      .where('submission.studentId = :studentId', { studentId })
      .andWhere('submission.status = :status', { status: SubmissionStatus.GRADED });

    // Filter by test type
    if (query.testType) {
      qb.andWhere('test.testType = :testType', { testType: query.testType });
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.skip((page - 1) * limit).take(limit);

    // Sort by graded date (newest first)
    qb.orderBy('submission.gradedAt', 'DESC');

    const [submissions, total] = await qb.getManyAndCount();

    return {
      data: submissions.map((s) => ({
        id: s.id,
        test: {
          id: s.test.id,
          title: s.test.title,
          testCode: s.test.testCode,
          testType: s.test.testType,
        },
        totalScore: s.totalScore,
        maxScore: s.test.totalScore,
        standardScore: s.standardScore,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get detailed result with question-by-question breakdown
   */
  async getResultDetail(submissionId: string, studentId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, studentId },
      relations: ['test', 'answers', 'adtmData'],
    });

    if (!submission) {
      throw new NotFoundException('Result not found');
    }

    if (submission.status !== SubmissionStatus.GRADED) {
      throw new ForbiddenException('Test has not been graded yet');
    }

    // Get questions with answers
    const questions = await this.questionRepo.find({
      where: { testId: submission.testId },
      order: { questionNumber: 'ASC' },
    });

    const questionsWithAnswers = questions.map((question) => {
      const answer = submission.answers.find((a) => a.questionId === question.id);

      return {
        questionNumber: question.questionNumber,
        questionText: question.questionText,
        questionImage: question.questionImage,
        unitName: question.unitName,
        maxScore: question.score,
        difficulty: question.difficulty,
        studentAnswer: answer?.studentAnswer || '',
        correctAnswer: question.correctAnswer, // Show after graded
        isCorrect: answer?.isCorrect || false,
        scoreEarned: answer?.scoreEarned || 0,
      };
    });

    // Group by unit
    const unitScores = this.calculateUnitScores(questionsWithAnswers);

    const result: any = {
      submission: {
        id: submission.id,
        submittedAt: submission.submittedAt,
        gradedAt: submission.gradedAt,
      },
      test: {
        id: submission.test.id,
        title: submission.test.title,
        testCode: submission.test.testCode,
        testType: submission.test.testType,
        totalScore: submission.test.totalScore,
      },
      scores: {
        totalRawScore: submission.totalScore,
        standardScore: submission.standardScore,
        maxScore: submission.test.totalScore,
        percentage: submission.standardScore,
      },
      questions: questionsWithAnswers,
      unitScores,
    };

    // Add A-DTM specific data if applicable
    if (submission.test.testType === TestType.ADTM && submission.adtmData) {
      result['adtmData'] = {
        section1: {
          correctCount: submission.adtmData.section1CorrectCount,
          mistakeCount: submission.adtmData.section1MistakeCount,
          unsolvedCount: submission.adtmData.section1UnsolvedCount,
          standardScore: submission.adtmData.section1StandardScore,
        },
        section2: {
          standardScore: submission.adtmData.section2StandardScore,
          unitScores: submission.adtmData.section2UnitScores,
        },
        section3: {
          standardScore: submission.adtmData.section3StandardScore,
          unitScores: submission.adtmData.section3UnitScores,
        },
        section4: {
          standardScore: submission.adtmData.section4StandardScore,
          unitScores: submission.adtmData.section4UnitScores,
        },
        section5: {
          standardScore: submission.adtmData.section5StandardScore,
          unitScores: submission.adtmData.section5UnitScores,
        },
        overallStandardScore: submission.adtmData.overallStandardScore,
      };
    }

    return result;
  }

  /**
   * Get result summary for display
   */
  async getResultSummary(submissionId: string, studentId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, studentId },
      relations: ['test', 'answers'],
    });

    if (!submission) {
      throw new NotFoundException('Result not found');
    }

    if (submission.status !== SubmissionStatus.GRADED) {
      throw new ForbiddenException('Test has not been graded yet');
    }

    const correctCount = submission.answers.filter((a) => a.isCorrect).length;
    const totalQuestions = submission.answers.length;
    const incorrectCount = totalQuestions - correctCount;

    return {
      test: {
        title: submission.test.title,
        testCode: submission.test.testCode,
      },
      scores: {
        totalScore: submission.totalScore,
        maxScore: submission.test.totalScore,
        standardScore: submission.standardScore,
      },
      statistics: {
        totalQuestions,
        correctCount,
        incorrectCount,
        accuracy: totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0,
      },
      timestamps: {
        submittedAt: submission.submittedAt,
        gradedAt: submission.gradedAt,
      },
    };
  }

  /**
   * Calculate unit scores from questions
   */
  private calculateUnitScores(questions: any[]) {
    const unitMap = new Map();

    questions.forEach((q) => {
      const unitName = q.unitName || 'Unknown';
      if (!unitMap.has(unitName)) {
        unitMap.set(unitName, {
          unitName,
          totalScore: 0,
          maxScore: 0,
          questionCount: 0,
        });
      }

      const unit = unitMap.get(unitName);
      unit.maxScore += q.maxScore;
      unit.totalScore += q.scoreEarned;
      unit.questionCount++;
    });

    return Array.from(unitMap.values()).map((unit: any) => ({
      ...unit,
      standardScore: unit.maxScore > 0 ? (unit.totalScore / unit.maxScore) * 100 : 0,
    }));
  }
}

