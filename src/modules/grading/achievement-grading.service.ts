import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { Test } from '../../database/entities/test.entity';
import { SubmissionStatus, TestType } from '../../../../frontend/src/shared/types/enum';
import { GradingResult } from './interfaces/grading-result.interface';
import { UnitScore } from './interfaces/unit-score.interface';
import { DifficultyScore } from './interfaces/difficulty-score.interface';

@Injectable()
export class AchievementGradingService {
  private readonly logger = new Logger(AchievementGradingService.name);

  constructor(
    @InjectRepository(TestQuestion)
    private readonly questionRepository: Repository<TestQuestion>,
    @InjectRepository(StudentAnswer)
    private readonly answerRepository: Repository<StudentAnswer>,
    @InjectRepository(StudentSubmission)
    private readonly submissionRepository: Repository<StudentSubmission>,
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Grade a submission for an Achievement Test
   * @param submissionId - ID of the submission to grade
   * @returns Grading result with all calculated scores
   */
  async gradeSubmission(submissionId: string): Promise<GradingResult> {
    // Use transaction to ensure data consistency
    return await this.dataSource.transaction(async (manager) => {
      // Get submission with answers - answers should already have studentAnswer values
      const submission = await manager.getRepository(StudentSubmission).findOne({
        where: { id: submissionId },
        relations: ['answers', 'test'],
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      // Get test with questions
      const test = await manager.getRepository(Test).findOne({
        where: { id: submission.testId },
        relations: ['questions'],
      });

      if (!test) {
        throw new NotFoundException(`Test with ID ${submission.testId} not found`);
      }

      // Validate test type
      if (test.testType !== TestType.ACHIEVEMENT) {
        throw new BadRequestException(`Test ${test.id} is not an Achievement Test`);
      }

      // Ensure questions are loaded
      if (!test.questions || test.questions.length === 0) {
        throw new BadRequestException(`Test ${test.id} has no questions`);
      }

      // Sort questions by question number
      const questions = test.questions.sort((a, b) => a.questionNumber - b.questionNumber);

      // Validate submissionId before creating answers
      if (!submissionId || submissionId.trim() === '') {
        throw new BadRequestException(`Invalid submissionId: ${submissionId}`);
      }

      // Get or create answers for all questions
      // Pass submission.answers to preserve existing studentAnswer values
      this.logger.log(
        `Submission has ${submission.answers?.length || 0} existing answers. Answers with studentAnswer: ${submission.answers?.filter((a) => a.studentAnswer).length || 0}`,
      );

      const answers = await this.getOrCreateAnswers(
        manager,
        submission.id,
        questions,
        submission.answers || [],
      );

      // Log answers for debugging
      this.logger.log(
        `Grading ${answers.length} answers for submission ${submissionId}. Answers with studentAnswer: ${answers.filter((a) => a.studentAnswer).length}`,
      );

      // Grade each answer
      let totalRawScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;

      const answerRepo = manager.getRepository(StudentAnswer);

      for (const question of questions) {
        const answer = answers.find((a) => a.questionId === question.id);

        if (!answer) {
          this.logger.warn(
            `No answer found for question ${question.id} in submission ${submissionId}`,
          );
          continue;
        }

        // Compare student answer with correct answer
        const isCorrect = this.compareAnswers(answer.studentAnswer, question.correctAnswer);

        // Calculate score earned
        const scoreEarned = isCorrect ? question.score : 0;

        // Update answer properties for local use
        answer.isCorrect = isCorrect;
        answer.scoreEarned = scoreEarned;

        // Use raw SQL update to ensure is_correct is definitely updated
        // This bypasses any TypeORM entity tracking issues
        const updateQuery = `
          UPDATE student_answers
          SET is_correct = $1, score_earned = $2, updated_at = NOW()
          WHERE id = $3
        `;

        await manager.query(updateQuery, [isCorrect, scoreEarned, answer.id]);

        // Log the update for debugging
        this.logger.log(
          `Updated answer ${answer.id} for question ${question.id}: isCorrect=${isCorrect}, scoreEarned=${scoreEarned}, studentAnswer="${answer.studentAnswer}"`,
        );

        // Update counters
        totalRawScore += scoreEarned;
        if (isCorrect) {
          correctCount++;
        } else if (answer.studentAnswer && answer.studentAnswer.trim() !== '') {
          incorrectCount++;
        }
      }

      // Calculate max score
      const maxScore = questions.reduce((sum, q) => sum + q.score, 0);

      // Calculate standard score (0-100 scale)
      const standardScore = maxScore > 0 ? (totalRawScore / maxScore) * 100 : 0;

      // Calculate unit scores
      const unitScores = this.calculateUnitScores(questions, answers);

      // Calculate difficulty scores
      const difficultyScores = this.calculateDifficultyScores(questions, answers);

      // Calculate accuracy
      const totalAnswered = correctCount + incorrectCount;
      const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

      // Update submission
      submission.totalScore = totalRawScore;
      submission.standardScore = standardScore;
      submission.status = SubmissionStatus.GRADED;
      submission.gradedAt = new Date();

      // Save submission using update query to avoid cascade issues with answers
      // We've already updated all answers above using raw SQL
      const submissionRepo = manager.getRepository(StudentSubmission);
      await submissionRepo.update(
        { id: submission.id },
        {
          totalScore: submission.totalScore,
          standardScore: submission.standardScore,
          status: submission.status,
          gradedAt: submission.gradedAt,
        },
      );

      // Build and return grading result
      const result: GradingResult = {
        totalRawScore,
        standardScore,
        maxScore,
        unitScores,
        difficultyScores,
        correctCount,
        incorrectCount,
        accuracy,
      };

      this.logger.log(
        `Graded submission ${submissionId}: ${totalRawScore}/${maxScore} (${standardScore.toFixed(2)}%)`,
      );

      return result;
    });
  }

  /**
   * Compare student answer with correct answer
   * Normalizes both answers (trim, lowercase) before comparison
   * @param studentAnswer - Student's answer
   * @param correctAnswer - Correct answer
   * @returns true if answers match
   */
  compareAnswers(studentAnswer: string | null, correctAnswer: string): boolean {
    if (!studentAnswer) {
      return false;
    }

    // Normalize both answers: trim whitespace and convert to lowercase
    const normalizedStudent = studentAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();

    return normalizedStudent === normalizedCorrect;
  }

  /**
   * Get or create answer records for all questions
   * @param manager - TypeORM transaction manager
   * @param submissionId - Submission ID
   * @param questions - Array of test questions
   * @returns Array of student answers
   */
  private async getOrCreateAnswers(
    manager: EntityManager,
    submissionId: string,
    questions: TestQuestion[],
    existingAnswers: StudentAnswer[] = [],
  ): Promise<StudentAnswer[]> {
    // Validate submissionId
    if (!submissionId) {
      throw new BadRequestException('submissionId is required to create answers');
    }

    const answers: StudentAnswer[] = [];

    for (const question of questions) {
      const answerRepo = manager.getRepository(StudentAnswer);

      // First, try to find in existing answers from submission (preserves studentAnswer)
      let answer = existingAnswers.find(
        (a) => a.questionId === question.id && a.submissionId === submissionId,
      );

      // If not found in existing, fetch from database
      if (!answer) {
        const dbAnswer = await answerRepo.findOne({
          where: {
            submissionId,
            questionId: question.id,
          },
        });
        answer = dbAnswer || undefined;
      }

      if (!answer) {
        // Create new answer record if it doesn't exist
        // Check if there's a studentAnswer in existingAnswers that we should preserve
        const existingAnswerWithValue = existingAnswers.find((a) => a.questionId === question.id);
        const studentAnswerValue = existingAnswerWithValue?.studentAnswer || null;

        // Validate submissionId first
        if (!submissionId || typeof submissionId !== 'string' || submissionId.trim() === '') {
          this.logger.error(
            `submissionId is invalid when creating answer for submission ${submissionId}, question ${question.id}`,
          );
          throw new BadRequestException(
            `submissionId is required but was invalid for question ${question.id}`,
          );
        }

        // Use raw SQL insert to ensure submission_id is properly set
        // This bypasses any TypeORM entity mapping issues
        // Double-check submissionId is valid before inserting
        if (!submissionId || typeof submissionId !== 'string' || submissionId.trim() === '') {
          this.logger.error(
            `submissionId is invalid right before insert: ${submissionId}, type: ${typeof submissionId}`,
          );
          throw new BadRequestException(
            `submissionId is required but was invalid for question ${question.id}`,
          );
        }

        if (!question.id || typeof question.id !== 'string') {
          this.logger.error(`question.id is invalid: ${question.id}`);
          throw new BadRequestException(`Invalid question ID for question ${question.id}`);
        }

        // Use parameterized query with explicit type casting
        // Preserve studentAnswer if it exists in existingAnswers
        const insertQuery = `
          INSERT INTO student_answers (id, submission_id, question_id, student_answer, score_earned, is_correct, created_at, updated_at)
          VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, NOW(), NOW())
          RETURNING id
        `;

        this.logger.debug(
          `Inserting answer for submission ${submissionId}, question ${question.id}, studentAnswer: ${studentAnswerValue || 'null'}`,
        );

        const insertResult = await manager.query(insertQuery, [
          submissionId,
          question.id,
          studentAnswerValue, // Use existing studentAnswer if available, otherwise null
          null,
          null,
        ]);

        if (!insertResult || !insertResult[0] || !insertResult[0].id) {
          throw new BadRequestException(`Failed to insert answer for question ${question.id}`);
        }

        const insertedId = insertResult[0].id;

        // Fetch the created answer to return
        const fetchedAnswer = await answerRepo.findOne({
          where: { id: insertedId },
        });

        if (!fetchedAnswer) {
          throw new BadRequestException(
            `Failed to retrieve created answer for question ${question.id}`,
          );
        }

        answer = fetchedAnswer;

        // Final verification that submissionId is set
        if (!answer.submissionId) {
          this.logger.error(
            `Answer created but submissionId is null for answer ${insertedId}, submission ${submissionId}`,
          );
          throw new BadRequestException(
            `Answer created but submissionId is missing for question ${question.id}`,
          );
        }
      }

      answers.push(answer);
    }

    return answers;
  }

  /**
   * Calculate scores grouped by unit
   * @param questions - Array of test questions
   * @param answers - Array of student answers
   * @returns Array of unit scores
   */
  calculateUnitScores(questions: TestQuestion[], answers: StudentAnswer[]): UnitScore[] {
    // Group questions by unit
    const unitMap = new Map<string, { questions: TestQuestion[]; answers: StudentAnswer[] }>();

    for (const question of questions) {
      const unitName = question.unitName || 'Unknown';

      if (!unitMap.has(unitName)) {
        unitMap.set(unitName, { questions: [], answers: [] });
      }

      const unitData = unitMap.get(unitName)!;
      unitData.questions.push(question);

      const answer = answers.find((a) => a.questionId === question.id);
      if (answer) {
        unitData.answers.push(answer);
      }
    }

    // Calculate scores for each unit
    const unitScores: UnitScore[] = [];

    for (const [unitName, unitData] of unitMap.entries()) {
      let rawScore = 0;
      let maxScore = 0;

      for (const question of unitData.questions) {
        maxScore += question.score;

        const answer = unitData.answers.find((a) => a.questionId === question.id);
        if (answer && answer.isCorrect) {
          rawScore += question.score;
        }
      }

      const standardScore = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;

      unitScores.push({
        unitName,
        rawScore,
        maxScore,
        standardScore,
        questionCount: unitData.questions.length,
      });
    }

    // Sort by unit name for consistency
    return unitScores.sort((a, b) => a.unitName.localeCompare(b.unitName));
  }

  /**
   * Calculate scores grouped by difficulty level
   * @param questions - Array of test questions
   * @param answers - Array of student answers
   * @returns Array of difficulty scores
   */
  calculateDifficultyScores(
    questions: TestQuestion[],
    answers: StudentAnswer[],
  ): DifficultyScore[] {
    // Group questions by difficulty (1-4)
    const difficultyMap = new Map<
      number,
      { questions: TestQuestion[]; answers: StudentAnswer[] }
    >();

    for (const question of questions) {
      // Convert difficulty to number if needed (backward compatibility)
      let difficultyNum: number;
      if (typeof question.difficulty === 'number') {
        difficultyNum = question.difficulty;
      } else if (typeof question.difficulty === 'string') {
        // Map enum to number: LOW=1, MEDIUM=2, HIGH=3
        const difficultyMapEnum: Record<string, number> = {
          LOW: 1,
          MEDIUM: 2,
          HIGH: 3,
        };
        difficultyNum = difficultyMapEnum[question.difficulty] || 2;
      } else {
        difficultyNum = 2; // Default to 2 (Medium)
      }

      // Ensure difficulty is in valid range (1-4)
      if (difficultyNum < 1 || difficultyNum > 4) {
        difficultyNum = 2; // Default to 2 if invalid
      }

      if (!difficultyMap.has(difficultyNum)) {
        difficultyMap.set(difficultyNum, { questions: [], answers: [] });
      }

      const difficultyData = difficultyMap.get(difficultyNum)!;
      difficultyData.questions.push(question);

      const answer = answers.find((a) => a.questionId === question.id);
      if (answer) {
        difficultyData.answers.push(answer);
      }
    }

    // Calculate scores for each difficulty level
    const difficultyScores: DifficultyScore[] = [];

    for (const [difficulty, difficultyData] of difficultyMap.entries()) {
      let rawScore = 0;
      let maxScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;

      for (const question of difficultyData.questions) {
        maxScore += question.score;

        const answer = difficultyData.answers.find((a) => a.questionId === question.id);
        if (answer) {
          if (answer.isCorrect) {
            rawScore += question.score;
            correctCount++;
          } else if (answer.studentAnswer && answer.studentAnswer.trim() !== '') {
            incorrectCount++;
          }
        }
      }

      const standardScore = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;

      difficultyScores.push({
        difficulty,
        rawScore,
        maxScore,
        standardScore,
        questionCount: difficultyData.questions.length,
        correctCount,
        incorrectCount,
      });
    }

    // Sort by difficulty level: 4 (Very Hard), 3 (Hard), 2 (Medium), 1 (Easy)
    return difficultyScores.sort((a, b) => b.difficulty - a.difficulty);
  }
}
