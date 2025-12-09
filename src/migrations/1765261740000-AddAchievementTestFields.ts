import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAchievementTestFields1765261740000 implements MigrationInterface {
  name = 'AddAchievementTestFields1765261740000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add test_number column
    await queryRunner.addColumn(
      'tests',
      new TableColumn({
        name: 'test_number',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }),
    );

    // Add total_questions column
    await queryRunner.addColumn(
      'tests',
      new TableColumn({
        name: 'total_questions',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add national_average column (REQUIRED)
    await queryRunner.addColumn(
      'tests',
      new TableColumn({
        name: 'national_average',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: false,
        default: 0,
      }),
    );

    // Add max_score column (REQUIRED)
    await queryRunner.addColumn(
      'tests',
      new TableColumn({
        name: 'max_score',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
    );

    // Add total_applicants column (REQUIRED)
    await queryRunner.addColumn(
      'tests',
      new TableColumn({
        name: 'total_applicants',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tests', 'total_applicants');
    await queryRunner.dropColumn('tests', 'max_score');
    await queryRunner.dropColumn('tests', 'national_average');
    await queryRunner.dropColumn('tests', 'total_questions');
    await queryRunner.dropColumn('tests', 'test_number');
  }
}
