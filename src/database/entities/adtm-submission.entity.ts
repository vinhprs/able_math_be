import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StudentSubmission } from './student-submission.entity';

/**
 * A-DTM (Entrance Level Diagnostic Test) specific data
 * Stores detailed grading information for A-DTM tests
 */
@Entity('adtm_submissions')
export class AdtmSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'submission_id', unique: true })
  @Index()
  submissionId: string;

  // Pre-test information
  @Column({ name: 'test_level', type: 'int' })
  testLevel: number;

  @Column({ name: 'concentration_level', type: 'int', nullable: true })
  concentrationLevel: number;

  @Column({ name: 'current_mood', nullable: true })
  currentMood: string;

  @Column({ name: 'expected_score', type: 'float', nullable: true })
  expectedScore: number;

  // Section 1 (20 questions) - Special counting format
  @Column({ name: 'section1_correct_count', type: 'int', default: 0 })
  section1CorrectCount: number;

  @Column({ name: 'section1_mistake_count', type: 'int', default: 0 })
  section1MistakeCount: number;

  @Column({ name: 'section1_unsolved_count', type: 'int', default: 0 })
  section1UnsolvedCount: number;

  @Column({ name: 'section1_raw_score', type: 'float', default: 0 })
  section1RawScore: number;

  @Column({ name: 'section1_standard_score', type: 'float', default: 0 })
  section1StandardScore: number;

  // Section 2 (15 questions) - By unit
  @Column({ name: 'section2_unit_scores', type: 'jsonb', nullable: true })
  section2UnitScores: Record<string, { rawScore: number; maxScore: number }>;

  @Column({ name: 'section2_raw_score', type: 'float', default: 0 })
  section2RawScore: number;

  @Column({ name: 'section2_standard_score', type: 'float', default: 0 })
  section2StandardScore: number;

  // Section 3 (15 questions) - By unit
  @Column({ name: 'section3_unit_scores', type: 'jsonb', nullable: true })
  section3UnitScores: Record<string, { rawScore: number; maxScore: number }>;

  @Column({ name: 'section3_raw_score', type: 'float', default: 0 })
  section3RawScore: number;

  @Column({ name: 'section3_standard_score', type: 'float', default: 0 })
  section3StandardScore: number;

  // Section 4 (15 questions) - By unit
  @Column({ name: 'section4_unit_scores', type: 'jsonb', nullable: true })
  section4UnitScores: Record<string, { rawScore: number; maxScore: number }>;

  @Column({ name: 'section4_raw_score', type: 'float', default: 0 })
  section4RawScore: number;

  @Column({ name: 'section4_standard_score', type: 'float', default: 0 })
  section4StandardScore: number;

  // Section 5 (15 questions) - By unit
  @Column({ name: 'section5_unit_scores', type: 'jsonb', nullable: true })
  section5UnitScores: Record<string, { rawScore: number; maxScore: number }>;

  @Column({ name: 'section5_raw_score', type: 'float', default: 0 })
  section5RawScore: number;

  @Column({ name: 'section5_standard_score', type: 'float', default: 0 })
  section5StandardScore: number;

  // Overall Score (0-100 scale)
  @Column({ name: 'overall_standard_score', type: 'float', nullable: true })
  overallStandardScore: number;

  // Relations
  @OneToOne(() => StudentSubmission, (submission) => submission.adtmData, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission: StudentSubmission;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
