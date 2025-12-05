import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { Test } from '../../database/entities/test.entity';
import { TestType, SubmissionStatus } from '../../../../frontend/src/shared/types/enum';
import { AchievementGradingService } from './achievement-grading.service';
import { GradingResult } from './interfaces/grading-result.interface';

@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  constructor(
    @InjectRepository(StudentSubmission)
    private readonly submissionRepository: Repository<StudentSubmission>,
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    private readonly achievementGradingService: AchievementGradingService,
  ) {}

  /**
   * Grade a submission automatically based on test type
   * @param submissionId - ID of the submission to grade
   * @returns Grading result with all calculated scores
   */
  async gradeSubmission(submissionId: string): Promise<GradingResult> {
    // Get submission with test
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['test'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Validate submission status
    if (submission.status === SubmissionStatus.GRADED) {
      this.logger.warn(`Submission ${submissionId} is already graded. Re-grading...`);
    }

    if (submission.status === SubmissionStatus.NOT_STARTED) {
      throw new BadRequestException(`Submission ${submissionId} has not been started yet`);
    }

    // Get test to determine type
    const test = await this.testRepository.findOne({
      where: { id: submission.testId },
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${submission.testId} not found`);
    }

    // Route to appropriate grading service based on test type
    if (test.testType === TestType.ACHIEVEMENT) {
      return await this.achievementGradingService.gradeSubmission(submissionId);
    } else if (test.testType === TestType.ADTM) {
      throw new BadRequestException(
        'A-DTM tests require manual grading. Use the A-DTM grading service instead.',
      );
    } else {
      throw new BadRequestException(`Unknown test type: ${test.testType}`);
    }
  }

  /**
   * Auto-grade a submission when it's submitted
   * This should be called automatically when a student submits a test
   * @param submissionId - ID of the submission that was just submitted
   * @returns Grading result
   */
  async autoGradeOnSubmit(submissionId: string): Promise<GradingResult> {
    this.logger.log(`Auto-grading submission ${submissionId} on submit`);

    // Update submission status to SUBMITTED if not already
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Only auto-grade if status is SUBMITTED or IN_PROGRESS
    if (submission.status === SubmissionStatus.NOT_STARTED) {
      throw new BadRequestException(
        `Cannot auto-grade submission ${submissionId} that hasn't been started`,
      );
    }

    // Grade the submission
    const result = await this.gradeSubmission(submissionId);

    this.logger.log(
      `Auto-graded submission ${submissionId}: ${result.totalRawScore}/${result.maxScore} (${result.standardScore.toFixed(2)}%)`,
    );

    return result;
  }

  /**
   * Re-grade a submission (useful for corrections or updates)
   * @param submissionId - ID of the submission to re-grade
   * @returns Grading result
   */
  async reGradeSubmission(submissionId: string): Promise<GradingResult> {
    this.logger.log(`Re-grading submission ${submissionId}`);

    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Re-grade regardless of current status
    return await this.gradeSubmission(submissionId);
  }

  /**
   * Get grading result for a submission without re-grading
   * @param submissionId - ID of the submission
   * @returns Grading result if already graded, null otherwise
   */
  async getGradingResult(submissionId: string): Promise<GradingResult | null> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['test', 'answers', 'answers.question'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.status !== SubmissionStatus.GRADED) {
      return null;
    }

    // Reconstruct grading result from submission data
    // This is a simplified version - for full details, re-grade
    if (!submission.answers || submission.answers.length === 0) {
      return null;
    }

    const test = submission.test;
    if (!test) {
      throw new NotFoundException(`Test for submission ${submissionId} not found`);
    }

    // For now, return basic info. Full reconstruction would require re-grading
    // or storing the full grading result in submission.gradingData
    return {
      totalRawScore: submission.totalScore || 0,
      standardScore: submission.standardScore || 0,
      maxScore: test.totalScore || 0,
      unitScores: [],
      difficultyScores: [],
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 0,
    };
  }
}
