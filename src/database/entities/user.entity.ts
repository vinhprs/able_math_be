import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserRole } from '@shared/types/enum';
import { Test } from './test.entity';
import { StudentAssignment } from './student-assignment.entity';
import { StudentSubmission } from './student-submission.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 30 })
  @Index()
  username: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  @Index()
  role: UserRole;

  @Column({ nullable: true })
  school: string;

  @Column({ nullable: true })
  grade: string;

  @Column({ name: 'parent_name', nullable: true })
  parentName: string;

  @Column({ name: 'parent_contact', nullable: true })
  parentContact: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Relations
  @OneToMany(() => Test, (test) => test.creator)
  createdTests: Test[];

  @OneToMany(() => StudentAssignment, (assignment) => assignment.student)
  assignedTests: StudentAssignment[];

  @OneToMany(() => StudentAssignment, (assignment) => assignment.assignedBy)
  assignmentsCreated: StudentAssignment[];

  @OneToMany(() => StudentSubmission, (submission) => submission.student)
  submissions: StudentSubmission[];

  @OneToMany(() => StudentSubmission, (submission) => submission.gradedBy)
  gradedSubmissions: StudentSubmission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
