import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdtmDomainFields1766000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Domain 1: Basic Learning Ability (Sections 1-3)
    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      ADD COLUMN IF NOT EXISTS "basic_learning_avg" DECIMAL(5,2);
    `);

    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      ADD COLUMN IF NOT EXISTS "basic_learning_eval" VARCHAR(20);
    `);

    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      ADD COLUMN IF NOT EXISTS "basic_learning_color" VARCHAR(7);
    `);

    // Domain 2: Creative Thinking Ability (Sections 4-5)
    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      ADD COLUMN IF NOT EXISTS "creative_thinking_avg" DECIMAL(5,2);
    `);

    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      ADD COLUMN IF NOT EXISTS "creative_thinking_eval" VARCHAR(20);
    `);

    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      ADD COLUMN IF NOT EXISTS "creative_thinking_color" VARCHAR(7);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Domain 2 fields
    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      DROP COLUMN IF EXISTS "creative_thinking_color";
    `);

    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      DROP COLUMN IF EXISTS "creative_thinking_eval";
    `);

    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      DROP COLUMN IF EXISTS "creative_thinking_avg";
    `);

    // Remove Domain 1 fields
    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      DROP COLUMN IF EXISTS "basic_learning_color";
    `);

    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      DROP COLUMN IF EXISTS "basic_learning_eval";
    `);

    await queryRunner.query(`
      ALTER TABLE "adtm_submissions" 
      DROP COLUMN IF EXISTS "basic_learning_avg";
    `);
  }
}
