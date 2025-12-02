import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { Test } from '../../database/entities/test.entity';
import { SubmissionStatus, TestType } from '@shared/types/enum';
import { GradingResult } from './interfaces/grading-result.interface';
import { UnitScore } from './interfaces/unit-score.interface';
import { DifficultyScore } from './interfaces/difficulty-score.interface';
import { DifficultyLevel } from '@shared/types/enum';

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
      // Get submission with answers
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

      // Get or create answers for all questions
      const answers = await this.getOrCreateAnswers(manager, submissionId, questions);

      // Grade each answer
      let totalRawScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;

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

        // Update answer record
        answer.isCorrect = isCorrect;
        answer.scoreEarned = scoreEarned;

        // Update counters
        totalRawScore += scoreEarned;
        if (isCorrect) {
          correctCount++;
        } else if (answer.studentAnswer && answer.studentAnswer.trim() !== '') {
          incorrectCount++;
        }

        await manager.getRepository(StudentAnswer).save(answer);
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

      await manager.getRepository(StudentSubmission).save(submission);

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
    manager: any,
    submissionId: string,
    questions: TestQuestion[],
  ): Promise<StudentAnswer[]> {
    const answers: StudentAnswer[] = [];

    for (const question of questions) {
      const answerRepo = manager.getRepository(StudentAnswer);
      let answer = await answerRepo.findOne({
        where: {
          submissionId,
          questionId: question.id,
        },
      });

      if (!answer) {
        // Create new answer record if it doesn't exist
        answer = answerRepo.create({
          submissionId,
          questionId: question.id,
          studentAnswer: null,
          scoreEarned: null,
          isCorrect: null,
        });
        answer = await answerRepo.save(answer);
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
    // Group questions by difficulty
    const difficultyMap = new Map<
      DifficultyLevel,
      { questions: TestQuestion[]; answers: StudentAnswer[] }
    >();

    for (const question of questions) {
      const difficulty = question.difficulty || DifficultyLevel.MEDIUM;

      if (!difficultyMap.has(difficulty)) {
        difficultyMap.set(difficulty, { questions: [], answers: [] });
      }

      const difficultyData = difficultyMap.get(difficulty)!;
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

    // Sort by difficulty level: HIGH, MEDIUM, LOW
    const difficultyOrder = {
      [DifficultyLevel.HIGH]: 0,
      [DifficultyLevel.MEDIUM]: 1,
      [DifficultyLevel.LOW]: 2,
    };

    return difficultyScores.sort(
      (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty],
    );
  }
}
