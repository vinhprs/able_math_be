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
import { StudentAnswer } from './student-answer.entity';

@Entity('test_questions')
export class TestQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'test_id' })
  @Index()
  testId: string;

  @Column({ name: 'question_number', type: 'int' })
  questionNumber: number;

  @Column({ name: 'section_number', type: 'int' })
  sectionNumber: number;

  @Column({ name: 'unit_name', nullable: true })
  unitName: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ name: 'question_image', nullable: true })
  questionImage: string;

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

  // Relations
  @ManyToOne(() => Test, (test) => test.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @OneToMany(() => StudentAnswer, (answer) => answer.question)
  studentAnswers: StudentAnswer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

