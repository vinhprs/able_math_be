import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUnitEntity1764772389387 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create units table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "units" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "excel_id" integer NOT NULL,
                "name" character varying NOT NULL,
                "grade" character varying NOT NULL,
                "order" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_units" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_units_excel_id" UNIQUE ("excel_id")
            )
        `);

        // Create index on excel_id if it doesn't exist
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_units_excel_id" ON "units" ("excel_id")
        `);

        // Add unit_id column to test_questions if it doesn't exist
        await queryRunner.query(`
            ALTER TABLE "test_questions" 
            ADD COLUMN IF NOT EXISTS "unit_id" uuid
        `);

        // Add foreign key constraint if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "test_questions" 
                ADD CONSTRAINT "FK_test_questions_unit_id" 
                FOREIGN KEY ("unit_id") 
                REFERENCES "units"("id") 
                ON DELETE SET NULL 
                ON UPDATE NO ACTION;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "test_questions" 
            DROP CONSTRAINT IF EXISTS "FK_test_questions_unit_id"
        `);

        // Remove unit_id column
        await queryRunner.query(`
            ALTER TABLE "test_questions" 
            DROP COLUMN IF EXISTS "unit_id"
        `);

        // Drop units table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "units"
        `);
    }

}
