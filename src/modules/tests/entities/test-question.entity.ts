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
import { Test } from './test.entity';
import { SubmissionAnswer } from './submission-answer.entity';

@Entity('test_questions')
export class TestQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'test_id' })
  @Index()
  testId: string;

  @ManyToOne(() => Test, (test) => test.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @Column({ name: 'question_number', type: 'int' })
  questionNumber: number;

  @Column({ type: 'int', comment: 'Section number (1-5 for A-DTM)' })
  section: number;

  @Column({ name: 'unit_name', nullable: true })
  unitName: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'correct_answer' })
  correctAnswer: string;

  @Column({ type: 'int' })
  score: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  difficulty: number; // 1-4: 1=Easy, 2=Medium, 3=Hard, 4=Very Hard

  @OneToMany(() => SubmissionAnswer, (answer) => answer.question)
  answers: SubmissionAnswer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
