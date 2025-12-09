// scripts/seed-all-units.ts
import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';
import { CurriculumUnit } from '../src/database/entities/curriculum-unit.entity';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Seed all curriculum units for Elementary Grades 4, 5, 6
 * Based on Unit DB from dataset
 */

async function seedAllUnits() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'able_math',
    entities: [CurriculumUnit],
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  const unitRepository = dataSource.getRepository(CurriculumUnit);

  try {
    // ==========================================
    // GRADE 4 UNITS (초등 4학년)
    // ==========================================
    console.log('\n📚 Creating Grade 4 units...');

    const grade4Semester1 = [
      '1. 큰수',
      '2. 각도',
      '3. 곱셈과 나눗셈',
      '4. 평면도형의 이동',
      '5. 막대그래프',
      '6. 규칙찾기',
    ];

    const grade4Semester2 = [
      '1. 분수의 덧셈과 뺄셈',
      '2. 삼각형',
      '3. 소수의 덧셈과 뺄셈',
      '4. 사각형',
      '5. 꺾은선 그래프',
      '6. 다각형',
    ];

    let createdCount = 0;
    let existingCount = 0;

    // Grade 4 Semester 1
    for (let i = 0; i < grade4Semester1.length; i++) {
      const exists = await unitRepository.findOne({
        where: {
          curriculum: '2015개정',
          grade: 'E4',
          semester: '1',
          unitName: grade4Semester1[i],
        },
      });

      if (!exists) {
        await unitRepository.save({
          curriculum: '2015개정',
          grade: 'E4',
          semester: '1',
          unitName: grade4Semester1[i],
          displayOrder: i + 1,
        });
        console.log(`  ✅ E4-S1: ${grade4Semester1[i]}`);
        createdCount++;
      } else {
        existingCount++;
      }
    }

    // Grade 4 Semester 2
    for (let i = 0; i < grade4Semester2.length; i++) {
      const exists = await unitRepository.findOne({
        where: {
          curriculum: '2015개정',
          grade: 'E4',
          semester: '2',
          unitName: grade4Semester2[i],
        },
      });

      if (!exists) {
        await unitRepository.save({
          curriculum: '2015개정',
          grade: 'E4',
          semester: '2',
          unitName: grade4Semester2[i],
          displayOrder: i + 1,
        });
        console.log(`  ✅ E4-S2: ${grade4Semester2[i]}`);
        createdCount++;
      } else {
        existingCount++;
      }
    }

    // ==========================================
    // GRADE 5 UNITS (초등 5학년)
    // ==========================================
    console.log('\n📚 Creating Grade 5 units...');

    const grade5Semester1 = [
      '1. 자연수와 혼합계산',
      '2. 약수와 배수',
      '3. 규칙과 대응',
      '4. 약분과 통분',
      '5. 분수의 덧셈과 뺄셈',
      '6. 다각형의 둘레와 넓이',
    ];

    const grade5Semester2 = [
      '1. 수의 범위와 어림하기',
      '2. 분수의 곱셈',
      '3. 합동과 대칭',
      '4. 소수의 곱셈',
      '5. 직육면체',
      '6. 평균과 가능성',
    ];

    // Grade 5 Semester 1
    for (let i = 0; i < grade5Semester1.length; i++) {
      const exists = await unitRepository.findOne({
        where: {
          curriculum: '2015개정',
          grade: 'E5',
          semester: '1',
          unitName: grade5Semester1[i],
        },
      });

      if (!exists) {
        await unitRepository.save({
          curriculum: '2015개정',
          grade: 'E5',
          semester: '1',
          unitName: grade5Semester1[i],
          displayOrder: i + 1,
        });
        console.log(`  ✅ E5-S1: ${grade5Semester1[i]}`);
        createdCount++;
      } else {
        existingCount++;
      }
    }

    // Grade 5 Semester 2
    for (let i = 0; i < grade5Semester2.length; i++) {
      const exists = await unitRepository.findOne({
        where: {
          curriculum: '2015개정',
          grade: 'E5',
          semester: '2',
          unitName: grade5Semester2[i],
        },
      });

      if (!exists) {
        await unitRepository.save({
          curriculum: '2015개정',
          grade: 'E5',
          semester: '2',
          unitName: grade5Semester2[i],
          displayOrder: i + 1,
        });
        console.log(`  ✅ E5-S2: ${grade5Semester2[i]}`);
        createdCount++;
      } else {
        existingCount++;
      }
    }

    // ==========================================
    // GRADE 6 UNITS (초등 6학년)
    // ==========================================
    console.log('\n📚 Creating Grade 6 units...');

    const grade6Semester1 = [
      '1. 분수의 나눗셈',
      '2. 각기둥과 각뿔',
      '3. 소수의 나눗셈',
      '4. 비와 비율',
      '5. 여러 가지 그래프',
      '6. 직육면체의 부피와 겉넓이',
    ];

    const grade6Semester2 = [
      '1. 분수의 나눗셈',
      '2. 소수의 나눗셈',
      '3. 공간과 입체',
      '4. 비례식과 비례배분',
      '5. 원의 넓이',
      '6. 원기둥, 원뿔, 구',
    ];

    // Grade 6 Semester 1
    for (let i = 0; i < grade6Semester1.length; i++) {
      const exists = await unitRepository.findOne({
        where: {
          curriculum: '2015개정',
          grade: 'E6',
          semester: '1',
          unitName: grade6Semester1[i],
        },
      });

      if (!exists) {
        await unitRepository.save({
          curriculum: '2015개정',
          grade: 'E6',
          semester: '1',
          unitName: grade6Semester1[i],
          displayOrder: i + 1,
        });
        console.log(`  ✅ E6-S1: ${grade6Semester1[i]}`);
        createdCount++;
      } else {
        existingCount++;
      }
    }

    // Grade 6 Semester 2
    for (let i = 0; i < grade6Semester2.length; i++) {
      const exists = await unitRepository.findOne({
        where: {
          curriculum: '2015개정',
          grade: 'E6',
          semester: '2',
          unitName: grade6Semester2[i],
        },
      });

      if (!exists) {
        await unitRepository.save({
          curriculum: '2015개정',
          grade: 'E6',
          semester: '2',
          unitName: grade6Semester2[i],
          displayOrder: i + 1,
        });
        console.log(`  ✅ E6-S2: ${grade6Semester2[i]}`);
        createdCount++;
      } else {
        existingCount++;
      }
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ UNIT SEED COMPLETED');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${createdCount} units`);
    console.log(`⏭️  Skipped (already exists): ${existingCount} units`);
    console.log('='.repeat(60));
    console.log('\n📊 Units by Grade:');
    console.log(
      `  - Grade 4 (E4): ${grade4Semester1.length + grade4Semester2.length} units (${grade4Semester1.length} in S1, ${grade4Semester2.length} in S2)`,
    );
    console.log(
      `  - Grade 5 (E5): ${grade5Semester1.length + grade5Semester2.length} units (${grade5Semester1.length} in S1, ${grade5Semester2.length} in S2)`,
    );
    console.log(
      `  - Grade 6 (E6): ${grade6Semester1.length + grade6Semester2.length} units (${grade6Semester1.length} in S1, ${grade6Semester2.length} in S2)`,
    );
    console.log(
      `  - Total: ${grade4Semester1.length + grade4Semester2.length + grade5Semester1.length + grade5Semester2.length + grade6Semester1.length + grade6Semester2.length} units`,
    );
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed
seedAllUnits()
  .then(() => {
    console.log('\n🎉 All units seeded successfully!');
    console.log('You can now use these units when creating achievement tests.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });
