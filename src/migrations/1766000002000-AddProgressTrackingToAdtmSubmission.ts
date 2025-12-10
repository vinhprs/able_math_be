import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProgressTrackingToAdtmSubmission1766000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'adtm_submissions',
      new TableColumn({
        name: 'section1_saved_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'adtm_submissions',
      new TableColumn({
        name: 'section2_saved_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'adtm_submissions',
      new TableColumn({
        name: 'section3_saved_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'adtm_submissions',
      new TableColumn({
        name: 'section4_saved_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'adtm_submissions',
      new TableColumn({
        name: 'section5_saved_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'adtm_submissions',
      new TableColumn({
        name: 'last_auto_save_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('adtm_submissions', 'last_auto_save_at');
    await queryRunner.dropColumn('adtm_submissions', 'section5_saved_at');
    await queryRunner.dropColumn('adtm_submissions', 'section4_saved_at');
    await queryRunner.dropColumn('adtm_submissions', 'section3_saved_at');
    await queryRunner.dropColumn('adtm_submissions', 'section2_saved_at');
    await queryRunner.dropColumn('adtm_submissions', 'section1_saved_at');
  }
}
