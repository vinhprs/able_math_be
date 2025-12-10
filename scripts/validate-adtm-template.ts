// File: scripts/validate-adtm-data.ts
import 'tsconfig-paths/register';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import {
  StudentAnswer,
  StudentSubmission,
  ReportCard,
  AdtmSubmission,
  Class,
  Test,
  TestQuestion,
  User,
  Unit,
  StudentAssignment,
} from '../src/database/entities';
import * as readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function validateExistingData() {
  console.log('🔍 Validating A-DTM Data for Duplicates\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'able_math',
    entities: [
      Test,
      TestQuestion,
      Unit,
      StudentAnswer,
      StudentSubmission,
      ReportCard,
      AdtmSubmission,
      Class,
      StudentAssignment,
      User,
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✓ Database connected\n');

  const testRepository = dataSource.getRepository(Test);
  const questionRepository = dataSource.getRepository(TestQuestion);

  // Get all A-DTM tests
  const adtmTests = await testRepository.find({
    where: { testType: 'ADTM' },
    relations: ['questions'],
    order: { testCode: 'ASC' },
  });

  console.log(`Found ${adtmTests.length} A-DTM templates\n`);

  let totalDuplicates = 0;
  const duplicatesToRemove: TestQuestion[] = [];

  for (const test of adtmTests) {
    console.log(`Validating ${test.title} (${test.testCode})...`);

    const questionMap = new Map<string, TestQuestion[]>();

    // Group questions by key
    for (const q of test.questions) {
      const key = `S${q.sectionNumber}-U${q.unitName || 'NULL'}-Q${q.questionNumber}`;

      if (!questionMap.has(key)) {
        questionMap.set(key, []);
      }
      questionMap.get(key)!.push(q);
    }

    // Find duplicates
    const testDuplicates: string[] = [];
    for (const [key, questions] of questionMap.entries()) {
      if (questions.length > 1) {
        testDuplicates.push(key);
        totalDuplicates += questions.length - 1;

        // Keep first, mark rest for removal
        for (let i = 1; i < questions.length; i++) {
          duplicatesToRemove.push(questions[i]);
        }
      }
    }

    if (testDuplicates.length > 0) {
      console.log(`  ❌ Found ${testDuplicates.length} duplicate question keys:`);
      testDuplicates.forEach((key) => {
        const count = questionMap.get(key)!.length;
        console.log(`     ${key}: ${count} copies`);
      });
    } else {
      console.log(`  ✅ No duplicates found`);
    }
    console.log();
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total duplicate questions to remove: ${totalDuplicates}`);

  if (totalDuplicates > 0) {
    const answer = await prompt('\n⚠️  Remove duplicate questions? (yes/no): ');

    if (answer.toLowerCase() === 'yes') {
      console.log('\n🗑️  Removing duplicates...');

      for (const question of duplicatesToRemove) {
        await questionRepository.remove(question);
      }

      console.log(`✅ Removed ${duplicatesToRemove.length} duplicate questions`);
    } else {
      console.log('❌ Aborted. No changes made.');
    }
  }

  rl.close();
  await dataSource.destroy();
}

validateExistingData().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
