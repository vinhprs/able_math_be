import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { TestType, TestStatus, GradeLevel, Term } from '@shared/types/enum';
import { User } from '../../../database/entities/user.entity';
import { TestQuestion } from './test-question.entity';
import { TestSubmission } from './test-submission.entity';
import { TestAssignment } from './test-assignment.entity';

@Entity('tests')
export class Test {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'test_code', unique: true })
  @Index()
  testCode: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'test_type',
    type: 'enum',
    enum: TestType,
  })
  @Index()
  testType: TestType;

  @Column({
    name: 'grade_level',
    type: 'enum',
    enum: GradeLevel,
  })
  gradeLevel: GradeLevel;

  @Column({
    type: 'enum',
    enum: Term,
  })
  term: Term;

  @Column({ type: 'int' })
  level: number;

  @Column({ length: 10 })
  version: string;

  @Column({
    type: 'enum',
    enum: TestStatus,
    default: TestStatus.DRAFT,
  })
  @Index()
  status: TestStatus;

  @Column({ name: 'total_score', type: 'int', default: 0 })
  totalScore: number;

  @Column({ type: 'int', comment: 'Duration in minutes' })
  duration: number;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @ManyToOne(() => User, (user) => user.createdTests)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @OneToMany(() => TestQuestion, (question) => question.test, { cascade: true })
  questions: TestQuestion[];

  @OneToMany(() => TestSubmission, (submission) => submission.test)
  submissions: TestSubmission[];

  @OneToMany(() => TestAssignment, (assignment) => assignment.test)
  assignments: TestAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

