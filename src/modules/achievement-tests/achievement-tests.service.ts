import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Test } from '../../database/entities/test.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { CurriculumUnit } from '../../database/entities/curriculum-unit.entity';
import { TestType, TestStatus, ExamType, AnswerType } from '@shared/types/enum';
import { CreateTestSetupDto } from './dto/create-test-setup.dto';
import { SelectUnitsDto } from './dto/select-units.dto';
import { ConfigureQuestionsDto } from './dto/configure-questions.dto';
import { EnterAnswersDto } from './dto/enter-answers.dto';
import { FinalizeTestDto } from './dto/finalize-test.dto';

@Injectable()
export class AchievementTestsService {
  constructor(
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,

    @InjectRepository(TestQuestion)
    private readonly testQuestionRepository: Repository<TestQuestion>,

    @InjectRepository(CurriculumUnit)
    private readonly curriculumUnitRepository: Repository<CurriculumUnit>,
  ) {}

  /**
   * Step 1: Create Test Setup
   */
  async createTestSetup(dto: CreateTestSetupDto, userId: string) {
    // 1. Generate test code
    const testCode = this.generateTestCode(dto);

    // 2. Check duplicate
    const existing = await this.testRepository.findOne({
      where: { testCode },
    });

    if (existing) {
      throw new ConflictException(`Test code ${testCode} already exists`);
    }

    // 3. Map level: L2 → 2
    const levelNumber = parseInt(dto.level.substring(1));

    // 4. Map examType to enum
    const examTypeEnum = dto.examType === 'MIDTERM' ? ExamType.MIDTERM : ExamType.FINAL;

    // 5. Create test
    const test = this.testRepository.create({
      testCode,
      testType: TestType.ACHIEVEMENT,
      title: `${dto.grade} ${dto.semester}학기 ${dto.examType === 'MIDTERM' ? '중간고사' : '기말고사'}`,
      curriculum: '2015개정', // ✅ Fixed value
      grade: dto.grade,
      semester: dto.semester.toString(),
      term: '',
      level: levelNumber,
      examType: examTypeEnum,
      testNumber: dto.testNumber,
      totalQuestions: dto.totalQuestions,
      totalScore: 0,
      status: TestStatus.DRAFT,
      creatorId: userId,
      // ✅ Initialize statistics with default values
      nationalAverage: 0,
      maxScore: 0,
      totalApplicants: 0,
    });

    const savedTest = await this.testRepository.save(test);

    return {
      testId: savedTest.id,
      testCode: savedTest.testCode,
    };
  }

  /**
   * Generate test code: E41-T1-L2-01
   * Format: {GRADE}{SEMESTER}-T{EXAM}-{LEVEL}-{TESTNUMBER}
   */
  private generateTestCode(dto: CreateTestSetupDto): string {
    const examNum = dto.examType === 'MIDTERM' ? '1' : '2';
    return `${dto.grade}${dto.semester}-T${examNum}-${dto.level}-${dto.testNumber}`;
  }

  /**
   * Step 2: Get Units
   */
  async getUnits(grade: string, semester: string) {
    const units = await this.curriculumUnitRepository.find({
      where: {
        curriculum: '2015개정', // ✅ Fixed value
        grade,
        semester,
      },
      order: { displayOrder: 'ASC' },
    });

    return {
      units: units.map((u) => ({
        id: u.id,
        unitName: u.unitName,
        displayOrder: u.displayOrder,
      })),
    };
  }

  /**
   * Step 2: Save Selected Units
   */
  async selectUnits(testId: string, dto: SelectUnitsDto) {
    const test = await this.findTestById(testId);

    // Validate units exist
    const units = await this.curriculumUnitRepository.find({
      where: { id: In(dto.selectedUnitIds) },
    });

    if (units.length !== dto.selectedUnitIds.length) {
      throw new BadRequestException('Some units not found');
    }

    return { message: 'Units selected successfully' };
  }

  /**
   * Step 3: Configure Questions
   */
  async configureQuestions(testId: string, dto: ConfigureQuestionsDto) {
    const test = await this.findTestById(testId);

    // Validate count
    if (dto.questions.length !== test.totalQuestions) {
      throw new BadRequestException(
        `Expected ${test.totalQuestions} questions, got ${dto.questions.length}`,
      );
    }

    // Validate sequential numbers
    const questionNumbers = dto.questions.map((q) => q.questionNo).sort((a, b) => a - b);

    for (let i = 0; i < questionNumbers.length; i++) {
      if (questionNumbers[i] !== i + 1) {
        throw new BadRequestException('Question numbers must be sequential from 1');
      }
    }

    // Get unit names
    const unitIds = dto.questions.map((q) => q.unitId);
    const units = await this.curriculumUnitRepository.find({
      where: { id: In(unitIds) },
    });
    const unitMap = new Map(units.map((u) => [u.id, u.unitName]));

    // Delete existing questions
    await this.testQuestionRepository.delete({ testId: test.id });

    // Create questions
    const testQuestions: TestQuestion[] = [];
    for (const q of dto.questions) {
      const question = new TestQuestion();
      question.testId = test.id;
      question.questionNumber = q.questionNo;
      question.sectionNumber = 1;
      question.unitName = unitMap.get(q.unitId) || '';
      question.answerType =
        q.type === 'MULTIPLE_CHOICE' ? AnswerType.MULTIPLE_CHOICE : AnswerType.SHORT_ANSWER;
      question.correctAnswer = '';
      question.score = q.score;
      // ✅ No text or image for Achievement Test (fields are nullable, will be null in DB)
      testQuestions.push(question);
    }

    await this.testQuestionRepository.save(testQuestions);

    return { message: 'Questions configured successfully' };
  }

  /**
   * Step 4: Enter Answers
   */
  async enterAnswers(testId: string, dto: EnterAnswersDto) {
    const test = await this.findTestById(testId);

    const questions = await this.testQuestionRepository.find({
      where: { testId: test.id },
      order: { questionNumber: 'ASC' },
    });

    if (dto.answers.length !== questions.length) {
      throw new BadRequestException('Must provide answers for all questions');
    }

    // Update answers
    for (const answerDto of dto.answers) {
      const question = questions.find((q) => q.questionNumber === answerDto.questionNo);

      if (!question) {
        throw new NotFoundException(`Question ${answerDto.questionNo} not found`);
      }

      question.correctAnswer = answerDto.correctAnswer.trim();
      await this.testQuestionRepository.save(question);
    }

    return { message: 'Answers entered successfully' };
  }

  /**
   * Step 5: Finalize Test
   */
  async finalizeTest(testId: string, dto: FinalizeTestDto) {
    const test = await this.findTestById(testId);

    // Validate all answers entered
    const questions = await this.testQuestionRepository.find({
      where: { testId: test.id },
    });

    const missingAnswers = questions.filter((q) => !q.correctAnswer || q.correctAnswer === '');

    if (missingAnswers.length > 0) {
      throw new BadRequestException(
        `Missing answers for questions: ${missingAnswers.map((q) => q.questionNumber).join(', ')}`,
      );
    }

    // Calculate total score
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

    // Update test
    await this.testRepository.update(test.id, {
      nationalAverage: dto.nationalAverage,
      maxScore: dto.maxScore,
      totalApplicants: dto.totalApplicants,
      totalScore,
      status: TestStatus.PUBLISHED,
    });

    return {
      testCode: test.testCode,
      status: TestStatus.PUBLISHED,
      totalScore,
    };
  }

  /**
   * Get Test List
   */
  async getTestList(query: { page?: number; limit?: number; grade?: string; status?: TestStatus }) {
    const { page = 1, limit = 20, grade, status } = query;

    const where: {
      testType: TestType;
      grade?: string;
      status?: TestStatus;
    } = {
      testType: TestType.ACHIEVEMENT,
    };

    if (grade) where.grade = grade;
    if (status) where.status = status;

    const [tests, total] = await this.testRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      tests: tests.map((t) => ({
        id: t.id,
        testCode: t.testCode,
        grade: t.grade,
        semester: t.semester,
        examType: t.examType,
        level: `L${t.level}`, // Convert back: 2 → L2
        totalQuestions: t.totalQuestions,
        totalScore: t.totalScore,
        status: t.status,
        createdAt: t.createdAt,
      })),
      total,
      page: parseInt(page.toString()),
      limit: parseInt(limit.toString()),
    };
  }

  /**
   * Get Test Detail
   */
  async getTestDetail(testId: string) {
    const test = await this.testRepository.findOne({
      where: { id: testId, testType: TestType.ACHIEVEMENT },
      relations: ['questions'],
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return {
      id: test.id,
      testCode: test.testCode,
      curriculum: test.curriculum,
      grade: test.grade,
      semester: test.semester,
      examType: test.examType,
      level: `L${test.level}`,
      testNumber: test.testNumber,
      totalQuestions: test.totalQuestions,
      totalScore: test.totalScore,
      nationalAverage: test.nationalAverage,
      maxScore: test.maxScore,
      totalApplicants: test.totalApplicants,
      status: test.status,
      createdAt: test.createdAt,
      questions: test.questions
        .sort((a, b) => a.questionNumber - b.questionNumber)
        .map((q) => ({
          questionNo: q.questionNumber,
          type: q.answerType,
          unitName: q.unitName,
          correctAnswer: q.correctAnswer,
          score: q.score,
        })),
    };
  }

  /**
   * Helper: Find test by ID
   */
  private async findTestById(testId: string): Promise<Test> {
    const test = await this.testRepository.findOne({
      where: { id: testId, testType: TestType.ACHIEVEMENT },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return test;
  }
}
