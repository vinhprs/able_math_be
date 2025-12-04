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
import { User } from './user.entity';
import { StudentSubmission } from './student-submission.entity';
import { Class } from './class.entity';

export enum AssignmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
}

@Entity('student_assignments')
export class StudentAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'test_id' })
  @Index()
  testId: string;

  @Column({ name: 'student_id' })
  @Index()
  studentId: string;

  @Column({ name: 'assigned_by_id' })
  assignedById: string;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.PENDING,
  })
  @Index()
  status: AssignmentStatus;

  @Column({ name: 'class_id', nullable: true })
  @Index()
  classId: string | null;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  // Relations
  @ManyToOne(() => Test, (test) => test.assignments)
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @ManyToOne(() => User, (user) => user.assignedTests)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => User, (user) => user.assignmentsCreated)
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: User;

  @ManyToOne(() => Class, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class: Class | null;

  @OneToMany(() => StudentSubmission, (submission) => submission.assignment)
  submissions: StudentSubmission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
