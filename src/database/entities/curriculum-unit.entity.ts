import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('curriculum_units')
@Index(['curriculum', 'grade', 'semester', 'unitName'], { unique: true })
export class CurriculumUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, default: '2015개정' })
  curriculum: string; // ✅ Always "2015개정"

  @Column({ type: 'varchar', length: 10 })
  grade: string; // E4, E5, E6

  @Column({ type: 'varchar', length: 10 })
  semester: string; // "1", "2"

  @Column({ name: 'unit_name', type: 'varchar', length: 100 })
  unitName: string;

  @Column({ name: 'display_order', type: 'int', nullable: true })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
