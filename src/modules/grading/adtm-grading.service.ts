import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { AdtmSubmission } from '../../database/entities/adtm-submission.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { Test } from '../../database/entities/test.entity';
import { User } from '../../database/entities/user.entity';
import {
  StudentAssignment,
  AssignmentStatus,
} from '../../database/entities/student-assignment.entity';
import {
  TestType,
  SubmissionStatus,
  UserRole,
  AdtmAnswerType,
} from '../../../../frontend/src/shared/types/enum';
import {
  Section1Input,
  Section1Result,
  SectionInput,
  SectionResult,
  UnitScoreResult,
  AdtmGradingResult,
} from './interfaces/adtm-grading.interface';
import {
  RegisterStudentDto,
  GradeSection1Dto,
  GradeSectionDto,
  QuestionScoreDto,
} from './dto/adtm-workflow.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { SaveProgressDto } from './dto/save-progress.dto';

/**
 * Service for grading A-DTM (Entrance Level Diagnostic Test) submissions
 * Implements complex 5-section scoring logic with unit-based calculations
 */
@Injectable()
export class AdtmGradingService {
  private readonly logger = new Logger(AdtmGradingService.name);

  constructor(
    @InjectRepository(StudentSubmission)
    private readonly submissionRepository: Repository<StudentSubmission>,
    @InjectRepository(StudentAnswer)
    private readonly answerRepository: Repository<StudentAnswer>,
    @InjectRepository(AdtmSubmission)
    private readonly adtmSubmissionRepository: Repository<AdtmSubmission>,
    @InjectRepository(TestQuestion)
    private readonly questionRepository: Repository<TestQuestion>,
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudentAssignment)
    private readonly assignmentRepository: Repository<StudentAssignment>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Main grading function for A-DTM submission
   * @param submissionId - ID of the submission to grade
   * @returns Complete grading result with all sections and overall score
   */
  async gradeAdtmSubmission(submissionId: string): Promise<AdtmGradingResult> {
    this.logger.log(`Starting A-DTM grading for submission ${submissionId}`);

    // Use transaction to ensure data consistency
    return await this.dataSource.transaction(async (manager) => {
      // 1. Get submission with all answers and relations
      const submission = await manager.findOne(StudentSubmission, {
        where: { id: submissionId },
        relations: ['test', 'adtmData'],
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      // 2. Validate test type
      const test = await manager.findOne(Test, {
        where: { id: submission.testId },
      });

      if (!test) {
        throw new NotFoundException(`Test with ID ${submission.testId} not found`);
      }

      if (test.testType !== TestType.ADTM) {
        throw new BadRequestException(
          `Test ${submission.testId} is not an A-DTM test. Found type: ${test.testType}`,
        );
      }

      // 3. Validate submission status
      if (submission.status === SubmissionStatus.NOT_STARTED) {
        throw new BadRequestException(
          `Cannot grade submission ${submissionId} that hasn't been started yet`,
        );
      }

      // 4. Get or create AdtmSubmission record
      let adtmData = submission.adtmData;
      if (!adtmData) {
        // Create new AdtmSubmission record
        adtmData = this.adtmSubmissionRepository.create({
          submissionId: submission.id,
          testLevel: test.level || 1,
        });
        adtmData = await manager.save(AdtmSubmission, adtmData);
      }

      // 5. Get all answers with questions
      const answers = await manager.find(StudentAnswer, {
        where: { submissionId: submission.id },
        relations: ['question'],
      });

      if (!answers || answers.length === 0) {
        throw new BadRequestException(`Submission ${submissionId} has no answers to grade`);
      }

      // 6. Get all questions from test for max scores
      const questionIds = answers.map((a) => a.questionId);
      const questions = await manager.find(TestQuestion, {
        where: { id: In(questionIds) },
      });

      // Create question map for quick lookup
      const questionMap = new Map(questions.map((q) => [q.id, q]));

      // 7. Group answers by section
      const answersBySection = this.groupAnswersBySection(answers, questionMap);

      // 8. Grade Section 1
      // Parse currentMood - it's stored as string but should be number 1-5
      let currentMood = 1;
      if (adtmData.currentMood) {
        const parsed =
          typeof adtmData.currentMood === 'string'
            ? parseInt(adtmData.currentMood, 10)
            : adtmData.currentMood;
        currentMood = parsed >= 1 && parsed <= 5 ? parsed : 1;
      }

      // Transform Section 1 answers (remove unitName)
      const section1Answers = (answersBySection[1] || []).map((a) => ({
        questionId: a.questionId,
        score: a.score,
        maxScore: a.maxScore,
      }));

      const section1Input: Section1Input = {
        concentrationLevel: adtmData.concentrationLevel || 1,
        currentMood: currentMood,
        expectedScore: adtmData.expectedScore || 0,
        answers: section1Answers,
      };

      const section1 = this.calculateSection1(section1Input);

      // 9. Grade Sections 2-5
      // Transform answers and ensure unitName is present
      const section2Answers = (answersBySection[2] || [])
        .filter((a) => a.unitName)
        .map((a) => ({
          questionId: a.questionId,
          score: a.score,
          maxScore: a.maxScore,
          unitName: a.unitName!,
        }));

      const section3Answers = (answersBySection[3] || [])
        .filter((a) => a.unitName)
        .map((a) => ({
          questionId: a.questionId,
          score: a.score,
          maxScore: a.maxScore,
          unitName: a.unitName!,
        }));

      const section4Answers = (answersBySection[4] || [])
        .filter((a) => a.unitName)
        .map((a) => ({
          questionId: a.questionId,
          score: a.score,
          maxScore: a.maxScore,
          unitName: a.unitName!,
        }));

      const section5Answers = (answersBySection[5] || [])
        .filter((a) => a.unitName)
        .map((a) => ({
          questionId: a.questionId,
          score: a.score,
          maxScore: a.maxScore,
          unitName: a.unitName!,
        }));

      const section2 = this.calculateSectionWithUnits({
        sectionNumber: 2,
        answers: section2Answers,
      });

      const section3 = this.calculateSectionWithUnits({
        sectionNumber: 3,
        answers: section3Answers,
      });

      const section4 = this.calculateSectionWithUnits({
        sectionNumber: 4,
        answers: section4Answers,
      });

      const section5 = this.calculateSectionWithUnits({
        sectionNumber: 5,
        answers: section5Answers,
      });

      // 10. Calculate overall score
      const sections = [section1, section2, section3, section4, section5];
      const overallScore = this.calculateOverallScore(sections);

      // 11. Update AdtmSubmission with results
      const updateData: Partial<AdtmSubmission> = {
        // Section 1
        section1CorrectCount: section1.correctCount,
        section1MistakeCount: section1.mistakeCount,
        section1UnsolvedCount: section1.unsolvedCount,
        section1RawScore: section1.rawScore,
        section1StandardScore: section1.standardScore,

        // Section 2
        section2RawScore: section2.rawScore,
        section2StandardScore: section2.standardScore,
        section2UnitScores: this.convertUnitScoresToRecord(section2.unitScores),

        // Section 3
        section3RawScore: section3.rawScore,
        section3StandardScore: section3.standardScore,
        section3UnitScores: this.convertUnitScoresToRecord(section3.unitScores),

        // Section 4
        section4RawScore: section4.rawScore,
        section4StandardScore: section4.standardScore,
        section4UnitScores: this.convertUnitScoresToRecord(section4.unitScores),

        // Section 5
        section5RawScore: section5.rawScore,
        section5StandardScore: section5.standardScore,
        section5UnitScores: this.convertUnitScoresToRecord(section5.unitScores),

        // Overall
        overallStandardScore: overallScore,
      };

      await manager.update(AdtmSubmission, { id: adtmData.id }, updateData);

      // 12. Update submission status and scores
      const totalRawScore = sections.reduce((sum, s) => sum + s.rawScore, 0);
      const totalMaxScore = sections.reduce((sum, s) => sum + s.maxScore, 0);

      await manager.update(
        StudentSubmission,
        { id: submission.id },
        {
          status: SubmissionStatus.GRADED,
          gradedAt: new Date(),
          totalScore: totalRawScore,
          standardScore: overallScore,
        },
      );

      this.logger.log(
        `A-DTM grading completed for submission ${submissionId}. Overall score: ${overallScore.toFixed(2)}%`,
      );

      return {
        section1,
        section2,
        section3,
        section4,
        section5,
        overallStandardScore: overallScore,
        totalRawScore,
        totalMaxScore,
      };
    });
  }

  /**
   * Calculate Section 1: Calculation Ability
   * Classifies answers as correct/mistake/unsolved and calculates scores
   */
  private calculateSection1(input: Section1Input): Section1Result {
    if (!input.answers || input.answers.length === 0) {
      return {
        rawScore: 0,
        standardScore: 0,
        maxScore: 0,
        correctCount: 0,
        mistakeCount: 0,
        unsolvedCount: 0,
      };
    }

    // Classify each answer
    let correctCount = 0;
    let mistakeCount = 0;
    let unsolvedCount = 0;

    let rawScore = 0;
    let maxScore = 0;

    for (const answer of input.answers) {
      const earnedScore = answer.score || 0;
      const questionMaxScore = answer.maxScore || 0;

      rawScore += earnedScore;
      maxScore += questionMaxScore;

      // Classify answer
      if (earnedScore === 0) {
        unsolvedCount++;
      } else if (earnedScore === questionMaxScore) {
        correctCount++;
      } else {
        mistakeCount++;
      }
    }

    // Calculate standard score (0-100 scale)
    const standardScore = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;

    return {
      rawScore,
      standardScore: Math.round(standardScore * 100) / 100, // Round to 2 decimal places
      maxScore,
      correctCount,
      mistakeCount,
      unsolvedCount,
    };
  }

  /**
   * Calculate Sections 2-5: Unit-based scoring
   * Groups questions by unit, calculates unit scores, then section score
   */
  private calculateSectionWithUnits(input: SectionInput): SectionResult {
    if (!input.answers || input.answers.length === 0) {
      return {
        sectionNumber: input.sectionNumber,
        rawScore: 0,
        standardScore: 0,
        maxScore: 0,
        unitScores: [],
      };
    }

    // 1. Group answers by unit
    const unitGroups = this.groupByUnit(input.answers);

    // 2. Calculate unit scores
    const unitScores: UnitScoreResult[] = [];
    let sectionRawScore = 0;
    let sectionMaxScore = 0;

    for (const [unitName, answers] of Object.entries(unitGroups)) {
      const unitRawScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
      const unitMaxScore = answers.reduce((sum, a) => sum + (a.maxScore || 0), 0);
      const unitStandardScore = unitMaxScore > 0 ? (unitRawScore / unitMaxScore) * 100 : 0;

      unitScores.push({
        unitName,
        rawScore: unitRawScore,
        maxScore: unitMaxScore,
        standardScore: Math.round(unitStandardScore * 100) / 100,
        questionCount: answers.length,
      });

      sectionRawScore += unitRawScore;
      sectionMaxScore += unitMaxScore;
    }

    // 3. Calculate section standard score
    const sectionStandardScore =
      sectionMaxScore > 0 ? (sectionRawScore / sectionMaxScore) * 100 : 0;

    return {
      sectionNumber: input.sectionNumber,
      rawScore: sectionRawScore,
      standardScore: Math.round(sectionStandardScore * 100) / 100,
      maxScore: sectionMaxScore,
      unitScores,
    };
  }

  /**
   * Calculate overall score from all sections
   * Formula: (totalRawScore / totalMaxScore) × 100
   */
  private calculateOverallScore(sections: Array<Section1Result | SectionResult>): number {
    const totalRawScore = sections.reduce((sum, s) => sum + s.rawScore, 0);
    const totalMaxScore = sections.reduce((sum, s) => sum + s.maxScore, 0);

    if (totalMaxScore === 0) {
      return 0;
    }

    const overallScore = (totalRawScore / totalMaxScore) * 100;
    return Math.round(overallScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Group answers by section number
   */
  private groupAnswersBySection(
    answers: StudentAnswer[],
    questionMap: Map<string, TestQuestion>,
  ): Record<
    number,
    Array<{ questionId: string; score: number; maxScore: number; unitName?: string }>
  > {
    const grouped: Record<
      number,
      Array<{ questionId: string; score: number; maxScore: number; unitName?: string }>
    > = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        this.logger.warn(`Question ${answer.questionId} not found for answer ${answer.id}`);
        continue;
      }

      const sectionNumber = question.sectionNumber;
      if (sectionNumber >= 1 && sectionNumber <= 5) {
        grouped[sectionNumber].push({
          questionId: answer.questionId,
          score: answer.scoreEarned || 0,
          maxScore: question.score || 0,
          unitName: question.unitName || undefined,
        });
      }
    }

    return grouped;
  }

  /**
   * Group answers by unit name
   */
  private groupByUnit(
    answers: Array<{ unitName: string; score: number; maxScore: number }>,
  ): Record<string, Array<{ score: number; maxScore: number }>> {
    const grouped: Record<string, Array<{ score: number; maxScore: number }>> = {};

    for (const answer of answers) {
      const unitName = answer.unitName || 'Unknown';
      if (!grouped[unitName]) {
        grouped[unitName] = [];
      }
      grouped[unitName].push({
        score: answer.score,
        maxScore: answer.maxScore,
      });
    }

    return grouped;
  }

  /**
   * Convert unit scores array to record format for database storage
   */
  private convertUnitScoresToRecord(
    unitScores: UnitScoreResult[],
  ): Record<string, { rawScore: number; maxScore: number }> {
    const record: Record<string, { rawScore: number; maxScore: number }> = {};

    for (const unitScore of unitScores) {
      record[unitScore.unitName] = {
        rawScore: unitScore.rawScore,
        maxScore: unitScore.maxScore,
      };
    }

    return record;
  }

  /**
   * Register a student for A-DTM test grading
   * Creates assignment, submission, and initial answer records
   */
  async registerStudent(dto: RegisterStudentDto, teacherId: string) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Find test by testCode
      const test = await manager.findOne(Test, {
        where: { testCode: dto.testCode, testType: TestType.ADTM },
      });

      if (!test) {
        throw new NotFoundException(`A-DTM test with code "${dto.testCode}" not found`);
      }

      // 2. Validate student exists and is a student
      const student = await manager.findOne(User, {
        where: { id: dto.studentId, role: UserRole.STUDENT },
      });

      if (!student) {
        throw new NotFoundException(`Student with ID ${dto.studentId} not found`);
      }

      // 3. Find or create StudentAssignment
      let assignment = await manager.findOne(StudentAssignment, {
        where: { testId: test.id, studentId: dto.studentId },
      });

      if (!assignment) {
        assignment = manager.create(StudentAssignment, {
          testId: test.id,
          studentId: dto.studentId,
          assignedById: teacherId,
          status: AssignmentStatus.PENDING,
        });
        assignment = await manager.save(StudentAssignment, assignment);
      }

      // 4. Find or create StudentSubmission
      let submission = await manager.findOne(StudentSubmission, {
        where: { assignmentId: assignment.id },
        relations: ['adtmData'],
      });

      if (!submission) {
        submission = manager.create(StudentSubmission, {
          assignmentId: assignment.id,
          studentId: dto.studentId,
          testId: test.id,
          status: SubmissionStatus.NOT_STARTED,
        });
        submission = await manager.save(StudentSubmission, submission);
      }

      // 5. Create or get AdtmSubmission
      let adtmData = submission.adtmData;
      if (!adtmData) {
        adtmData = manager.create(AdtmSubmission, {
          submissionId: submission.id,
          testLevel: test.level || 1,
        });
        adtmData = await manager.save(AdtmSubmission, adtmData);
      }

      // 6. Get all questions for the test
      const questions = await manager.find(TestQuestion, {
        where: { testId: test.id },
        order: { sectionNumber: 'ASC', questionNumber: 'ASC' },
      });

      // 7. Create StudentAnswer records for all questions (if not exist)
      if (!submission) {
        throw new Error('Submission not found or created');
      }

      const submissionId = submission.id;
      const existingAnswers = await manager.find(StudentAnswer, {
        where: { submissionId },
      });

      const existingQuestionIds = new Set(existingAnswers.map((a) => a.questionId));
      const answersToCreate = questions
        .filter((q) => !existingQuestionIds.has(q.id))
        .map((question) => {
          const answer = new StudentAnswer();
          answer.submissionId = submissionId;
          answer.questionId = question.id;
          // scoreEarned and studentAnswer are nullable, will default to null
          return answer;
        });

      if (answersToCreate.length > 0) {
        await manager.save(StudentAnswer, answersToCreate);
      }

      // 8. Return submission with relations
      const result = await manager.findOne(StudentSubmission, {
        where: { id: submission.id },
        relations: ['test', 'student', 'adtmData', 'answers', 'answers.question'],
      });

      return result;
    });
  }

  /**
   * Get list of A-DTM submissions for a teacher
   */
  async getSubmissions(
    teacherId: string,
    options: {
      status?: SubmissionStatus;
      search?: string;
      page: number;
      limit: number;
    },
  ) {
    const { status, search, page, limit } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .innerJoin('submission.assignment', 'assignment')
      .innerJoinAndSelect('submission.test', 'test')
      .leftJoinAndSelect('submission.student', 'student')
      .leftJoinAndSelect('submission.adtmData', 'adtmData')
      .where('test.testType = :testType', { testType: TestType.ADTM })
      .andWhere('assignment.assignedById = :teacherId', { teacherId });

    if (status) {
      queryBuilder.andWhere('submission.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(student.fullName ILIKE :search OR student.username ILIKE :search OR test.testCode ILIKE :search OR test.title ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [submissions, total] = await queryBuilder
      .orderBy('submission.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      submissions: submissions
        .map((s) => {
          // Handle cases where relations might be null
          if (!s.student || !s.test) {
            this.logger.warn(`Submission ${s.id} is missing student or test relation`);
            return null;
          }

          return {
            id: s.id,
            student: {
              id: s.student.id,
              name: s.student.fullName,
              studentId: s.student.username,
              grade: s.student.grade || '',
            },
            test: {
              id: s.test.id,
              testCode: s.test.testCode,
              title: s.test.title,
            },
            status: s.status,
            testDate: s.createdAt,
            overallScore: s.adtmData?.overallStandardScore || null,
            progress: this.calculateProgress(s),
          };
        })
        .filter((s) => s !== null),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Calculate grading progress (0-100)
   */
  private calculateProgress(submission: StudentSubmission): number {
    if (!submission.adtmData) return 0;
    const adtm = submission.adtmData;

    // Check if Section 1 has data
    const hasSection1 =
      adtm.concentrationLevel !== null && adtm.currentMood !== null && adtm.expectedScore !== null;

    // Check if sections 2-5 have scores
    const hasSection2 = adtm.section2RawScore > 0 || adtm.section2StandardScore > 0;
    const hasSection3 = adtm.section3RawScore > 0 || adtm.section3StandardScore > 0;
    const hasSection4 = adtm.section4RawScore > 0 || adtm.section4StandardScore > 0;
    const hasSection5 = adtm.section5RawScore > 0 || adtm.section5StandardScore > 0;

    const completedSections = [
      hasSection1,
      hasSection2,
      hasSection3,
      hasSection4,
      hasSection5,
    ].filter((b) => b).length;

    return (completedSections / 5) * 100;
  }

  /**
   * Get full submission with all sections and questions
   */
  async getSubmission(submissionId: string) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['test', 'student', 'adtmData', 'answers', 'answers.question', 'assignment'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Validate it's an A-DTM test
    if (submission.test.testType !== TestType.ADTM) {
      throw new BadRequestException('This submission is not for an A-DTM test');
    }

    // Group answers by section for easier frontend consumption
    const answersBySection: Record<number, StudentAnswer[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    for (const answer of submission.answers || []) {
      const sectionNumber = answer.question?.sectionNumber;
      if (sectionNumber >= 1 && sectionNumber <= 5) {
        answersBySection[sectionNumber].push(answer);
      }
    }

    return {
      ...submission,
      answersBySection,
    };
  }

  /**
   * Update Section 1 grades
   */
  async updateSection1(submissionId: string, dto: GradeSection1Dto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Get submission
      const submission = await manager.findOne(StudentSubmission, {
        where: { id: submissionId },
        relations: ['test', 'adtmData'],
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      if (submission.test.testType !== TestType.ADTM) {
        throw new BadRequestException('This submission is not for an A-DTM test');
      }

      // 2. Get or create AdtmSubmission
      let adtmData = submission.adtmData;
      if (!adtmData) {
        adtmData = manager.create(AdtmSubmission, {
          submissionId: submission.id,
          testLevel: submission.test.level || 1,
        });
        adtmData = await manager.save(AdtmSubmission, adtmData);
      }

      // 3. Get questions for validation
      const questionIds = dto.answers.map((a) => a.questionId);
      const questions = await manager.find(TestQuestion, {
        where: { id: In(questionIds), sectionNumber: 1 },
      });

      const questionMap = new Map(questions.map((q) => [q.id, q]));

      // 4. Validate and update answers
      for (const answerDto of dto.answers) {
        const question = questionMap.get(answerDto.questionId);
        if (!question) {
          throw new NotFoundException(`Question ${answerDto.questionId} not found in Section 1`);
        }

        if (answerDto.score > question.score) {
          throw new BadRequestException(
            `Score ${answerDto.score} exceeds max score ${question.score} for question ${answerDto.questionId}`,
          );
        }

        // Update or create answer
        let answer = await manager.findOne(StudentAnswer, {
          where: { submissionId: submission.id, questionId: answerDto.questionId },
        });

        if (!answer) {
          answer = manager.create(StudentAnswer, {
            submissionId: submission.id,
            questionId: answerDto.questionId,
          });
        }

        // Classify answer type
        let answerType: AdtmAnswerType | null = null;
        if (answerDto.score === 0) {
          answerType = AdtmAnswerType.UNSOLVED;
        } else if (answerDto.score === question.score) {
          answerType = AdtmAnswerType.CORRECT;
        } else {
          answerType = AdtmAnswerType.MISTAKE;
        }

        answer.scoreEarned = answerDto.score;
        answer.answerType = answerType;
        answer.isCorrect = answerType === AdtmAnswerType.CORRECT;

        await manager.save(StudentAnswer, answer);
      }

      // 5. Calculate Section 1 scores
      const section1Answers = dto.answers.map((a) => {
        const question = questionMap.get(a.questionId)!;
        return {
          questionId: a.questionId,
          score: a.score,
          maxScore: question.score,
        };
      });

      const section1Input: Section1Input = {
        concentrationLevel: dto.concentrationLevel,
        currentMood: dto.currentMood,
        expectedScore: dto.expectedScore,
        answers: section1Answers,
      };

      const section1Result = this.calculateSection1(section1Input);

      // 6. Update AdtmSubmission
      await manager.update(
        AdtmSubmission,
        { id: adtmData.id },
        {
          concentrationLevel: dto.concentrationLevel,
          currentMood: dto.currentMood.toString(),
          expectedScore: dto.expectedScore,
          section1CorrectCount: section1Result.correctCount,
          section1MistakeCount: section1Result.mistakeCount,
          section1UnsolvedCount: section1Result.unsolvedCount,
          section1RawScore: section1Result.rawScore,
          section1StandardScore: section1Result.standardScore,
        },
      );

      // 7. Update submission status
      await manager.update(
        StudentSubmission,
        { id: submission.id },
        { status: SubmissionStatus.IN_PROGRESS },
      );

      return {
        section1: section1Result,
        message: 'Section 1 grades updated successfully',
      };
    });
  }

  /**
   * Update Section 2-5 grades
   */
  async updateSection(submissionId: string, sectionNumber: number, dto: GradeSectionDto) {
    if (sectionNumber < 2 || sectionNumber > 5) {
      throw new BadRequestException('Section number must be between 2 and 5');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Get submission
      const submission = await manager.findOne(StudentSubmission, {
        where: { id: submissionId },
        relations: ['test', 'adtmData'],
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      if (submission.test.testType !== TestType.ADTM) {
        throw new BadRequestException('This submission is not for an A-DTM test');
      }

      // 2. Get or create AdtmSubmission
      let adtmData = submission.adtmData;
      if (!adtmData) {
        adtmData = manager.create(AdtmSubmission, {
          submissionId: submission.id,
          testLevel: submission.test.level || 1,
        });
        adtmData = await manager.save(AdtmSubmission, adtmData);
      }

      // 3. Get questions for validation
      const questionIds = dto.answers.map((a) => a.questionId);
      const questions = await manager.find(TestQuestion, {
        where: { id: In(questionIds), sectionNumber },
      });

      const questionMap = new Map(questions.map((q) => [q.id, q]));

      // 4. Validate and update answers
      for (const answerDto of dto.answers) {
        const question = questionMap.get(answerDto.questionId);
        if (!question) {
          throw new NotFoundException(
            `Question ${answerDto.questionId} not found in Section ${sectionNumber}`,
          );
        }

        if (answerDto.score > question.score) {
          throw new BadRequestException(
            `Score ${answerDto.score} exceeds max score ${question.score} for question ${answerDto.questionId}`,
          );
        }

        // Update or create answer
        let answer = await manager.findOne(StudentAnswer, {
          where: { submissionId: submission.id, questionId: answerDto.questionId },
        });

        if (!answer) {
          answer = manager.create(StudentAnswer, {
            submissionId: submission.id,
            questionId: answerDto.questionId,
          });
        }

        answer.scoreEarned = answerDto.score;
        answer.isCorrect = answerDto.score === question.score;

        await manager.save(StudentAnswer, answer);
      }

      // 5. Calculate section scores
      const sectionAnswers = dto.answers.map((a) => {
        const question = questionMap.get(a.questionId)!;
        return {
          questionId: a.questionId,
          score: a.score,
          maxScore: question.score,
          unitName: question.unitName || '',
        };
      });

      const sectionInput: SectionInput = {
        sectionNumber,
        answers: sectionAnswers,
      };

      const sectionResult = this.calculateSectionWithUnits(sectionInput);

      // 6. Update AdtmSubmission
      const updateData: Partial<AdtmSubmission> = {};

      if (sectionNumber === 2) {
        updateData.section2RawScore = sectionResult.rawScore;
        updateData.section2StandardScore = sectionResult.standardScore;
        updateData.section2UnitScores = this.convertUnitScoresToRecord(sectionResult.unitScores);
      } else if (sectionNumber === 3) {
        updateData.section3RawScore = sectionResult.rawScore;
        updateData.section3StandardScore = sectionResult.standardScore;
        updateData.section3UnitScores = this.convertUnitScoresToRecord(sectionResult.unitScores);
      } else if (sectionNumber === 4) {
        updateData.section4RawScore = sectionResult.rawScore;
        updateData.section4StandardScore = sectionResult.standardScore;
        updateData.section4UnitScores = this.convertUnitScoresToRecord(sectionResult.unitScores);
      } else if (sectionNumber === 5) {
        updateData.section5RawScore = sectionResult.rawScore;
        updateData.section5StandardScore = sectionResult.standardScore;
        updateData.section5UnitScores = this.convertUnitScoresToRecord(sectionResult.unitScores);
      }

      await manager.update(AdtmSubmission, { id: adtmData.id }, updateData);

      // 7. Update submission status
      await manager.update(
        StudentSubmission,
        { id: submission.id },
        { status: SubmissionStatus.IN_PROGRESS },
      );

      return {
        [`section${sectionNumber}`]: sectionResult,
        message: `Section ${sectionNumber} grades updated successfully`,
      };
    });
  }

  /**
   * Calculate all scores for the submission
   */
  async calculateScores(submissionId: string) {
    // This uses the existing gradeAdtmSubmission method
    return await this.gradeAdtmSubmission(submissionId);
  }

  /**
   * Finalize and submit grading
   */
  async submitGrading(submissionId: string, teacherId: string) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Get submission
      const submission = await manager.findOne(StudentSubmission, {
        where: { id: submissionId },
        relations: ['test', 'adtmData', 'answers', 'answers.question'],
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      if (submission.test.testType !== TestType.ADTM) {
        throw new BadRequestException('This submission is not for an A-DTM test');
      }

      // 2. Validate all questions are graded
      const questions = await manager.find(TestQuestion, {
        where: { testId: submission.testId },
      });

      const gradedQuestionIds = new Set(
        (submission.answers || [])
          .filter((a) => a.scoreEarned !== null && a.scoreEarned !== undefined)
          .map((a) => a.questionId),
      );

      const ungradedQuestions = questions.filter((q) => !gradedQuestionIds.has(q.id));

      if (ungradedQuestions.length > 0) {
        throw new BadRequestException(
          `Cannot submit: ${ungradedQuestions.length} questions are not yet graded`,
        );
      }

      // 3. Calculate all scores
      const gradingResult = await this.gradeAdtmSubmission(submissionId);

      // 4. Update submission status to GRADED
      await manager.update(
        StudentSubmission,
        { id: submission.id },
        {
          status: SubmissionStatus.GRADED,
          gradedAt: new Date(),
          gradedById: teacherId,
          totalScore: gradingResult.totalRawScore,
          standardScore: gradingResult.overallStandardScore,
        },
      );

      // 5. Update assignment status
      await manager.update(
        StudentAssignment,
        { id: submission.assignmentId },
        { status: AssignmentStatus.GRADED },
      );

      return {
        ...gradingResult,
        message: 'Grading submitted successfully',
      };
    });
  }

  /**
   * Assign multiple students to A-DTM test
   * Creates assignments, submissions, and initial answer records for all students
   */
  async assignStudents(dto: AssignStudentsDto, teacherId: string) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Validate template exists and is active
      const test = await manager.findOne(Test, {
        where: { id: dto.templateId, testType: TestType.ADTM },
      });

      if (!test) {
        throw new NotFoundException(`A-DTM template with ID ${dto.templateId} not found`);
      }

      if (test.status !== 'PUBLISHED') {
        throw new BadRequestException('Template is not active');
      }

      // 2. Validate all students exist and are students
      const students = await manager.find(User, {
        where: {
          id: In(dto.studentIds),
          role: UserRole.STUDENT,
        },
      });

      if (students.length !== dto.studentIds.length) {
        throw new BadRequestException('Some student IDs are invalid');
      }

      // 3. Check for existing active assignments
      const existingAssignments = await manager.find(StudentAssignment, {
        where: {
          testId: test.id,
          studentId: In(dto.studentIds),
          status: In([AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS]),
        },
      });

      const studentsWithActiveAssignment = existingAssignments.map((a) => a.studentId);
      if (studentsWithActiveAssignment.length > 0) {
        throw new BadRequestException(
          `Some students already have an active assignment: ${studentsWithActiveAssignment.join(', ')}`,
        );
      }

      // 4. Get all questions for the test
      const questions = await manager.find(TestQuestion, {
        where: { testId: test.id },
        order: { sectionNumber: 'ASC', questionNumber: 'ASC' },
      });

      // 5. Create assignments, submissions, and answers for each student
      const submissions = [];
      const testDate = new Date(dto.testDate);
      const gradingDueDate = dto.gradingDueDate ? new Date(dto.gradingDueDate) : null;

      for (const student of students) {
        // Create assignment
        const assignment = manager.create(StudentAssignment, {
          testId: test.id,
          studentId: student.id,
          assignedById: teacherId,
          status: AssignmentStatus.PENDING,
          deadline: gradingDueDate || undefined,
          instructions: dto.notes || undefined,
        });
        const savedAssignment = await manager.save(StudentAssignment, assignment);

        // Create submission
        const submission = manager.create(StudentSubmission, {
          assignmentId: savedAssignment.id,
          studentId: student.id,
          testId: test.id,
          status: SubmissionStatus.NOT_STARTED,
        });
        const savedSubmission = await manager.save(StudentSubmission, submission);

        // Create AdtmSubmission
        const adtmData = manager.create(AdtmSubmission, {
          submissionId: savedSubmission.id,
          testLevel: test.level || 1,
        });
        await manager.save(AdtmSubmission, adtmData);

        // Create StudentAnswer records for all questions
        const answersToCreate = questions.map((question) => {
          const answer = new StudentAnswer();
          answer.submissionId = savedSubmission.id;
          answer.questionId = question.id;
          return answer;
        });

        if (answersToCreate.length > 0) {
          await manager.save(StudentAnswer, answersToCreate);
        }

        submissions.push({
          id: savedSubmission.id,
          studentId: student.id,
          testId: test.id,
          status: 'PENDING',
        });
      }

      // 6. TODO: Send notifications if requested
      // if (dto.notifyStudents) {
      //   await this.sendStudentNotifications(students, test);
      // }
      // if (dto.notifyParents) {
      //   await this.sendParentNotifications(students, test);
      // }

      return {
        success: true,
        assignedCount: submissions.length,
        submissions,
      };
    });
  }

  /**
   * Save grading progress (auto-save)
   * Updates answers and section 1 data without calculating final scores
   */
  async saveProgress(submissionId: string, dto: SaveProgressDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Get submission
      const submission = await manager.findOne(StudentSubmission, {
        where: { id: submissionId },
        relations: ['test', 'adtmData'],
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      if (submission.test.testType !== TestType.ADTM) {
        throw new BadRequestException('This submission is not for an A-DTM test');
      }

      // 2. Get or create AdtmSubmission
      let adtmData = submission.adtmData;
      if (!adtmData) {
        adtmData = manager.create(AdtmSubmission, {
          submissionId: submission.id,
          testLevel: submission.test.level || 1,
        });
        adtmData = await manager.save(AdtmSubmission, adtmData);
      }

      // 3. Update Section 1 data if provided
      if (dto.section1Data && dto.section1Data.concentrationLevel) {
        adtmData.concentrationLevel = dto.section1Data.concentrationLevel;
        adtmData.currentMood = dto.section1Data.currentMood.toString();
        adtmData.expectedScore = dto.section1Data.expectedScore;
        await manager.save(AdtmSubmission, adtmData);
      }

      // 4. Update all answers
      const questionIds = Object.keys(dto.answers);
      const questions = await manager.find(TestQuestion, {
        where: { id: In(questionIds) },
      });

      const questionMap = new Map(questions.map((q) => [q.id, q]));

      for (const [questionId, score] of Object.entries(dto.answers)) {
        const question = questionMap.get(questionId);
        if (!question) continue;

        if (score < 0 || score > question.score) {
          continue; // Skip invalid scores
        }

        // Find or create answer
        let answer = await manager.findOne(StudentAnswer, {
          where: { submissionId: submission.id, questionId },
        });

        if (!answer) {
          answer = manager.create(StudentAnswer, {
            submissionId: submission.id,
            questionId,
          });
        }

        answer.scoreEarned = score;
        await manager.save(StudentAnswer, answer);
      }

      // 5. Update submission status if needed
      if (submission.status === SubmissionStatus.NOT_STARTED) {
        submission.status = SubmissionStatus.IN_PROGRESS;
        await manager.save(StudentSubmission, submission);
      }

      return {
        success: true,
        savedAt: new Date(),
      };
    });
  }
}
