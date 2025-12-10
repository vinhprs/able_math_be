import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnswerTypeToQuestions1764772283176 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create AnswerType enum if it doesn't exist
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "test_questions_answer_type_enum" AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // Add answer_type column with default
    await queryRunner.query(`
            ALTER TABLE "test_questions" 
            ADD COLUMN IF NOT EXISTS "answer_type" "test_questions_answer_type_enum" DEFAULT 'MULTIPLE_CHOICE';
        `);

    // Make question_text nullable
    await queryRunner.query(`
            ALTER TABLE "test_questions" 
            ALTER COLUMN "question_text" DROP NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Make question_text NOT NULL again (set a default for existing nulls first)
    await queryRunner.query(`
            UPDATE "test_questions" SET "question_text" = '' WHERE "question_text" IS NULL;
            ALTER TABLE "test_questions" 
            ALTER COLUMN "question_text" SET NOT NULL;
        `);

    // Remove answer_type column
    await queryRunner.query(`
            ALTER TABLE "test_questions" 
            DROP COLUMN IF EXISTS "answer_type";
        `);

    // Note: We cannot easily remove enum types as PostgreSQL doesn't support it directly.
    // The enum type will remain but unused.
  }
}
