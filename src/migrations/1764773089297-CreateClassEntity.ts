import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateClassEntity1764773089297 implements MigrationInterface {
    name = 'CreateClassEntity1764773089297'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_b34c92e413c4debb6e0f23fed46"`);
        await queryRunner.query(`ALTER TABLE "class_students" DROP CONSTRAINT "FK_43e081daadb906f3dc41bb267dd"`);
        await queryRunner.query(`ALTER TABLE "class_students" DROP CONSTRAINT "FK_6d12f65ab61f9f92e3d7e95ad23"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ebae351dd2d5e456290bba051a"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "class_students" DROP COLUMN "created_at"`);
        // Add grade column as nullable first, then update existing rows, then make it NOT NULL
        await queryRunner.query(`ALTER TABLE "classes" ADD "grade" character varying(20)`);
        await queryRunner.query(`UPDATE "classes" SET "grade" = 'E4' WHERE "grade" IS NULL`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "grade" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "classes" ADD "term" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "classes" ADD "school_year" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "classes" ADD "is_active" boolean NOT NULL DEFAULT true`);
        // Handle name column: preserve existing data when changing length
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "name" TYPE character varying(100)`);
        await queryRunner.query(`UPDATE "classes" SET "name" = 'Unnamed Class' WHERE "name" IS NULL`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "name" SET NOT NULL`);
        // Handle description column: change type to text
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "description" TYPE text`);
        await queryRunner.query(`CREATE INDEX "IDX_20597584a57ca52188198d5ea4" ON "classes" ("is_active") `);
        await queryRunner.query(`CREATE INDEX "IDX_43e081daadb906f3dc41bb267d" ON "class_students" ("class_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6d12f65ab61f9f92e3d7e95ad2" ON "class_students" ("student_id") `);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_b34c92e413c4debb6e0f23fed46" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "class_students" ADD CONSTRAINT "FK_43e081daadb906f3dc41bb267dd" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "class_students" ADD CONSTRAINT "FK_6d12f65ab61f9f92e3d7e95ad23" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "class_students" DROP CONSTRAINT "FK_6d12f65ab61f9f92e3d7e95ad23"`);
        await queryRunner.query(`ALTER TABLE "class_students" DROP CONSTRAINT "FK_43e081daadb906f3dc41bb267dd"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_b34c92e413c4debb6e0f23fed46"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6d12f65ab61f9f92e3d7e95ad2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43e081daadb906f3dc41bb267d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_20597584a57ca52188198d5ea4"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "classes" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "classes" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "is_active"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "school_year"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "term"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "grade"`);
        await queryRunner.query(`ALTER TABLE "class_students" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "classes" ADD "deleted_at" TIMESTAMP`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ebae351dd2d5e456290bba051a" ON "class_students" ("class_id", "student_id") `);
        await queryRunner.query(`ALTER TABLE "class_students" ADD CONSTRAINT "FK_6d12f65ab61f9f92e3d7e95ad23" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "class_students" ADD CONSTRAINT "FK_43e081daadb906f3dc41bb267dd" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_b34c92e413c4debb6e0f23fed46" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
