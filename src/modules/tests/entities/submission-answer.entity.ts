import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TestSubmission } from './test-submission.entity';
import { TestQuestion } from './test-question.entity';

@Entity('submission_answers')
export class SubmissionAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'submission_id' })
  @Index()
  submissionId: string;

  @ManyToOne(() => TestSubmission, (submission) => submission.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission: TestSubmission;

  @Column({ name: 'question_id' })
  @Index()
  questionId: string;

  @ManyToOne(() => TestQuestion, (question) => question.answers)
  @JoinColumn({ name: 'question_id' })
  question: TestQuestion;

  @Column({ name: 'student_answer', type: 'text', nullable: true })
  studentAnswer: string;

  @Column({ name: 'is_correct', nullable: true })
  isCorrect: boolean;

  @Column({ name: 'score_earned', type: 'float', nullable: true })
  scoreEarned: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

