import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { SubmissionStatus } from '../../../../frontend/src/shared/types/enum';
import { Test } from './test.entity';
import { User } from './user.entity';
import { StudentAssignment } from './student-assignment.entity';
import { StudentAnswer } from './student-answer.entity';
import { AdtmSubmission } from './adtm-submission.entity';
import { ReportCard } from './report-card.entity';

@Entity('student_submissions')
export class StudentSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id' })
  @Index()
  assignmentId: string;

  @Column({ name: 'student_id' })
  @Index()
  studentId: string;

  @Column({ name: 'test_id' })
  @Index()
  testId: string;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'total_score', type: 'float', nullable: true })
  totalScore: number;

  @Column({ name: 'standard_score', type: 'float', nullable: true })
  standardScore: number;

  @Column({ name: 'graded_at', type: 'timestamp', nullable: true })
  gradedAt: Date;

  @Column({ name: 'graded_by_id', nullable: true })
  gradedById: string;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.NOT_STARTED,
  })
  @Index()
  status: SubmissionStatus;

  // Relations
  @ManyToOne(() => StudentAssignment, (assignment) => assignment.submissions)
  @JoinColumn({ name: 'assignment_id' })
  assignment: StudentAssignment;

  @ManyToOne(() => User, (user) => user.submissions)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Test, (test) => test.submissions)
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @ManyToOne(() => User, (user) => user.gradedSubmissions)
  @JoinColumn({ name: 'graded_by_id' })
  gradedBy: User;

  @OneToMany(() => StudentAnswer, (answer) => answer.submission, { cascade: true })
  answers: StudentAnswer[];

  @OneToOne(() => AdtmSubmission, (adtmData) => adtmData.submission, { cascade: true })
  adtmData: AdtmSubmission;

  @OneToOne(() => ReportCard, (reportCard) => reportCard.submission, { cascade: true })
  reportCard: ReportCard;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
