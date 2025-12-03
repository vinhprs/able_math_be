import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLevelMaintenanceFields1764772122123 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ExamType enum if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "tests_exam_type_enum" AS ENUM ('MIDTERM', 'FINAL');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Add exam_type column
        await queryRunner.query(`
            ALTER TABLE "tests" 
            ADD COLUMN IF NOT EXISTS "exam_type" "tests_exam_type_enum";
        `);

        // Add pdf_filename column
        await queryRunner.query(`
            ALTER TABLE "tests" 
            ADD COLUMN IF NOT EXISTS "pdf_filename" VARCHAR;
        `);

        // Make curriculum nullable
        await queryRunner.query(`
            ALTER TABLE "tests" 
            ALTER COLUMN "curriculum" DROP NOT NULL;
        `);

        // Add duration column with default
        await queryRunner.query(`
            ALTER TABLE "tests" 
            ADD COLUMN IF NOT EXISTS "duration" INTEGER DEFAULT 45;
        `);

        // Add LEVEL_MAINTENANCE to TestType enum
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TYPE "tests_test_type_enum" ADD VALUE 'LEVEL_MAINTENANCE';
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove duration column
        await queryRunner.query(`
            ALTER TABLE "tests" 
            DROP COLUMN IF EXISTS "duration";
        `);

        // Make curriculum NOT NULL again (set a default for existing nulls first)
        await queryRunner.query(`
            UPDATE "tests" SET "curriculum" = '' WHERE "curriculum" IS NULL;
            ALTER TABLE "tests" 
            ALTER COLUMN "curriculum" SET NOT NULL;
        `);

        // Remove pdf_filename column
        await queryRunner.query(`
            ALTER TABLE "tests" 
            DROP COLUMN IF EXISTS "pdf_filename";
        `);

        // Remove exam_type column
        await queryRunner.query(`
            ALTER TABLE "tests" 
            DROP COLUMN IF EXISTS "exam_type";
        `);

        // Note: We cannot easily remove enum values or the enum type itself
        // as PostgreSQL doesn't support removing enum values directly.
        // The enum type will remain but unused.
    }

}
