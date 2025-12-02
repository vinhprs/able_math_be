import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { StudentAnswer } from '../../database/entities/student-answer.entity';
import { AdtmSubmission } from '../../database/entities/adtm-submission.entity';
import { TestQuestion } from '../../database/entities/test-question.entity';
import { Test } from '../../database/entities/test.entity';
import { TestType, SubmissionStatus } from '@shared/types/enum';
import {
  Section1Input,
  Section1Result,
  SectionInput,
  SectionResult,
  UnitScoreResult,
  AdtmGradingResult,
} from './interfaces/adtm-grading.interface';

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
}
