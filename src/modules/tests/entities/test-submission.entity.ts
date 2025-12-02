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
} from 'typeorm';
import { SubmissionStatus } from '@shared/types/enum';
import { Test } from './test.entity';
import { User } from '../../../database/entities/user.entity';
import { SubmissionAnswer } from './submission-answer.entity';

@Entity('test_submissions')
export class TestSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'test_id' })
  @Index()
  testId: string;

  @ManyToOne(() => Test, (test) => test.submissions)
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @Column({ name: 'student_id' })
  @Index()
  studentId: string;

  @ManyToOne(() => User, (user) => user.submissions)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.NOT_STARTED,
  })
  @Index()
  status: SubmissionStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'total_score', type: 'float', nullable: true })
  totalScore: number;

  @Column({ name: 'grading_data', type: 'jsonb', nullable: true })
  gradingData: any; // Store A-DTM grading details

  @OneToMany(() => SubmissionAnswer, (answer) => answer.submission, { cascade: true })
  answers: SubmissionAnswer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

