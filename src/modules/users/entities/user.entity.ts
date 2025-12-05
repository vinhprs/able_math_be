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
import { Test } from '../../tests/entities/test.entity';
import { TestSubmission } from '../../tests/entities/test-submission.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 30 })
  @Index()
  username: string;

  @Column({ unique: true })
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

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Test, (test) => test.creator)
  createdTests: Test[];

  @OneToMany(() => TestSubmission, (submission) => submission.student)
  submissions: TestSubmission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
