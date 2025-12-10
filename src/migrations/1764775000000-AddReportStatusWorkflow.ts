import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportStatusWorkflow1764775000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ReportStatus enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "report_cards_status_enum" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add status column with default
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      ADD COLUMN IF NOT EXISTS "status" "report_cards_status_enum" DEFAULT 'PENDING_REVIEW';
    `);

    // Create index on status column
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_report_cards_status" ON "report_cards" ("status");
    `);

    // Add reviewed_by_id column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      ADD COLUMN IF NOT EXISTS "reviewed_by_id" UUID;
    `);

    // Add foreign key constraint for reviewed_by_id
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      ADD CONSTRAINT "FK_report_cards_reviewed_by" 
      FOREIGN KEY ("reviewed_by_id") 
      REFERENCES "users"("id") 
      ON DELETE SET NULL;
    `);

    // Add reviewed_at column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP;
    `);

    // Add published_at column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP;
    `);

    // Add review_comment column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      ADD COLUMN IF NOT EXISTS "review_comment" TEXT;
    `);

    // Update existing reports: if is_published is true, set status to PUBLISHED
    await queryRunner.query(`
      UPDATE "report_cards" 
      SET "status" = 'PUBLISHED' 
      WHERE "is_published" = true;
    `);

    // For reports that are not published, set status to PENDING_REVIEW if not already set
    await queryRunner.query(`
      UPDATE "report_cards" 
      SET "status" = 'PENDING_REVIEW' 
      WHERE "is_published" = false AND "status" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove review_comment column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      DROP COLUMN IF EXISTS "review_comment";
    `);

    // Remove published_at column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      DROP COLUMN IF EXISTS "published_at";
    `);

    // Remove reviewed_at column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      DROP COLUMN IF EXISTS "reviewed_at";
    `);

    // Remove foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      DROP CONSTRAINT IF EXISTS "FK_report_cards_reviewed_by";
    `);

    // Remove reviewed_by_id column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      DROP COLUMN IF EXISTS "reviewed_by_id";
    `);

    // Drop index on status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_report_cards_status";
    `);

    // Remove status column
    await queryRunner.query(`
      ALTER TABLE "report_cards" 
      DROP COLUMN IF EXISTS "status";
    `);

    // Note: We cannot easily remove enum types as PostgreSQL doesn't support it directly.
    // The enum type will remain but unused.
  }
}
