import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentSubmission } from '../../database/entities/student-submission.entity';
import { AdtmSubmission } from '../../database/entities/adtm-submission.entity';
import { ReportCard, ReportStatus } from '../../database/entities/report-card.entity';
import { Test } from '../../database/entities/test.entity';
import { User } from '../../database/entities/user.entity';
import { TestType, SubmissionStatus } from '@shared/types/enum';
import { AchievementGradingService } from '../grading/achievement-grading.service';
import { AdtmGradingService } from '../grading/adtm-grading.service';
import {
  AchievementReportData,
  AdtmReportData,
  ChartData,
} from './interfaces/report-data.interface';
import { PdfGeneratorService } from './pdf-generator.service';
import { UNIT_NAMES } from '../../../scripts/constants/unit-names';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(StudentSubmission)
    private readonly submissionRepository: Repository<StudentSubmission>,
    @InjectRepository(ReportCard)
    private readonly reportCardRepository: Repository<ReportCard>,
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly achievementGradingService: AchievementGradingService,
    @Inject(forwardRef(() => AdtmGradingService))
    private readonly adtmGradingService: AdtmGradingService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  /**
   * Generate Achievement Test report
   * @param submissionId - ID of the submission
   * @returns Complete report data
   */
  async generateAchievementReport(submissionId: string): Promise<AchievementReportData> {
    this.logger.log(`Generating Achievement report for submission ${submissionId}`);

    // Get submission with all relations
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['student', 'test', 'answers', 'answers.question'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Validate test type
    if (submission.test.testType !== TestType.ACHIEVEMENT) {
      throw new BadRequestException(`Submission ${submissionId} is not an Achievement test`);
    }

    // Ensure submission is graded
    if (submission.status !== SubmissionStatus.GRADED) {
      this.logger.warn(`Submission ${submissionId} is not graded yet. Auto-grading...`);
      await this.achievementGradingService.gradeSubmission(submissionId);
      // Reload submission after grading
      const reloaded = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['student', 'test', 'answers', 'answers.question'],
      });
      if (!reloaded) {
        throw new NotFoundException(`Failed to reload submission ${submissionId}`);
      }
      Object.assign(submission, reloaded);
    }

    // Get grading result
    const gradingResult = await this.achievementGradingService.gradeSubmission(submissionId);

    // Map unit names to include English names
    const unitScoresWithEnglish = gradingResult.unitScores.map((unit) => {
      const englishName = this.getEnglishUnitName(unit.unitName);
      return {
        ...unit,
        unitNameEnglish: englishName,
      };
    });

    // Build report data
    const reportData: AchievementReportData = {
      student: {
        name: submission.student.fullName,
        grade: submission.student.grade || 'N/A',
        school: submission.student.school || undefined,
      },
      test: {
        title: submission.test.title,
        code: submission.test.testCode,
        testDate: submission.submittedAt || submission.createdAt,
        grade: submission.test.grade,
        semester: submission.test.semester,
        level: submission.test.level,
        examType: submission.test.examType,
        testNumber: submission.test.testNumber,
        nationalAverage: submission.test.nationalAverage || 0,
        maxScore: submission.test.maxScore || 0,
        totalApplicants: submission.test.totalApplicants || 0,
      },
      scores: {
        totalRaw: gradingResult.totalRawScore,
        totalMax: gradingResult.maxScore,
        standardScore: gradingResult.standardScore,
        correctCount: gradingResult.correctCount,
        incorrectCount: gradingResult.incorrectCount,
        accuracy: gradingResult.accuracy,
      },
      unitScores: unitScoresWithEnglish,
      difficultyScores: gradingResult.difficultyScores,
      questionBreakdown: this.buildQuestionBreakdown(submission),
      charts: {
        unitBar: this.generateUnitBarChart(unitScoresWithEnglish),
        difficultyPie: this.generateDifficultyPieChart(
          gradingResult.difficultyScores.map((ds) => ({
            difficulty: this.mapDifficultyToString(ds.difficulty),
            standardScore: ds.standardScore,
          })),
        ),
      },
    };

    // Save report to database
    await this.saveReportCard(submissionId, 'ACHIEVEMENT', reportData);

    return reportData;
  }

  /**
   * Generate A-DTM Test report
   * @param submissionId - ID of the submission
   * @returns Complete report data
   */
  async generateAdtmReport(submissionId: string): Promise<AdtmReportData> {
    this.logger.log(`Generating A-DTM report for submission ${submissionId}`);

    // Get submission with all relations including questions and answers
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['student', 'test', 'adtmData', 'answers', 'answers.question', 'test.questions'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Validate test type
    if (submission.test.testType !== TestType.ADTM) {
      throw new BadRequestException(`Submission ${submissionId} is not an A-DTM test`);
    }

    // Get or ensure A-DTM data exists
    let adtmData = submission.adtmData;
    if (!adtmData) {
      // Try to grade if not graded yet
      this.logger.warn(`Submission ${submissionId} has no A-DTM data. Attempting to grade...`);
      await this.adtmGradingService.gradeAdtmSubmission(submissionId);
      // Reload submission
      const reloaded = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['student', 'test', 'adtmData'],
      });
      if (!reloaded || !reloaded.adtmData) {
        throw new BadRequestException(
          `Failed to generate A-DTM data for submission ${submissionId}`,
        );
      }
      adtmData = reloaded.adtmData;
    }

    // Ensure domain data is calculated (re-grade if missing)
    if (
      adtmData.basicLearningAvg === null ||
      adtmData.basicLearningAvg === undefined ||
      adtmData.creativeThinkingAvg === null ||
      adtmData.creativeThinkingAvg === undefined
    ) {
      this.logger.warn(`Submission ${submissionId} has missing domain data. Re-calculating...`);
      await this.adtmGradingService.gradeAdtmSubmission(submissionId);
      // Reload submission to get updated domain data
      const reloaded = await this.submissionRepository.findOne({
        where: { id: submissionId },
        relations: ['student', 'test', 'adtmData'],
      });
      if (reloaded?.adtmData) {
        adtmData = reloaded.adtmData;
      }
    }

    // Build sections data with difficulty breakdown
    const sections = await this.buildAdtmSections(adtmData, submission);

    // Generate recommendations
    const recommendations = this.generateRecommendations(adtmData, sections);

    // Build domain data
    const domains: AdtmReportData['domains'] = {
      basicLearningAbility: {
        averageScore: adtmData.basicLearningAvg || 0,
        standardScore: adtmData.basicLearningAvg || 0,
        evaluation: (adtmData.basicLearningEval as 'high' | 'medium' | 'low') || 'low',
        evaluationColor: adtmData.basicLearningColor || '#EF4444',
        sections: sections.slice(0, 3), // Sections 1-3
      },
      creativeThinkingAbility: {
        averageScore: adtmData.creativeThinkingAvg || 0,
        standardScore: adtmData.creativeThinkingAvg || 0,
        evaluation: (adtmData.creativeThinkingEval as 'high' | 'medium' | 'low') || 'low',
        evaluationColor: adtmData.creativeThinkingColor || '#EF4444',
        sections: sections.slice(3, 5), // Sections 4-5
      },
    };

    // Build report data
    const reportData: AdtmReportData = {
      student: {
        name: submission.student.fullName,
        grade: submission.student.grade || 'N/A',
        school: submission.student.school || undefined,
      },
      test: {
        level: adtmData.testLevel,
        testDate: submission.submittedAt || submission.createdAt,
        testCode: submission.test.testCode,
      },
      overallScore: adtmData.overallStandardScore || 0,
      sections,
      domains,
      charts: {
        sectionBar: this.generateSectionBarChart(sections),
        unitRadar: this.generateUnitRadarChart(sections),
      },
      areaDifficulty: this.generateAreaDifficultyData(sections),
      recommendations,
    };

    // Save report to database
    await this.saveReportCard(submissionId, 'ADTM', reportData);

    return reportData;
  }

  /**
   * Generate PDF for a report
   * @param submissionId - ID of the submission
   * @param type - Report type ('ACHIEVEMENT' or 'ADTM')
   * @returns PDF URL
   */
  async generatePdf(submissionId: string, type: 'ACHIEVEMENT' | 'ADTM'): Promise<string> {
    this.logger.log(`Generating PDF for ${type} report: ${submissionId}`);

    let reportData: AchievementReportData | AdtmReportData;

    if (type === 'ACHIEVEMENT') {
      reportData = await this.generateAchievementReport(submissionId);
    } else {
      reportData = await this.generateAdtmReport(submissionId);
    }

    // Generate PDF
    const pdfUrl = await this.pdfGeneratorService.generatePdf(reportData, type);

    // Update report card with PDF URL
    const reportCard = await this.reportCardRepository.findOne({
      where: { submissionId },
    });

    if (reportCard) {
      reportCard.pdfUrl = pdfUrl;
      await this.reportCardRepository.save(reportCard);
    }

    return pdfUrl;
  }

  /**
   * Get existing report card by submission ID
   * @param submissionId - ID of the submission
   * @returns Report card if exists
   */
  async getReportCard(submissionId: string): Promise<ReportCard | null> {
    return await this.reportCardRepository.findOne({
      where: { submissionId },
      relations: ['student', 'test', 'test.creator'],
    });
  }

  /**
   * Get report card by report ID
   * @param reportId - ID of the report
   * @returns Report card if exists
   */
  async getReportCardById(reportId: string): Promise<ReportCard | null> {
    return await this.reportCardRepository.findOne({
      where: { id: reportId },
      relations: ['student', 'test', 'test.creator', 'submission'],
    });
  }

  /**
   * Get pending reports for teacher to review
   * @param teacherId - ID of the teacher
   * @returns Array of pending reports
   */
  async getPendingReports(teacherId: string) {
    // Get reports from submissions of tests created by this teacher
    const reports = await this.reportCardRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.submission', 'submission')
      .leftJoinAndSelect('report.student', 'student')
      .leftJoinAndSelect('report.test', 'test')
      .leftJoinAndSelect('test.creator', 'creator')
      .where('report.status = :status', { status: ReportStatus.PENDING_REVIEW })
      .andWhere('test.creatorId = :teacherId', { teacherId })
      .orderBy('report.createdAt', 'DESC')
      .getMany();

    return reports.map((report) => ({
      id: report.id,
      submissionId: report.submissionId,
      studentName: report.student.fullName,
      testTitle: report.test.title,
      testCode: report.test.testCode,
      createdAt: report.createdAt,
      totalScore: report.submission.totalScore,
    }));
  }

  /**
   * Get all reports for teacher (with optional filters)
   * Only returns reports from tests created by this teacher
   * @param teacherId - ID of the teacher
   * @param filters - Optional filters (status, testType)
   * @returns Array of reports
   */
  async getAllReportsForTeacher(
    teacherId: string,
    filters?: {
      status?: ReportStatus;
      testType?: TestType;
    },
  ) {
    const queryBuilder = this.reportCardRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.submission', 'submission')
      .leftJoinAndSelect('report.student', 'student')
      .leftJoinAndSelect('report.test', 'test')
      .leftJoinAndSelect('test.creator', 'creator')
      .where('student.createdBy = :teacherId', { teacherId });

    // Apply filters
    if (filters?.status) {
      queryBuilder.andWhere('report.status = :status', { status: filters.status });
    }

    if (filters?.testType) {
      queryBuilder.andWhere('test.testType = :testType', { testType: filters.testType });
    }

    const reports = await queryBuilder.orderBy('report.createdAt', 'DESC').getMany();

    return reports.map((report) => ({
      id: report.id,
      submissionId: report.submissionId,
      studentName: report.student.fullName,
      studentId: report.studentId,
      testTitle: report.test.title,
      testCode: report.test.testCode,
      testType: report.test.testType,
      status: report.status,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      totalScore: report.submission?.totalScore || 0,
      pdfUrl: report.pdfUrl,
    }));
  }

  /**
   * Get all reports for admin (with optional filters)
   * @param filters - Optional filters (status, testType, teacherId)
   * @returns Array of reports
   */
  async getAllReports(filters?: {
    status?: ReportStatus;
    testType?: TestType;
    teacherId?: string;
  }) {
    const queryBuilder = this.reportCardRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.submission', 'submission')
      .leftJoinAndSelect('report.student', 'student')
      .leftJoinAndSelect('report.test', 'test')
      .leftJoinAndSelect('test.creator', 'creator');

    // Apply filters
    if (filters?.status) {
      queryBuilder.andWhere('report.status = :status', { status: filters.status });
    }

    if (filters?.testType) {
      queryBuilder.andWhere('test.testType = :testType', { testType: filters.testType });
    }

    if (filters?.teacherId) {
      queryBuilder.andWhere('test.creatorId = :teacherId', { teacherId: filters.teacherId });
    }

    const reports = await queryBuilder.orderBy('report.createdAt', 'DESC').getMany();

    return reports.map((report) => ({
      id: report.id,
      submissionId: report.submissionId,
      studentName: report.student.fullName,
      studentId: report.studentId,
      testTitle: report.test.title,
      testCode: report.test.testCode,
      testType: report.test.testType,
      status: report.status,
      teacherName: report.test.creator?.fullName || 'N/A',
      teacherId: report.test.creatorId,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      totalScore: report.submission?.totalScore || 0,
      pdfUrl: report.pdfUrl,
    }));
  }

  /**
   * Approve report
   * @param reportId - ID of the report
   * @param teacherId - ID of the teacher approving
   * @param comment - Optional comment from teacher
   * @returns Updated report card
   */
  async approveReport(reportId: string, teacherId: string, comment?: string): Promise<ReportCard> {
    const report = await this.reportCardRepository.findOne({
      where: { id: reportId },
      relations: ['test', 'test.creator'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== ReportStatus.PENDING_REVIEW) {
      throw new BadRequestException('Report is not pending review');
    }

    // Update report
    report.status = ReportStatus.APPROVED;
    report.reviewedById = teacherId;
    report.reviewedAt = new Date();
    report.reviewComment = comment || null;

    await this.reportCardRepository.save(report);

    return report;
  }

  /**
   * Publish report (make visible to student)
   * @param reportId - ID of the report
   * @param teacherId - ID of the teacher publishing
   * @returns Updated report card
   */
  async publishReport(reportId: string, teacherId: string): Promise<ReportCard> {
    const report = await this.reportCardRepository.findOne({
      where: { id: reportId },
      relations: ['test', 'test.creator'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== ReportStatus.APPROVED) {
      throw new BadRequestException('Report must be approved before publishing');
    }

    // Publish
    report.status = ReportStatus.PUBLISHED;
    report.publishedAt = new Date();
    report.isPublished = true;

    await this.reportCardRepository.save(report);

    return report;
  }

  /**
   * Reject report
   * @param reportId - ID of the report
   * @param teacherId - ID of the teacher rejecting
   * @param reason - Reason for rejection
   * @returns Updated report card
   */
  async rejectReport(reportId: string, teacherId: string, reason: string): Promise<ReportCard> {
    const report = await this.reportCardRepository.findOne({
      where: { id: reportId },
      relations: ['test', 'test.creator'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.test.creatorId !== teacherId) {
      throw new ForbiddenException('You can only reject reports for your own tests');
    }

    if (report.status !== ReportStatus.PENDING_REVIEW) {
      throw new BadRequestException('Report is not pending review');
    }

    report.status = ReportStatus.REJECTED;
    report.reviewedById = teacherId;
    report.reviewedAt = new Date();
    report.reviewComment = reason;

    await this.reportCardRepository.save(report);

    return report;
  }

  /**
   * Get published reports for student
   * @param studentId - ID of the student
   * @returns Array of published reports
   */
  async getPublishedReportsForStudent(studentId: string) {
    return await this.reportCardRepository.find({
      where: {
        studentId,
        status: ReportStatus.PUBLISHED,
      },
      relations: ['test', 'submission'],
      order: { publishedAt: 'DESC' },
    });
  }

  /**
   * Map difficulty number to string
   */
  private mapDifficultyToString(difficulty: number): string {
    const difficultyMap: Record<number, string> = {
      1: 'LOW',
      2: 'MEDIUM',
      3: 'HIGH',
      4: 'VERY_HIGH',
    };
    return difficultyMap[difficulty] || 'MEDIUM';
  }

  /**
   * Get English unit name from Korean unit name
   * Tries to match Korean name in UNIT_NAMES mapping
   */
  private getEnglishUnitName(koreanName: string): string {
    // Remove leading numbers and dots (e.g., "1. " or "1. 1.")
    const cleanKoreanName = koreanName.replace(/^\d+\.\s*\d*\.?\s*/, '').trim();

    // Search through UNIT_NAMES to find matching Korean name
    for (const [unitId, unitInfo] of Object.entries(UNIT_NAMES)) {
      const cleanUnitKorean = unitInfo.korean.replace(/^\d+\.\s*/, '').trim();
      if (cleanUnitKorean === cleanKoreanName || unitInfo.korean.includes(cleanKoreanName)) {
        // Return English name without the leading number
        return unitInfo.english.replace(/^\d+\.\s*/, '').trim();
      }
    }

    // If no match found, return the original name (fallback)
    return cleanKoreanName;
  }

  /**
   * Build question breakdown for Achievement report
   */
  private buildQuestionBreakdown(submission: StudentSubmission) {
    if (!submission.answers || submission.answers.length === 0) {
      return [];
    }

    return submission.answers
      .filter((answer) => answer.question)
      .map((answer) => {
        const difficultyNum = answer.question.difficulty || 2; // Default to 2 (Medium)
        // Determine question type based on answerType
        const questionType =
          answer.question.answerType === 'MULTIPLE_CHOICE' ? 'Multiple choice' : 'Subjective';
        return {
          questionNumber: answer.question.questionNumber,
          unitName: answer.question.unitName || 'Unknown',
          difficulty: this.mapDifficultyToString(difficultyNum),
          isCorrect: answer.isCorrect || false,
          scoreEarned: answer.scoreEarned || 0,
          maxScore: answer.question.score,
          correctAnswer: answer.question.correctAnswer || '',
          enteredValue: answer.studentAnswer || '',
          questionType,
        };
      })
      .sort((a, b) => a.questionNumber - b.questionNumber);
  }

  /**
   * Calculate difficulty breakdown for a section
   */
  private calculateDifficultyBreakdown(
    sectionNumber: number,
    questions: any[],
    answers: any[],
  ): import('./interfaces/report-data.interface').DifficultyBreakdown[] {
    // Group questions and answers by difficulty
    const byDifficulty: Record<number, { questions: any[]; answers: any[] }> = {
      1: { questions: [], answers: [] },
      2: { questions: [], answers: [] },
      3: { questions: [], answers: [] },
      4: { questions: [], answers: [] },
    };

    // Filter questions for this section
    const sectionQuestions = questions.filter((q) => q.sectionNumber === sectionNumber);

    for (const question of sectionQuestions) {
      // Handle difficulty: could be number (1-4) or enum (HIGH/MEDIUM/LOW)
      let difficultyNum: number;
      if (typeof question.difficulty === 'number') {
        difficultyNum = question.difficulty;
      } else if (typeof question.difficulty === 'string') {
        // Map enum to number: LOW=1, MEDIUM=2, HIGH=3, (4 would need to be added)
        const difficultyMap: Record<string, number> = {
          LOW: 1,
          MEDIUM: 2,
          HIGH: 3,
        };
        difficultyNum = difficultyMap[question.difficulty] || 1;
      } else {
        difficultyNum = 1; // Default
      }

      if (difficultyNum >= 1 && difficultyNum <= 4) {
        if (!byDifficulty[difficultyNum]) {
          byDifficulty[difficultyNum] = { questions: [], answers: [] };
        }
        byDifficulty[difficultyNum].questions.push(question);

        // Find corresponding answer
        const answer = answers.find((a) => a.questionId === question.id);
        if (answer) {
          byDifficulty[difficultyNum].answers.push(answer);
        }
      }
    }

    // Calculate scores for each difficulty level
    return [1, 2, 3, 4].map((difficulty) => {
      const data = byDifficulty[difficulty];

      if (!data || data.questions.length === 0) {
        return {
          difficulty: difficulty as 1 | 2 | 3 | 4,
          fullMarks: 0,
          rawScore: 0,
          standardScore: 0,
        };
      }

      const fullMarks = data.questions.reduce((sum, q) => sum + (q.score || 0), 0);
      const rawScore = data.answers.reduce((sum, a) => sum + (a.scoreEarned || 0), 0);
      const standardScore = fullMarks > 0 ? (rawScore / fullMarks) * 100 : 0;

      return {
        difficulty: difficulty as 1 | 2 | 3 | 4,
        fullMarks,
        rawScore,
        standardScore: Math.round(standardScore * 10) / 10, // Round to 1 decimal
      };
    });
  }

  /**
   * Build A-DTM sections data
   */
  private async buildAdtmSections(
    adtmData: AdtmSubmission,
    submission: StudentSubmission,
  ): Promise<AdtmReportData['sections']> {
    const sectionNames = [
      'Calculation Ability',
      'Conceptual Understanding',
      'Conceptual Application',
      'Reasoning Ability',
      'Problem-Solving Ability',
    ];

    // Get questions and answers for difficulty breakdown
    const questions = submission.test?.questions || [];
    const answers = submission.answers || [];

    // Helper function to calculate maxScore from questions for a section
    const calculateSectionMaxScore = (sectionNumber: number): number => {
      const sectionQuestions = questions.filter((q) => q.sectionNumber === sectionNumber);
      return sectionQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
    };

    // Calculate difficulty breakdown for Section 1
    const section1DifficultyBreakdown = this.calculateDifficultyBreakdown(1, questions, answers);

    const section1MaxScore = calculateSectionMaxScore(1);

    const sections: AdtmReportData['sections'] = [
      {
        number: 1,
        name: sectionNames[0],
        standardScore: adtmData.section1StandardScore || 0,
        rawScore: adtmData.section1RawScore || 0,
        maxScore: section1MaxScore || 100, // Calculate from actual questions
        correctCount: adtmData.section1CorrectCount || 0,
        mistakeCount: adtmData.section1MistakeCount || 0,
        unsolvedCount: adtmData.section1UnsolvedCount || 0,
        difficultyBreakdown: section1DifficultyBreakdown,
      },
    ];

    // Sections 2-5 with unit scores
    const sectionData = [
      {
        number: 2,
        unitScores: adtmData.section2UnitScores,
        rawScore: adtmData.section2RawScore || 0,
        standardScore: adtmData.section2StandardScore || 0,
        maxScore: calculateSectionMaxScore(2) || 100, // Calculate from actual questions
        hasUnits: true,
      },
      {
        number: 3,
        unitScores: adtmData.section3UnitScores,
        rawScore: adtmData.section3RawScore || 0,
        standardScore: adtmData.section3StandardScore || 0,
        maxScore: calculateSectionMaxScore(3) || 100, // Calculate from actual questions
        hasUnits: true,
      },
      {
        number: 4,
        unitScores: adtmData.section4UnitScores,
        rawScore: adtmData.section4RawScore || 0,
        standardScore: adtmData.section4StandardScore || 0,
        maxScore: calculateSectionMaxScore(4) || 40, // Calculate from actual questions
        hasUnits: false,
      },
      {
        number: 5,
        unitScores: adtmData.section5UnitScores,
        rawScore: adtmData.section5RawScore || 0,
        standardScore: adtmData.section5StandardScore || 0,
        maxScore: calculateSectionMaxScore(5) || 40, // Calculate from actual questions
        hasUnits: false,
      },
    ];

    for (const data of sectionData) {
      // Only process unitScores for sections 2-3 (which have units)
      const unitScores =
        data.hasUnits && data.unitScores
          ? Object.entries(data.unitScores).map(([unitName, scores]) => ({
              unitName,
              rawScore: scores.rawScore,
              maxScore: scores.maxScore,
              standardScore: scores.maxScore > 0 ? (scores.rawScore / scores.maxScore) * 100 : 0,
            }))
          : undefined; // Sections 4-5 don't have units

      // Calculate difficulty breakdown for sections 2 and 3 only
      let difficultyBreakdown:
        | import('./interfaces/report-data.interface').DifficultyBreakdown[]
        | undefined;
      if (data.number === 2 || data.number === 3) {
        difficultyBreakdown = this.calculateDifficultyBreakdown(data.number, questions, answers);
      }

      sections.push({
        number: data.number,
        name: sectionNames[data.number - 1],
        standardScore: data.standardScore,
        rawScore: data.rawScore,
        maxScore: data.maxScore,
        unitScores,
        difficultyBreakdown,
      });
    }

    return sections;
  }

  /**
   * Generate recommendations based on A-DTM scores
   */
  private generateRecommendations(
    adtmData: AdtmSubmission,
    sections: AdtmReportData['sections'],
  ): string[] {
    const recommendations: string[] = [];

    // Overall score analysis
    const overallScore = adtmData.overallStandardScore || 0;
    if (overallScore >= 90) {
      recommendations.push(
        'Excellent overall performance! Continue maintaining this high level of achievement.',
      );
    } else if (overallScore >= 80) {
      recommendations.push(
        'Good overall performance. Focus on strengthening areas with lower scores.',
      );
    } else if (overallScore >= 70) {
      recommendations.push(
        'Satisfactory performance. Identify and practice weak areas to improve.',
      );
    } else {
      recommendations.push(
        'Needs improvement. Consider additional practice and review of fundamental concepts.',
      );
    }

    // Section-specific recommendations
    for (const section of sections) {
      if (section.standardScore < 70) {
        recommendations.push(`${section.name} needs attention. Focus on practicing this area.`);
      } else if (section.standardScore >= 90) {
        recommendations.push(`Strong performance in ${section.name}. Keep up the excellent work!`);
      }
    }

    // Unit balance analysis (for sections 2-5)
    const allUnits = new Map<string, number[]>();
    for (const section of sections) {
      if (section.unitScores) {
        for (const unit of section.unitScores) {
          if (!allUnits.has(unit.unitName)) {
            allUnits.set(unit.unitName, []);
          }
          allUnits.get(unit.unitName)!.push(unit.standardScore);
        }
      }
    }

    // Find units with consistently low scores
    for (const [unitName, scores] of allUnits.entries()) {
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      if (avgScore < 70) {
        recommendations.push(`Focus on strengthening ${unitName} across all sections.`);
      }
    }

    // Section 1 specific recommendations
    const section1 = sections[0];
    if (section1.unsolvedCount && section1.unsolvedCount > 5) {
      recommendations.push(
        'High number of unsolved questions. Practice time management and problem-solving strategies.',
      );
    }
    if (section1.mistakeCount && section1.mistakeCount > 5) {
      recommendations.push('Review calculation methods and double-check work to reduce mistakes.');
    }

    return recommendations;
  }

  /**
   * Generate unit bar chart data
   */
  private generateUnitBarChart(
    unitScores: Array<{ unitName: string; standardScore: number }>,
  ): ChartData {
    return {
      type: 'bar',
      labels: unitScores.map((u) => u.unitName),
      datasets: [
        {
          label: 'Score (%)',
          data: unitScores.map((u) => u.standardScore),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
        },
      ],
    };
  }

  /**
   * Generate difficulty pie chart data
   */
  private generateDifficultyPieChart(
    difficultyScores: Array<{ difficulty: string; standardScore: number }>,
  ): ChartData {
    const colors = {
      HIGH: 'rgba(255, 99, 132, 0.6)',
      MEDIUM: 'rgba(255, 206, 86, 0.6)',
      LOW: 'rgba(75, 192, 192, 0.6)',
    };

    return {
      type: 'pie',
      labels: difficultyScores.map((d) => d.difficulty),
      datasets: [
        {
          label: 'Score (%)',
          data: difficultyScores.map((d) => d.standardScore),
          backgroundColor: difficultyScores.map(
            (d) => colors[d.difficulty as keyof typeof colors] || 'rgba(153, 102, 255, 0.6)',
          ),
        },
      ],
    };
  }

  /**
   * Generate section bar chart data for A-DTM
   */
  private generateSectionBarChart(sections: AdtmReportData['sections']): ChartData {
    return {
      type: 'bar',
      labels: sections.map((s) => s.name),
      datasets: [
        {
          label: 'Standard Score (%)',
          data: sections.map((s) => s.standardScore),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
        },
      ],
    };
  }

  /**
   * Generate unit radar chart data for A-DTM
   */
  private generateUnitRadarChart(sections: AdtmReportData['sections']): ChartData {
    // Collect all unique units across sections 2-5
    const unitMap = new Map<string, number[]>();

    for (const section of sections) {
      if (section.unitScores) {
        for (const unit of section.unitScores) {
          if (!unitMap.has(unit.unitName)) {
            unitMap.set(unit.unitName, []);
          }
          unitMap.get(unit.unitName)!.push(unit.standardScore);
        }
      }
    }

    // Calculate average score per unit
    const unitAverages: Array<{ unitName: string; avgScore: number }> = [];
    for (const [unitName, scores] of unitMap.entries()) {
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      unitAverages.push({ unitName, avgScore });
    }

    // Sort by unit name for consistency
    unitAverages.sort((a, b) => a.unitName.localeCompare(b.unitName));

    return {
      type: 'radar',
      labels: unitAverages.map((u) => u.unitName),
      datasets: [
        {
          label: 'Average Score (%)',
          data: unitAverages.map((u) => u.avgScore),
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderColor: 'rgba(153, 102, 255, 1)',
        },
      ],
    };
  }

  /**
   * Generate Area-Difficulty data for "Score by Area - Difficulty" chart
   * Combines Section 1 difficulty breakdown (계산), Section 2 units (개념), and Section 3 units (적용)
   */
  private generateAreaDifficultyData(
    sections: AdtmReportData['sections'],
  ): import('./interfaces/report-data.interface').AreaDifficultyData[] {
    const areaData: Array<{
      area: string;
      적용: number;
      개념: number;
      계산: number;
    }> = [];

    // Section 1 (Calculation Ability) - difficulty breakdown for "계산"
    const section1 = sections.find((s) => s.number === 1);
    if (section1?.difficultyBreakdown) {
      section1.difficultyBreakdown.forEach((diff, index) => {
        // Areas 1-4 from Section 1 difficulty breakdown
        areaData.push({
          area: `${index + 1}`,
          적용: 0,
          개념: 0,
          계산: diff.standardScore,
        });
      });
    }

    // Section 2 (Conceptual Understanding) - units for "개념"
    const section2 = sections.find((s) => s.number === 2);
    if (section2?.unitScores) {
      section2.unitScores.forEach((unit, index) => {
        const areaIndex = areaData.length;
        if (areaIndex < 7) {
          // Add or update area with 개념 score
          if (areaData[areaIndex]) {
            areaData[areaIndex].개념 = unit.standardScore;
          } else {
            areaData.push({
              area: `${areaIndex + 1}`,
              적용: 0,
              개념: unit.standardScore,
              계산: 0,
            });
          }
        }
      });
    }

    // Section 3 (Conceptual Application) - units for "적용"
    const section3 = sections.find((s) => s.number === 3);
    if (section3?.unitScores) {
      section3.unitScores.forEach((unit, index) => {
        const areaIndex = areaData.length;
        if (areaIndex < 7) {
          // Add or update area with 적용 score
          if (areaData[areaIndex]) {
            areaData[areaIndex].적용 = unit.standardScore;
          } else {
            areaData.push({
              area: `${areaIndex + 1}`,
              적용: unit.standardScore,
              개념: 0,
              계산: 0,
            });
          }
        }
      });
    }

    // Ensure we have exactly 7 areas (pad with empty if needed)
    while (areaData.length < 7) {
      areaData.push({
        area: `${areaData.length + 1}`,
        적용: 0,
        개념: 0,
        계산: 0,
      });
    }

    // Limit to 7 areas
    return areaData.slice(0, 7).map((data) => ({
      area: data.area,
      적용: data.적용,
      개념: data.개념,
      계산: data.계산,
    }));
  }

  /**
   * Save report card to database
   */
  private async saveReportCard(
    submissionId: string,
    testType: 'ACHIEVEMENT' | 'ADTM',
    reportData: AchievementReportData | AdtmReportData,
  ): Promise<void> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['student', 'test'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    let reportCard = await this.reportCardRepository.findOne({
      where: { submissionId },
    });

    // Transform report data to match ReportCard schema
    const reportCardData: ReportCard['reportData'] = {
      studentInfo: {
        name: reportData.student.name,
        grade: reportData.student.grade,
        school: reportData.student.school || '',
      },
      testInfo: {
        testCode:
          testType === 'ACHIEVEMENT'
            ? (reportData as AchievementReportData).test.code
            : (reportData as AdtmReportData).test.testCode || '',
        testType,
        title:
          testType === 'ACHIEVEMENT'
            ? (reportData as AchievementReportData).test.title
            : `A-DTM Level ${(reportData as AdtmReportData).test.level}`,
        date: reportData.test.testDate.toISOString(),
      },
      scores: {
        totalScore:
          testType === 'ACHIEVEMENT' ? (reportData as AchievementReportData).scores.totalRaw : 0,
        standardScore:
          testType === 'ACHIEVEMENT'
            ? (reportData as AchievementReportData).scores.standardScore
            : (reportData as AdtmReportData).overallScore,
      },
    };

    if (testType === 'ACHIEVEMENT') {
      const achievementData = reportData as AchievementReportData;
      reportCardData.sectionPerformance = achievementData.unitScores.map((unit) => ({
        sectionNumber: 0,
        sectionName: unit.unitName,
        score: unit.rawScore,
        maxScore: unit.maxScore,
        standardScore: unit.standardScore,
      }));
    } else {
      const adtmData = reportData as AdtmReportData;
      reportCardData.sectionPerformance = adtmData.sections.map((section) => ({
        sectionNumber: section.number,
        sectionName: section.name,
        score: section.rawScore,
        maxScore: section.maxScore,
        standardScore: section.standardScore,
        units: section.unitScores?.map((unit) => ({
          unitName: unit.unitName,
          score: unit.rawScore,
          maxScore: unit.maxScore,
        })),
      }));

      reportCardData.adtmData = {
        recommendedLevel: adtmData.test.level,
        concentrationLevel: submission.adtmData?.concentrationLevel || 1,
        section1Analysis: {
          correct: adtmData.sections[0].correctCount || 0,
          mistake: adtmData.sections[0].mistakeCount || 0,
          unsolved: adtmData.sections[0].unsolvedCount || 0,
        },
      };

      reportCardData.analysis = {
        strengths: adtmData.recommendations.filter(
          (r) => r.includes('Excellent') || r.includes('Strong'),
        ),
        weaknesses: adtmData.recommendations.filter(
          (r) => r.includes('needs') || r.includes('improvement'),
        ),
        recommendations: adtmData.recommendations,
      };
    }

    if (!reportCard) {
      reportCard = this.reportCardRepository.create({
        submissionId,
        studentId: submission.studentId,
        testId: submission.testId,
        reportData: reportCardData,
        status: ReportStatus.PENDING_REVIEW,
      });
    } else {
      reportCard.reportData = reportCardData;
      // If report is being regenerated, preserve the current status
      // Don't reset status if it's already APPROVED, PUBLISHED, or REJECTED
      // Only set to PENDING_REVIEW if it's a new report or status is null/undefined
      if (
        !reportCard.status ||
        reportCard.status === ReportStatus.PENDING_REVIEW ||
        reportCard.status === ReportStatus.REJECTED
      ) {
        // Only reset to PENDING_REVIEW if status is null, PENDING_REVIEW, or REJECTED
        // This allows regenerating rejected reports
        reportCard.status = ReportStatus.PENDING_REVIEW;
      }
      // If status is APPROVED or PUBLISHED, keep the current status (don't reset)
    }

    await this.reportCardRepository.save(reportCard);
  }
}
