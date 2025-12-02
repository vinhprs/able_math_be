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
import { DifficultyLevel } from '@shared/types/enum';
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
    type: 'enum',
    enum: DifficultyLevel,
    nullable: true,
  })
  difficulty: DifficultyLevel;

  @OneToMany(() => SubmissionAnswer, (answer) => answer.question)
  answers: SubmissionAnswer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
