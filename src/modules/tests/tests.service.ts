import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Test } from './entities/test.entity';
import { TestQuestion } from './entities/test-question.entity';
import { CreateTestDto } from './dto/create-test.dto';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    @InjectRepository(TestQuestion)
    private readonly questionRepository: Repository<TestQuestion>,
  ) {}

  /**
   * Generate test code based on test details
   * Format: {GRADE}_T{TERM}_L{LEVEL}_{VERSION}
   * Example: E4_T1_L1_01
   */
  generateTestCode(gradeLevel: string, term: string, level: number, version: string): string {
    const termNumber = term.replace('T', '');
    return `${gradeLevel}_T${termNumber}_L${level}_${version}`;
  }

  /**
   * Create a new test
   */
  async create(createTestDto: CreateTestDto, creatorId: string): Promise<Test> {
    // Generate test code
    const testCode = this.generateTestCode(
      createTestDto.gradeLevel,
      createTestDto.term,
      createTestDto.level,
      createTestDto.version,
    );

    // Check if test code already exists
    const existingTest = await this.testRepository.findOne({ where: { testCode } });
    if (existingTest) {
      throw new ConflictException(`Test with code ${testCode} already exists`);
    }

    // Create test
    const test = this.testRepository.create({
      ...createTestDto,
      testCode,
      creatorId,
    });

    return this.testRepository.save(test);
  }

  /**
   * Find all tests
   */
  async findAll(): Promise<Test[]> {
    return this.testRepository.find({
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find test by ID with questions
   */
  async findOne(id: string): Promise<Test> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['creator', 'questions'],
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${id} not found`);
    }

    return test;
  }

  /**
   * Add questions to a test
   */
  async addQuestions(testId: string, questions: CreateQuestionDto[]): Promise<TestQuestion[]> {
    const test = await this.findOne(testId);

    const questionEntities = questions.map((q) =>
      this.questionRepository.create({
        ...q,
        testId: test.id,
      }),
    );

    const savedQuestions = await this.questionRepository.save(questionEntities);

    // Update total score
    const totalScore = savedQuestions.reduce((sum, q) => sum + q.score, 0);
    test.totalScore += totalScore;
    await this.testRepository.save(test);

    return savedQuestions;
  }

  /**
   * Remove a test
   */
  async remove(id: string): Promise<void> {
    const test = await this.findOne(id);
    await this.testRepository.remove(test);
  }
}

