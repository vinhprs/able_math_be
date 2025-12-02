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
import { Test } from './test.entity';
import { User } from '../../../database/entities/user.entity';

@Entity('test_assignments')
export class TestAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'test_id' })
  @Index()
  testId: string;

  @ManyToOne(() => Test, (test) => test.assignments)
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @Column({ name: 'student_id' })
  @Index()
  studentId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'assigned_by' })
  assignedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: User;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

