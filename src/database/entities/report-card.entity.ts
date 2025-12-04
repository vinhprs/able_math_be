import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StudentSubmission } from './student-submission.entity';
import { User } from './user.entity';
import { Test } from './test.entity';

/**
 * Report Status Enum
 * Tracks the approval and publishing status of reports
 */
export enum ReportStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

/**
 * Report Card Entity
 * Stores comprehensive test reports including analysis and PDF generation
 */
@Entity('report_cards')
export class ReportCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'submission_id', unique: true })
  @Index()
  submissionId: string;

  @Column({ name: 'student_id' })
  @Index()
  studentId: string;

  @Column({ name: 'test_id' })
  @Index()
  testId: string;

  @Column({ name: 'report_data', type: 'jsonb' })
  reportData: {
    // Student information
    studentInfo: {
      name: string;
      grade: string;
      school: string;
    };

    // Test information
    testInfo: {
      testCode: string;
      testType: string;
      title: string;
      date: string;
    };

    // Scores
    scores: {
      totalScore: number;
      standardScore: number;
      percentile?: number;
    };

    // Performance by section/unit
    sectionPerformance?: Array<{
      sectionNumber: number;
      sectionName: string;
      score: number;
      maxScore: number;
      standardScore: number;
      units?: Array<{
        unitName: string;
        score: number;
        maxScore: number;
      }>;
    }>;

    // Strengths and weaknesses
    analysis?: {
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    };

    // A-DTM specific
    adtmData?: {
      recommendedLevel: number;
      concentrationLevel: number;
      section1Analysis: {
        correct: number;
        mistake: number;
        unsolved: number;
      };
    };
  };

  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl: string;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING_REVIEW,
  })
  @Index()
  status: ReportStatus;

  @Column({ name: 'reviewed_by_id', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewComment: string | null;

  // Relations
  @OneToOne(() => StudentSubmission, (submission) => submission.reportCard, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission: StudentSubmission;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Test)
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
