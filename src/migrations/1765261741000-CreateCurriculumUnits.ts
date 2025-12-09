import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCurriculumUnits1765261741000 implements MigrationInterface {
  name = 'CreateCurriculumUnits1765261741000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'curriculum_units',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'curriculum',
            type: 'varchar',
            length: '50',
            default: "'2015개정'",
          },
          {
            name: 'grade',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'semester',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'unit_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'display_order',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create unique index
    await queryRunner.createIndex(
      'curriculum_units',
      new TableIndex({
        name: 'IDX_curriculum_units_unique',
        columnNames: ['curriculum', 'grade', 'semester', 'unit_name'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('curriculum_units', 'IDX_curriculum_units_unique');
    await queryRunner.dropTable('curriculum_units');
  }
}
