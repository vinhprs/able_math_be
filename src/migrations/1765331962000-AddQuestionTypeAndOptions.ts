import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddQuestionTypeAndOptions1765331962000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create question_type enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "test_questions_question_type_enum" AS ENUM ('TEXT', 'MULTIPLE_CHOICE', 'TRUE_FALSE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add question_type column with default
    await queryRunner.addColumn(
      'test_questions',
      new TableColumn({
        name: 'question_type',
        type: 'enum',
        enum: ['TEXT', 'MULTIPLE_CHOICE', 'TRUE_FALSE'],
        default: "'TEXT'",
      }),
    );

    // Add options column (JSONB)
    await queryRunner.addColumn(
      'test_questions',
      new TableColumn({
        name: 'options',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Create index on question_type
    await queryRunner.createIndex(
      'test_questions',
      new TableIndex({
        name: 'IDX_test_questions_question_type',
        columnNames: ['question_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('test_questions', 'IDX_test_questions_question_type');

    // Drop columns
    await queryRunner.dropColumn('test_questions', 'options');
    await queryRunner.dropColumn('test_questions', 'question_type');

    // Note: We cannot easily remove enum types as PostgreSQL doesn't support it directly.
    // The enum type will remain but unused.
  }
}
