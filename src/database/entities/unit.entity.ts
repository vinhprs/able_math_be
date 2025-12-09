import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { TestQuestion } from './test-question.entity';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'excel_id', type: 'int', unique: true })
  @Index()
  excelId: number; // For reference during Excel import

  @Column()
  name: string; // e.g., "1. 큰수", "2. 각도"

  @Column()
  grade: string; // e.g., "E4", "E5"

  @Column({ type: 'int' })
  order: number; // Display order

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TestQuestion, (question) => question.unit)
  questions: TestQuestion[];
}
