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
import { TestType, TestStatus, ExamType } from '../../../../frontend/src/shared/types/enum';
import { User } from './user.entity';
import { TestQuestion } from './test-question.entity';
import { StudentAssignment } from './student-assignment.entity';
import { StudentSubmission } from './student-submission.entity';

@Entity('tests')
export class Test {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'test_code', unique: true })
  @Index()
  testCode: string;

  @Column({
    name: 'test_type',
    type: 'enum',
    enum: TestType,
  })
  @Index()
  testType: TestType;

  @Column()
  title: string;

  @Column()
  grade: string;

  @Column({ nullable: true })
  curriculum: string;

  @Column()
  semester: string;

  @Column()
  term: string;

  @Column({ type: 'int' })
  level: number;

  @Column({ name: 'total_score', type: 'int', default: 0 })
  totalScore: number;

  @Column({
    name: 'exam_type',
    type: 'enum',
    enum: ExamType,
    nullable: true,
  })
  examType: ExamType;

  @Column({ name: 'pdf_filename', nullable: true })
  pdfFilename: string;

  @Column({ type: 'int', nullable: true, default: 45 })
  duration: number;

  @Column({
    type: 'enum',
    enum: TestStatus,
    default: TestStatus.DRAFT,
  })
  @Index()
  status: TestStatus;

  @Column({ name: 'creator_id' })
  creatorId: string;

  // Relations
  @ManyToOne(() => User, (user) => user.createdTests)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @OneToMany(() => TestQuestion, (question) => question.test, { cascade: true })
  questions: TestQuestion[];

  @OneToMany(() => StudentAssignment, (assignment) => assignment.test)
  assignments: StudentAssignment[];

  @OneToMany(() => StudentSubmission, (submission) => submission.test)
  submissions: StudentSubmission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
