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
import { AdtmAnswerType } from '../../../../frontend/src/shared/types/enum';
import { StudentSubmission } from './student-submission.entity';
import { TestQuestion } from './test-question.entity';

@Entity('student_answers')
export class StudentAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'submission_id' })
  @Index()
  submissionId: string;

  @Column({ name: 'question_id' })
  @Index()
  questionId: string;

  @Column({ name: 'student_answer', type: 'text', nullable: true })
  studentAnswer: string;

  @Column({ name: 'score_earned', type: 'float', nullable: true })
  scoreEarned: number;

  @Column({ name: 'is_correct', nullable: true })
  isCorrect: boolean;

  @Column({
    name: 'answer_type',
    type: 'enum',
    enum: AdtmAnswerType,
    nullable: true,
    comment: 'For A-DTM Section 1: CORRECT, MISTAKE, or UNSOLVED',
  })
  answerType: AdtmAnswerType;

  // Relations
  @ManyToOne(() => StudentSubmission, (submission) => submission.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission: StudentSubmission;

  @ManyToOne(() => TestQuestion, (question) => question.studentAnswers)
  @JoinColumn({ name: 'question_id' })
  question: TestQuestion;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
