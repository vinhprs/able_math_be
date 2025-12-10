import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Test } from '../../database/entities/test.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAssignment } from '../../database/entities/student-assignment.entity';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { TestQueryDto } from './dto/test-query.dto';
import { AdtmTemplateQueryDto } from './dto/adtm-template-query.dto';
import { TestType, TestStatus, SubmissionStatus } from '@shared/types/enum';
import {
  TestWithQuestions,
  TestDetailResponse,
  TestStatistics,
  PaginatedTestResponse,
} from './interfaces/test.interface';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    @InjectRepository(TestQuestion)
    private readonly questionRepository: Repository<TestQuestion>,
    @InjectRepository(StudentSubmission)
    private readonly submissionRepository: Repository<StudentSubmission>,
    @InjectRepository(StudentAssignment)
    private readonly assignmentRepository: Repository<StudentAssignment>,
  ) {}

  /**
   * Validate question data based on question type
   * @param question - Question DTO to validate
   * @throws BadRequestException if validation fails
   */
  private validateQuestionData(question: CreateQuestionDto): void {
    if (question.questionType === 'MULTIPLE_CHOICE') {
      // Ensure options are provided
      if (!question.options || Object.keys(question.options).length < 2) {
        throw new BadRequestException(
          `Question ${question.questionNumber}: Multiple choice must have at least 2 options`,
        );
      }

      // Ensure correct answer exists in options
      if (!question.options[question.correctAnswer as keyof typeof question.options]) {
        throw new BadRequestException(
          `Question ${question.questionNumber}: Correct answer '${question.correctAnswer}' not found in options`,
        );
      }

      // Ensure correct answer format
      if (!['A', 'B', 'C', 'D', 'E'].includes(question.correctAnswer)) {
        throw new BadRequestException(
          `Question ${question.questionNumber}: Invalid correct answer format for multiple choice`,
        );
      }
    }
  }

  /**
   * Validate total score equals target
   * @param questions - Array of questions with scores
   * @param targetScore - Expected total (default: 100)
   * @throws BadRequestException if total doesn't match
   */
  private validateTotalScore(questions: CreateQuestionDto[], targetScore: number = 100): void {
    if (!questions || questions.length === 0) {
      return; // Skip validation if no questions provided
    }

    const totalScore = questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);

    if (Math.abs(totalScore - targetScore) >= 0.01) {
      const difference = totalScore - targetScore;
      const message =
        `Total score must equal ${targetScore}. ` +
        `Current total: ${totalScore.toFixed(2)}. ` +
        `Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}`;

      throw new BadRequestException({
        message,
        details: {
          field: 'questions',
          totalScore: Number(totalScore.toFixed(2)),
          targetScore,
          difference: Number(difference.toFixed(2)),
          questionScores: questions.map((q) => ({
            questionNumber: q.questionNumber,
            score: q.score,
          })),
        },
      });
    }
  }

  /**
   * Generate test code based on test details
   * Format: {GRADE}_T{TERM}_L{LEVEL}_{VERSION}
   * Example: E4_T1_L1_01
   */
  private async generateTestCode(grade: string, term: string, level: number): Promise<string> {
    // Term is already in format "T1" or "T2" from enum
    // Find the highest version number for this combination
    const pattern = `${grade}_${term}_L${level}_`;
    const existingTests = await this.testRepository.find({
      where: { testCode: Like(`${pattern}%`) },
      order: { testCode: 'DESC' },
      take: 1,
    });

    let version = '01';
    if (existingTests.length > 0) {
      const lastCode = existingTests[0].testCode;
      const lastVersion = parseInt(lastCode.split('_').pop() || '0', 10);
      version = String(lastVersion + 1).padStart(2, '0');
    }

    return `${grade}_${term}_L${level}_${version}`;
  }

  /**
   * Create a new Achievement Test
   */
  async create(createTestDto: CreateTestDto, creatorId: string): Promise<Test> {
    // Generate test code
    const testCode = await this.generateTestCode(
      createTestDto.grade,
      createTestDto.term,
      createTestDto.level,
    );

    // Check if test code already exists
    const existingTest = await this.testRepository.findOne({
      where: { testCode },
    });
    if (existingTest) {
      throw new ConflictException(`Test with code ${testCode} already exists`);
    }

    // Extract questions from DTO
    const { questions, ...testData } = createTestDto;

    // Validate total score for Achievement Tests
    if (questions && questions.length > 0) {
      this.validateTotalScore(questions);
      // Validate each question's data
      questions.forEach((q) => this.validateQuestionData(q));
    }

    // Create test
    const test = this.testRepository.create({
      ...testData,
      testCode,
      testType: TestType.ACHIEVEMENT,
      status: TestStatus.DRAFT,
      creatorId,
      totalScore: 0,
    });

    // Save test first to get the ID
    const savedTest = await this.testRepository.save(test);

    // Create questions if provided
    if (questions && questions.length > 0) {
      // Validate question numbers are sequential starting from 1
      const sortedQuestions = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);
      for (let i = 0; i < sortedQuestions.length; i++) {
        if (sortedQuestions[i].questionNumber !== i + 1) {
          throw new BadRequestException(
            `Question numbers must be sequential starting from 1. Expected ${i + 1}, got ${sortedQuestions[i].questionNumber}`,
          );
        }
      }

      // Calculate total score
      let totalScore = 0;

      // Create questions using insert to avoid relation issues
      const questionsToInsert = sortedQuestions.map((q, index) => {
        totalScore += q.score;
        return {
          questionNumber: q.questionNumber,
          unitName: q.unitName,
          correctAnswer: q.correctAnswer,
          score: q.score,
          difficulty: q.difficulty,
          questionText: q.questionText || '',
          questionImage: q.questionImage,
          questionType: q.questionType || 'TEXT',
          options: q.questionType === 'MULTIPLE_CHOICE' ? q.options : null,
          sectionNumber: 1, // Default to 1 for Achievement Tests
          testId: savedTest.id,
        };
      });

      // Insert all questions at once
      await this.questionRepository.insert(questionsToInsert);

      // Update test total score
      savedTest.totalScore = totalScore;
      await this.testRepository.save(savedTest);
    }

    // Return test with questions loaded
    return this.testRepository.findOne({
      where: { id: savedTest.id },
      relations: ['questions'],
      order: {
        questions: {
          questionNumber: 'ASC',
        },
      },
    }) as Promise<Test>;
  }

  /**
   * Find all Achievement Tests with pagination and filters
   */
  async findAll(query: TestQueryDto): Promise<PaginatedTestResponse> {
    const { page = 1, limit = 10, testType, grade, status, curriculum, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.testRepository.createQueryBuilder('test');

    // Filter by test type (default to ACHIEVEMENT)
    queryBuilder.andWhere('test.testType = :testType', {
      testType: testType || TestType.ACHIEVEMENT,
    });

    // Apply filters
    if (grade) {
      queryBuilder.andWhere('test.grade = :grade', { grade });
    }

    if (status) {
      queryBuilder.andWhere('test.status = :status', { status });
    }

    if (curriculum) {
      queryBuilder.andWhere('test.curriculum = :curriculum', { curriculum });
    }

    // Apply search
    if (search) {
      queryBuilder.andWhere('(test.title LIKE :search OR test.testCode LIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated data
    const data = await queryBuilder
      .leftJoinAndSelect('test.creator', 'creator')
      .skip(skip)
      .take(limit)
      .orderBy('test.createdAt', 'DESC')
      .getMany();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find test by ID with questions and statistics
   */
  async findOne(id: string): Promise<TestDetailResponse> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['creator', 'questions'],
      order: {
        questions: {
          questionNumber: 'ASC',
        },
      },
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${id} not found`);
    }

    // Get statistics if test has submissions
    let statistics: TestStatistics | undefined;
    const submissionCount = await this.submissionRepository.count({
      where: { testId: id },
    });

    if (submissionCount > 0) {
      const submissions = await this.submissionRepository.find({
        where: { testId: id },
        select: ['totalScore'],
      });

      const scores = submissions
        .map((s) => s.totalScore)
        .filter((score): score is number => score !== null);

      if (scores.length > 0) {
        const sum = scores.reduce((acc, score) => acc + score, 0);
        statistics = {
          totalSubmissions: submissionCount,
          averageScore: sum / scores.length,
          highestScore: Math.max(...scores),
          lowestScore: Math.min(...scores),
        };
      }
    }

    return {
      ...test,
      statistics,
    };
  }

  /**
   * Update test metadata
   */
  async update(id: string, updateTestDto: UpdateTestDto): Promise<Test> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['submissions'],
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${id} not found`);
    }

    // Cannot update if test has submissions
    if (test.submissions && test.submissions.length > 0) {
      throw new ForbiddenException('Cannot update test that has submissions');
    }

    // Cannot update published test
    if (test.status === TestStatus.PUBLISHED) {
      throw new ForbiddenException('Cannot update published test');
    }

    // Validate total score if questions are being updated
    if (updateTestDto.questions && updateTestDto.questions.length > 0) {
      // Only validate for Achievement Tests
      if (test.testType === TestType.ACHIEVEMENT) {
        this.validateTotalScore(updateTestDto.questions);
        // Validate each question's data
        updateTestDto.questions.forEach((q) => this.validateQuestionData(q));
      }
    }

    // If grade, term, or level changes, regenerate test code
    if (updateTestDto.grade || updateTestDto.term || updateTestDto.level) {
      const grade = updateTestDto.grade || test.grade;
      const term = updateTestDto.term || test.term;
      const level = updateTestDto.level || test.level;

      const newTestCode = await this.generateTestCode(grade, term, level);

      // Check if new code already exists (and is not the current test)
      const existingTest = await this.testRepository.findOne({
        where: { testCode: newTestCode },
      });
      if (existingTest && existingTest.id !== id) {
        throw new ConflictException(`Test with code ${newTestCode} already exists`);
      }

      test.testCode = newTestCode;
    }

    Object.assign(test, updateTestDto);
    return this.testRepository.save(test);
  }

  /**
   * Delete test (soft delete by setting status to ARCHIVED)
   */
  async remove(id: string): Promise<void> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['submissions'],
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${id} not found`);
    }

    // Cannot delete if test has submissions
    if (test.submissions && test.submissions.length > 0) {
      throw new ForbiddenException('Cannot delete test that has submissions');
    }

    // Soft delete by setting status to ARCHIVED
    test.status = TestStatus.ARCHIVED;
    await this.testRepository.save(test);
  }

  /**
   * Add question to test
   */
  async addQuestion(testId: string, createQuestionDto: CreateQuestionDto): Promise<TestQuestion> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['questions'],
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${testId} not found`);
    }

    // Cannot add questions to published test
    if (test.status === TestStatus.PUBLISHED) {
      throw new ForbiddenException('Cannot add questions to published test');
    }

    // Check if question number already exists
    const existingQuestion = test.questions?.find(
      (q) => q.questionNumber === createQuestionDto.questionNumber,
    );
    if (existingQuestion) {
      throw new ConflictException(
        `Question number ${createQuestionDto.questionNumber} already exists`,
      );
    }

    // Validate question numbers are sequential
    if (test.questions && test.questions.length > 0) {
      const sortedNumbers = test.questions.map((q) => q.questionNumber).sort((a, b) => a - b);
      const maxNumber = sortedNumbers[sortedNumbers.length - 1];
      const expectedNext = maxNumber + 1;

      if (createQuestionDto.questionNumber !== expectedNext) {
        throw new BadRequestException(
          `Question numbers must be sequential. Expected question number ${expectedNext}, got ${createQuestionDto.questionNumber}`,
        );
      }
    } else if (createQuestionDto.questionNumber !== 1) {
      throw new BadRequestException(
        `First question must be number 1, got ${createQuestionDto.questionNumber}`,
      );
    }

    // Validate question data
    this.validateQuestionData(createQuestionDto);

    // Create question (default sectionNumber to 1 for Achievement Tests)
    // Use insert to directly insert without relation handling issues
    const question = this.questionRepository.create({
      questionNumber: createQuestionDto.questionNumber,
      unitName: createQuestionDto.unitName,
      correctAnswer: createQuestionDto.correctAnswer,
      score: createQuestionDto.score,
      difficulty: createQuestionDto.difficulty,
      questionText: createQuestionDto.questionText || '',
      questionImage: createQuestionDto.questionImage,
      questionType: createQuestionDto.questionType || 'TEXT',
      options:
        createQuestionDto.questionType === 'MULTIPLE_CHOICE' ? createQuestionDto.options : null,
      sectionNumber: 1,
      test,
    });

    // Fetch the saved question to return it
    const savedQuestion = await this.questionRepository.save(question);

    if (!savedQuestion) {
      throw new BadRequestException('Failed to create question');
    }

    // Update total score
    test.totalScore = (test.totalScore || 0) + savedQuestion.score;

    return savedQuestion;
  }

  /**
   * Update question
   */
  async updateQuestion(
    testId: string,
    questionId: string,
    updateData: Partial<CreateQuestionDto>,
  ): Promise<TestQuestion> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['questions'],
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${testId} not found`);
    }

    // Cannot update questions in published test
    if (test.status === TestStatus.PUBLISHED) {
      throw new ForbiddenException('Cannot update questions in published test');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId, testId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found in test ${testId}`);
    }

    // Validate question data if being updated
    if (updateData.questionType || updateData.options || updateData.correctAnswer) {
      const questionDataToValidate: CreateQuestionDto = {
        questionNumber: question.questionNumber,
        unitName: question.unitName || '',
        correctAnswer: updateData.correctAnswer || question.correctAnswer,
        score: question.score,
        difficulty: question.difficulty || 1,
        questionType: updateData.questionType || question.questionType || 'TEXT',
        options: updateData.options || question.options || undefined,
      };
      this.validateQuestionData(questionDataToValidate);
    }

    // If question number is being changed, validate it doesn't conflict
    if (updateData.questionNumber && updateData.questionNumber !== question.questionNumber) {
      const existingQuestion = test.questions?.find(
        (q) => q.questionNumber === updateData.questionNumber && q.id !== questionId,
      );
      if (existingQuestion) {
        throw new ConflictException(`Question number ${updateData.questionNumber} already exists`);
      }
    }

    // Update score difference
    if (updateData.score && updateData.score !== question.score) {
      const scoreDiff = updateData.score - question.score;
      const newTotalScore = (test.totalScore || 0) + scoreDiff;

      // Validate total score for Achievement Tests
      if (test.testType === TestType.ACHIEVEMENT) {
        // Calculate what the total would be with the updated score
        const targetScore = 100;
        if (Math.abs(newTotalScore - targetScore) >= 0.01) {
          const difference = newTotalScore - targetScore;
          const message =
            `Total score must equal ${targetScore}. ` +
            `Current total would be: ${newTotalScore.toFixed(2)}. ` +
            `Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}`;

          throw new BadRequestException({
            message,
            details: {
              field: 'questions',
              totalScore: Number(newTotalScore.toFixed(2)),
              targetScore,
              difference: Number(difference.toFixed(2)),
            },
          });
        }
      }

      test.totalScore = newTotalScore;
      await this.testRepository.save(test);
    }

    // Handle options based on questionType
    if (updateData.questionType !== undefined) {
      // If changing to non-multiple choice, clear options
      if (updateData.questionType !== 'MULTIPLE_CHOICE') {
        updateData.options = null;
      }
    } else if (question.questionType !== 'MULTIPLE_CHOICE' && updateData.options) {
      // If current type is not multiple choice but options are being set, clear them
      updateData.options = null;
    }

    Object.assign(question, updateData);
    return this.questionRepository.save(question);
  }

  /**
   * Delete question
   */
  async removeQuestion(testId: string, questionId: string): Promise<void> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${testId} not found`);
    }

    // Cannot delete questions from published test
    if (test.status === TestStatus.PUBLISHED) {
      throw new ForbiddenException('Cannot delete questions from published test');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId, testId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found in test ${testId}`);
    }

    // Update total score
    test.totalScore = Math.max(0, (test.totalScore || 0) - question.score);
    await this.testRepository.save(test);

    await this.questionRepository.remove(question);
  }

  /**
   * Publish test (change status from DRAFT to PUBLISHED)
   */
  async publish(testId: string): Promise<Test> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['questions'],
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${testId} not found`);
    }

    if (test.status !== TestStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT tests can be published. Current status: ${test.status}`,
      );
    }

    // Validate test has questions
    if (!test.questions || test.questions.length === 0) {
      throw new BadRequestException('Cannot publish test without questions');
    }

    // Validate total score equals 100 for Achievement Tests
    if (test.testType === TestType.ACHIEVEMENT) {
      const questionsForValidation: CreateQuestionDto[] = test.questions.map((q) => ({
        questionNumber: q.questionNumber,
        unitName: q.unitName || '',
        correctAnswer: q.correctAnswer,
        score: q.score,
        difficulty: q.difficulty || 1,
      }));
      this.validateTotalScore(questionsForValidation);
    }

    test.status = TestStatus.PUBLISHED;
    return this.testRepository.save(test);
  }

  /**
   * Get published tests for teachers (only PUBLISHED status)
   */
  async getPublishedTests(query: TestQueryDto): Promise<PaginatedTestResponse> {
    const qb = this.testRepository
      .createQueryBuilder('test')
      .where('test.testType = :type', { type: TestType.ACHIEVEMENT })
      .andWhere('test.status = :status', { status: TestStatus.PUBLISHED });

    // Filters
    if (query.grade) {
      qb.andWhere('test.grade = :grade', { grade: query.grade });
    }

    if (query.level) {
      qb.andWhere('test.level = :level', { level: query.level });
    }

    if (query.search) {
      qb.andWhere('test.title ILIKE :search', { search: `%${query.search}%` });
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.skip((page - 1) * limit).take(limit);

    // Order by creation date
    qb.orderBy('test.createdAt', 'DESC');

    // Count total
    const [tests, total] = await qb.getManyAndCount();

    return {
      data: tests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get test details for teacher preview
   */
  async getTestDetailsForTeacher(id: string): Promise<TestDetailResponse> {
    const test = await this.testRepository.findOne({
      where: {
        id,
        testType: TestType.ACHIEVEMENT,
        status: TestStatus.PUBLISHED,
      },
      relations: ['questions'],
      order: {
        questions: {
          questionNumber: 'ASC',
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found or not published');
    }

    // Group questions by unit
    const questionsByUnit = this.groupQuestionsByUnit(test.questions);

    return {
      ...test,
      questionCount: test.questions.length,
      unitBreakdown: questionsByUnit,
    } as TestDetailResponse & {
      questionCount: number;
      unitBreakdown: Array<{ unitName: string; questionCount: number; totalScore: number }>;
    };
  }

  /**
   * Get test statistics
   */
  async getTestStatistics(testId: string) {
    // Count total assignments
    const totalAssignments = await this.assignmentRepository.count({
      where: { testId },
    });

    // Count completed submissions
    const completedSubmissions = await this.submissionRepository.count({
      where: {
        testId,
        status: SubmissionStatus.GRADED,
      },
    });

    // Get average score
    const submissions = await this.submissionRepository.find({
      where: {
        testId,
        status: SubmissionStatus.GRADED,
      },
      select: ['standardScore'],
    });

    const avgScore =
      submissions.length > 0
        ? submissions.reduce((sum, s) => sum + (s.standardScore || 0), 0) / submissions.length
        : 0;

    // Get highest score
    const highestScore =
      submissions.length > 0 ? Math.max(...submissions.map((s) => s.standardScore || 0)) : 0;

    return {
      totalAssignments,
      completedSubmissions,
      avgScore: Math.round(avgScore),
      highestScore,
      completionRate:
        totalAssignments > 0 ? Math.round((completedSubmissions / totalAssignments) * 100) : 0,
    };
  }

  /**
   * Helper: Group questions by unit
   */
  private groupQuestionsByUnit(questions: TestQuestion[]) {
    const units: Record<string, { unitName: string; questionCount: number; totalScore: number }> =
      {};

    questions.forEach((q) => {
      const unitName = q.unitName || 'Unnamed Unit';
      if (!units[unitName]) {
        units[unitName] = {
          unitName,
          questionCount: 0,
          totalScore: 0,
        };
      }
      units[unitName].questionCount++;
      units[unitName].totalScore += q.score;
    });

    return Object.values(units);
  }

  /**
   * Find all A-DTM templates with filters
   */
  async findAllAdtmTemplates(query: AdtmTemplateQueryDto) {
    const { page = 1, limit = 20, level, status, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.testRepository.createQueryBuilder('test');

    // Filter by test type (ADTM only)
    queryBuilder.andWhere('test.testType = :testType', { testType: TestType.ADTM });

    // Filter by level (Elementary, Middle School, High School)
    if (level) {
      if (level === 'Elementary') {
        queryBuilder.andWhere("test.grade LIKE 'E%'");
      } else if (level === 'Middle School') {
        queryBuilder.andWhere("test.grade LIKE 'M%'");
      } else if (level === 'High School') {
        queryBuilder.andWhere("test.grade IN ('H1', 'H2', 'H3')");
      }
    }

    // Filter by status (PUBLISHED = active, ARCHIVED = inactive)
    if (status) {
      queryBuilder.andWhere('test.status = :status', { status });
    }

    // Search by testCode or title
    if (search) {
      queryBuilder.andWhere('(test.testCode LIKE :search OR test.title LIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated data with questions for counting
    const tests = await queryBuilder
      .leftJoinAndSelect('test.questions', 'questions')
      .skip(skip)
      .take(limit)
      .orderBy('test.createdAt')
      .getMany();

    // Transform to template list format
    const templates = tests.map((test) => {
      const questions = test.questions || [];
      const section1Questions = questions.filter((q) => q.sectionNumber === 1);
      const section2Questions = questions.filter((q) => q.sectionNumber === 2);
      const section3Questions = questions.filter((q) => q.sectionNumber === 3);

      return {
        id: test.id,
        testCode: test.testCode,
        title: test.title,
        grade: test.grade,
        semester: test.semester,
        totalScore: test.totalScore,
        questionCount: questions.length,
        section1Count: section1Questions.length,
        section2Count: section2Questions.length,
        section3Count: section3Questions.length,
        isActive: test.status === TestStatus.PUBLISHED,
        createdAt: test.createdAt,
      };
    });

    return {
      templates,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find A-DTM template details with full structure
   */
  async findAdtmTemplateDetails(id: string) {
    const test = await this.testRepository.findOne({
      where: { id, testType: TestType.ADTM },
      relations: ['questions', 'questions.unit'],
      order: {
        questions: {
          questionNumber: 'ASC',
        },
      },
    });

    if (!test) {
      throw new NotFoundException(`A-DTM template with ID ${id} not found`);
    }

    const questions = test.questions || [];

    // Section 1: Computational Ability
    const section1Questions = questions
      .filter((q) => q.sectionNumber === 1)
      .map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        score: q.score,
        difficulty: q.difficulty,
      }));

    // Section 2: Conceptual Understanding
    const section2Questions = questions.filter((q) => q.sectionNumber === 2);
    const section2Units = this.groupQuestionsBySection(section2Questions);

    // Section 3: Concept Application
    const section3Questions = questions.filter((q) => q.sectionNumber === 3);
    const section3Units = this.groupQuestionsBySection(section3Questions);

    // Sections 4 & 5: Fixed structure (4 questions each)
    const section4Questions = questions
      .filter((q) => q.sectionNumber === 4)
      .map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        score: q.score,
        difficulty: q.difficulty,
      }));

    const section5Questions = questions
      .filter((q) => q.sectionNumber === 5)
      .map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        score: q.score,
        difficulty: q.difficulty,
      }));

    return {
      template: {
        id: test.id,
        testCode: test.testCode,
        title: test.title,
        grade: test.grade,
        semester: test.semester,
        totalScore: test.totalScore,
        isActive: test.status === TestStatus.PUBLISHED,
        pdfFile: test.pdfFilename || '',
        sections: [
          {
            number: 1,
            name: 'Computational Ability',
            questionCount: section1Questions.length,
            maxScore: section1Questions.reduce((sum, q) => sum + q.score, 0),
            hasSpecialInputs: true,
            questions: section1Questions,
          },
          {
            number: 2,
            name: 'Conceptual Understanding Ability',
            questionCount: section2Questions.length,
            maxScore: section2Questions.reduce((sum, q) => sum + q.score, 0),
            hasSpecialInputs: false,
            units: section2Units,
          },
          {
            number: 3,
            name: 'Concept Application Ability',
            questionCount: section3Questions.length,
            maxScore: section3Questions.reduce((sum, q) => sum + q.score, 0),
            hasSpecialInputs: false,
            units: section3Units,
          },
          {
            number: 4,
            name: 'Reasoning Ability',
            questionCount: section4Questions.length,
            maxScore: section4Questions.reduce((sum, q) => sum + q.score, 0),
            hasSpecialInputs: false,
            questions: section4Questions,
          },
          {
            number: 5,
            name: 'Problem Solving Skills',
            questionCount: section5Questions.length,
            maxScore: section5Questions.reduce((sum, q) => sum + q.score, 0),
            hasSpecialInputs: false,
            questions: section5Questions,
          },
        ],
      },
    };
  }

  /**
   * Update A-DTM template status (active/inactive)
   */
  async updateAdtmTemplateStatus(id: string, isActive: boolean) {
    const test = await this.testRepository.findOne({
      where: { id, testType: TestType.ADTM },
    });

    if (!test) {
      throw new NotFoundException(`A-DTM template with ID ${id} not found`);
    }

    // PUBLISHED = active, ARCHIVED = inactive
    test.status = isActive ? TestStatus.PUBLISHED : TestStatus.ARCHIVED;
    await this.testRepository.save(test);

    return {
      id: test.id,
      testCode: test.testCode,
      isActive: test.status === TestStatus.PUBLISHED,
      status: test.status,
    };
  }

  /**
   * Get A-DTM template statistics
   */
  async getAdtmTemplateStatistics(id: string) {
    const test = await this.testRepository.findOne({
      where: { id, testType: TestType.ADTM },
    });

    if (!test) {
      throw new NotFoundException(`A-DTM template with ID ${id} not found`);
    }

    // Get all submissions for this test
    const submissions = await this.submissionRepository.find({
      where: { testId: id },
      relations: ['adtmData'],
    });

    const totalSubmissions = submissions.length;
    const completedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.GRADED,
    ).length;
    const inProgressSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.IN_PROGRESS || s.status === SubmissionStatus.SUBMITTED,
    ).length;

    // Calculate average score
    const gradedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.GRADED && s.standardScore !== null,
    );
    const averageScore =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.standardScore || 0), 0) /
          gradedSubmissions.length
        : 0;

    // Score distribution
    const scoreRanges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 },
    ];

    const scoreDistribution = scoreRanges.map((range) => {
      const count = gradedSubmissions.filter(
        (s) =>
          s.standardScore !== null && s.standardScore >= range.min && s.standardScore <= range.max,
      ).length;
      return { range: range.range, count };
    });

    // Section averages (from adtmData)
    const sectionAverages = [
      { sectionNumber: 1, sectionName: 'Section 1', averageScore: 0 },
      { sectionNumber: 2, sectionName: 'Section 2', averageScore: 0 },
      { sectionNumber: 3, sectionName: 'Section 3', averageScore: 0 },
      { sectionNumber: 4, sectionName: 'Section 4', averageScore: 0 },
      { sectionNumber: 5, sectionName: 'Section 5', averageScore: 0 },
    ];

    const submissionsWithAdtmData = submissions.filter((s) => s.adtmData);
    if (submissionsWithAdtmData.length > 0) {
      sectionAverages[0].averageScore =
        submissionsWithAdtmData.reduce(
          (sum, s) => sum + (s.adtmData?.section1StandardScore || 0),
          0,
        ) / submissionsWithAdtmData.length;
      sectionAverages[1].averageScore =
        submissionsWithAdtmData.reduce(
          (sum, s) => sum + (s.adtmData?.section2StandardScore || 0),
          0,
        ) / submissionsWithAdtmData.length;
      sectionAverages[2].averageScore =
        submissionsWithAdtmData.reduce(
          (sum, s) => sum + (s.adtmData?.section3StandardScore || 0),
          0,
        ) / submissionsWithAdtmData.length;
      sectionAverages[3].averageScore =
        submissionsWithAdtmData.reduce(
          (sum, s) => sum + (s.adtmData?.section4StandardScore || 0),
          0,
        ) / submissionsWithAdtmData.length;
      sectionAverages[4].averageScore =
        submissionsWithAdtmData.reduce(
          (sum, s) => sum + (s.adtmData?.section5StandardScore || 0),
          0,
        ) / submissionsWithAdtmData.length;
    }

    return {
      totalSubmissions,
      completedSubmissions,
      inProgressSubmissions,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreDistribution,
      sectionAverages: sectionAverages.map((s) => ({
        ...s,
        averageScore: Math.round(s.averageScore * 100) / 100,
      })),
    };
  }

  /**
   * Helper: Group questions by unit for a section
   */
  private groupQuestionsBySection(questions: TestQuestion[]) {
    const unitsMap: Record<
      string,
      {
        name: string;
        questionCount: number;
        maxScore: number;
        questions: Array<{
          id: string;
          questionNumber: number;
          score: number;
          difficulty: number;
        }>;
      }
    > = {};

    questions.forEach((q) => {
      const unitName = q.unitName || 'Unnamed Unit';
      if (!unitsMap[unitName]) {
        unitsMap[unitName] = {
          name: unitName,
          questionCount: 0,
          maxScore: 0,
          questions: [],
        };
      }
      unitsMap[unitName].questionCount++;
      unitsMap[unitName].maxScore += q.score;
      unitsMap[unitName].questions.push({
        id: q.id,
        questionNumber: q.questionNumber,
        score: q.score,
        difficulty: q.difficulty || 2, // Default to 2 (Medium)
      });
    });

    return Object.values(unitsMap);
  }
}
