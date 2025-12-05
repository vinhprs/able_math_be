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
import { AnswerType } from '@shared/types/enum';
import { Test } from './test.entity';
import { StudentAnswer } from './student-answer.entity';
import { Unit } from './unit.entity';

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

  @Column({ name: 'unit_id', nullable: true })
  unitId: string;

  @Column({ name: 'unit_name', nullable: true })
  unitName: string; // Keep for backward compatibility

  @Column({ name: 'question_text', type: 'text', nullable: true })
  questionText: string;

  @Column({
    name: 'answer_type',
    type: 'enum',
    enum: AnswerType,
    default: AnswerType.MULTIPLE_CHOICE,
  })
  answerType: AnswerType;

  @Column({ name: 'question_image', nullable: true })
  questionImage: string;

  @Column({ name: 'correct_answer' })
  correctAnswer: string;

  @Column({ type: 'int' })
  score: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  difficulty: number; // 1-4: 1=Easy, 2=Medium, 3=Hard, 4=Very Hard

  // Relations
  @ManyToOne(() => Test, (test) => test.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @ManyToOne(() => Unit, (unit) => unit.questions)
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @OneToMany(() => StudentAnswer, (answer) => answer.question)
  studentAnswers: StudentAnswer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
