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
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { TestQueryDto } from './dto/test-query.dto';
import { TestType, TestStatus } from '@shared/types/enum';
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
  ) {}

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
      test.totalScore = (test.totalScore || 0) + scoreDiff;
      await this.testRepository.save(test);
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

    test.status = TestStatus.PUBLISHED;
    return this.testRepository.save(test);
  }
}
