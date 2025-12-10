import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassIdToAssignments1764774000000 implements MigrationInterface {
  name = 'AddClassIdToAssignments1764774000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if class_id column exists, if not add it
    const classIdColumn = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'student_assignments' AND column_name = 'class_id'
        `);

    if (classIdColumn.length === 0) {
      // Add class_id column (nullable for individual assignments)
      await queryRunner.query(`ALTER TABLE "student_assignments" ADD "class_id" uuid`);
    }

    // Check if index exists, if not create it
    const indexExists = await queryRunner.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'student_assignments' AND indexname = 'IDX_student_assignments_class_id'
        `);

    if (indexExists.length === 0) {
      // Add index on class_id for better query performance
      await queryRunner.query(
        `CREATE INDEX "IDX_student_assignments_class_id" ON "student_assignments" ("class_id") `,
      );
    }

    // Check if foreign key exists, if not add it
    const fkExists = await queryRunner.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'student_assignments' AND constraint_name = 'FK_student_assignments_class_id'
        `);

    if (fkExists.length === 0) {
      // Add foreign key constraint to classes table
      await queryRunner.query(
        `ALTER TABLE "student_assignments" ADD CONSTRAINT "FK_student_assignments_class_id" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    // Check if instructions column exists, if not add it
    const instructionsColumn = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'student_assignments' AND column_name = 'instructions'
        `);

    if (instructionsColumn.length === 0) {
      // Add instructions column (nullable text field)
      await queryRunner.query(`ALTER TABLE "student_assignments" ADD "instructions" text`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if instructions column exists, if yes remove it
    const instructionsColumn = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'student_assignments' AND column_name = 'instructions'
        `);

    if (instructionsColumn.length > 0) {
      await queryRunner.query(`ALTER TABLE "student_assignments" DROP COLUMN "instructions"`);
    }

    // Check if foreign key exists, if yes remove it
    const fkExists = await queryRunner.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'student_assignments' AND constraint_name = 'FK_student_assignments_class_id'
        `);

    if (fkExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "student_assignments" DROP CONSTRAINT "FK_student_assignments_class_id"`,
      );
    }

    // Check if index exists, if yes remove it
    const indexExists = await queryRunner.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'student_assignments' AND indexname = 'IDX_student_assignments_class_id'
        `);

    if (indexExists.length > 0) {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_student_assignments_class_id"`);
    }

    // Check if class_id column exists, if yes remove it
    const classIdColumn = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'student_assignments' AND column_name = 'class_id'
        `);

    if (classIdColumn.length > 0) {
      await queryRunner.query(`ALTER TABLE "student_assignments" DROP COLUMN "class_id"`);
    }
  }
}
