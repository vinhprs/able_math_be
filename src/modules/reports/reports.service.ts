import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
      },
      scores: {
        totalRaw: gradingResult.totalRawScore,
        totalMax: gradingResult.maxScore,
        standardScore: gradingResult.standardScore,
        correctCount: gradingResult.correctCount,
        incorrectCount: gradingResult.incorrectCount,
        accuracy: gradingResult.accuracy,
      },
      unitScores: gradingResult.unitScores,
      difficultyScores: gradingResult.difficultyScores,
      questionBreakdown: this.buildQuestionBreakdown(submission),
      charts: {
        unitBar: this.generateUnitBarChart(gradingResult.unitScores),
        difficultyPie: this.generateDifficultyPieChart(gradingResult.difficultyScores),
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

    // Get submission with all relations
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['student', 'test', 'adtmData'],
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

    // Build sections data
    const sections = this.buildAdtmSections(adtmData);

    // Generate recommendations
    const recommendations = this.generateRecommendations(adtmData, sections);

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
      charts: {
        sectionBar: this.generateSectionBarChart(sections),
        unitRadar: this.generateUnitRadarChart(sections),
      },
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
      relations: ['student', 'test'],
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
   * Build question breakdown for Achievement report
   */
  private buildQuestionBreakdown(submission: StudentSubmission) {
    if (!submission.answers || submission.answers.length === 0) {
      return [];
    }

    return submission.answers
      .filter((answer) => answer.question)
      .map((answer) => ({
        questionNumber: answer.question.questionNumber,
        unitName: answer.question.unitName || 'Unknown',
        difficulty: answer.question.difficulty || 'MEDIUM',
        isCorrect: answer.isCorrect || false,
        scoreEarned: answer.scoreEarned || 0,
        maxScore: answer.question.score,
      }))
      .sort((a, b) => a.questionNumber - b.questionNumber);
  }

  /**
   * Build A-DTM sections data
   */
  private buildAdtmSections(adtmData: AdtmSubmission): AdtmReportData['sections'] {
    const sectionNames = [
      'Calculation Ability',
      'Conceptual Understanding',
      'Problem Solving',
      'Application',
      'Analysis',
    ];

    const sections: AdtmReportData['sections'] = [
      {
        number: 1,
        name: sectionNames[0],
        standardScore: adtmData.section1StandardScore,
        rawScore: adtmData.section1RawScore,
        maxScore: 20, // Section 1 has 20 questions
        correctCount: adtmData.section1CorrectCount,
        mistakeCount: adtmData.section1MistakeCount,
        unsolvedCount: adtmData.section1UnsolvedCount,
      },
    ];

    // Sections 2-5 with unit scores
    const sectionData = [
      {
        number: 2,
        unitScores: adtmData.section2UnitScores,
        rawScore: adtmData.section2RawScore,
        standardScore: adtmData.section2StandardScore,
      },
      {
        number: 3,
        unitScores: adtmData.section3UnitScores,
        rawScore: adtmData.section3RawScore,
        standardScore: adtmData.section3StandardScore,
      },
      {
        number: 4,
        unitScores: adtmData.section4UnitScores,
        rawScore: adtmData.section4RawScore,
        standardScore: adtmData.section4StandardScore,
      },
      {
        number: 5,
        unitScores: adtmData.section5UnitScores,
        rawScore: adtmData.section5RawScore,
        standardScore: adtmData.section5StandardScore,
      },
    ];

    for (const data of sectionData) {
      const unitScores = data.unitScores
        ? Object.entries(data.unitScores).map(([unitName, scores]) => ({
            unitName,
            rawScore: scores.rawScore,
            maxScore: scores.maxScore,
            standardScore: scores.maxScore > 0 ? (scores.rawScore / scores.maxScore) * 100 : 0,
          }))
        : [];

      sections.push({
        number: data.number,
        name: sectionNames[data.number - 1],
        standardScore: data.standardScore,
        rawScore: data.rawScore,
        maxScore: 15, // Sections 2-5 have 15 questions each
        unitScores,
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
      // If report is being regenerated, reset status to pending review unless it's already published
      if (reportCard.status !== ReportStatus.PUBLISHED) {
        reportCard.status = ReportStatus.PENDING_REVIEW;
      }
    }

    await this.reportCardRepository.save(reportCard);
  }
}
