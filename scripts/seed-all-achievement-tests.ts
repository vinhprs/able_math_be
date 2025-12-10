// scripts/seed-all-achievement-tests.ts
import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';
import {
  Test,
  TestQuestion,
  CurriculumUnit,
  User,
  Unit,
  StudentAnswer,
  StudentSubmission,
  ReportCard,
  AdtmSubmission,
  Class,
  StudentAssignment,
} from '../src/database/entities';
import { TestType, TestStatus, ExamType, AnswerType, UserRole } from '../src/shared/types/enum';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/**
 * Comprehensive seed script for ALL Achievement Test papers
 * Total: 180 test papers from Excel dataset
 *
 * Coverage:
 * - Elementary Grade 4-6 (초등 4-6학년): 12 test names × 6 papers each = 72 tests
 * - Middle School Grade 1-3 (중등 1-3학년): 12 test names × 9 papers each = 108 tests
 *
 * Data source: Rank_retention_test_DATA_Organized_Add_badge_Elementary_complete.xlsx
 */

interface QuestionData {
  question_number: number;
  unit_id: number;
  answer_type: number;
  answer: string;
  score: number;
}

interface TestPaperData {
  paper_id: number;
  test_name_id: number;
  file_name: string;
  difficulty: number;
  test_number: number;
  name_korean: string;
  name_english: string;
  total_questions: number;
  total_score: number;
  questions: QuestionData[];
}

/**
 * Parse test code from filename
 * E41-T1-L2-01.PDF -> { grade: 'E4', semester: '1', examType: 'midterm', level: 2, number: '01' }
 */
function parseTestCode(filename: string): {
  grade: string;
  semester: string;
  examType: ExamType;
  level: number;
  number: string;
  testCode: string;
} {
  const code = filename.replace('.PDF', '').replace('.pdf', '');

  // Extract components: E41-T1-L2-01
  const match = code.match(/([EM]\d)(\d)-T(\d)-L(\d+)-(\d+)/);

  if (!match) {
    throw new Error(`Invalid test code format: ${filename}`);
  }

  const [, gradeCode, semester, testType, level, number] = match;

  // Determine exam type: T1 = midterm, T2 = final
  const examType = testType === '1' ? ExamType.MIDTERM : ExamType.FINAL;

  return {
    grade: gradeCode,
    semester,
    examType,
    level: parseInt(level, 10),
    number,
    testCode: code,
  };
}

/**
 * Import unit names from constants
 */
import { UNIT_NAMES } from './constants/unit-names';

/**
 * Get unit name by ID
 */
function getUnitName(unitId: number): string {
  return UNIT_NAMES[unitId]?.korean || `Unit ${unitId}`;
}

async function seedAllAchievementTests() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'able_math',
    entities: [
      Test,
      TestQuestion,
      CurriculumUnit,
      Unit,
      StudentAnswer,
      StudentSubmission,
      StudentAssignment,
      User,
      Class,
      AdtmSubmission,
      ReportCard,
    ],
    synchronize: false, // Important: don't auto-sync in production
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  const testRepository = dataSource.getRepository(Test);
  const questionRepository = dataSource.getRepository(TestQuestion);
  const unitRepository = dataSource.getRepository(CurriculumUnit);
  const userRepository = dataSource.getRepository(User);

  try {
    // ==========================================
    // STEP 1: Load Test Data from JSON
    // ==========================================
    console.log('\n📂 Loading test data from JSON...');

    const jsonPath = path.join(__dirname, 'all_tests_data.json');

    if (!fs.existsSync(jsonPath)) {
      throw new Error(
        `Test data file not found: ${jsonPath}\n` +
          'Please run the Python script to generate all_tests_data.json first.',
      );
    }

    const testsData: TestPaperData[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    console.log(`  ✅ Loaded ${testsData.length} test papers`);

    // ==========================================
    // STEP 2: Find or Create System User
    // ==========================================
    console.log('\n👤 Finding system user...');

    let systemUser = await userRepository.findOne({
      where: { role: UserRole.ADMIN },
      order: { createdAt: 'ASC' },
    });

    if (!systemUser) {
      console.log('  ⚠️  No admin user found, creating system user...');
      systemUser = userRepository.create({
        username: 'system',
        email: 'system@ablemath.com',
        fullName: 'System User',
        role: UserRole.ADMIN,
        password: 'system', // Should be hashed in production
        isActive: true,
      });
      systemUser = await userRepository.save(systemUser);
      console.log(`  ✅ Created system user: ${systemUser.id}`);
    } else {
      console.log(`  ✅ Using existing admin user: ${systemUser.id}`);
    }

    // ==========================================
    // STEP 3: Create Curriculum Units
    // ==========================================
    console.log('\n📚 Creating curriculum units...');

    const unitMap = new Map<number, string>(); // unit_id -> uuid
    const uniqueUnitIds = new Set<number>();

    // Collect all unique unit IDs
    for (const testData of testsData) {
      for (const q of testData.questions) {
        uniqueUnitIds.add(q.unit_id);
      }
    }

    console.log(`  Found ${uniqueUnitIds.size} unique units in dataset`);

    for (const unitId of Array.from(uniqueUnitIds).sort((a, b) => a - b)) {
      const unitName = getUnitName(unitId);

      // Determine grade and semester from unit ID (rough estimation)
      let grade = 'E4';
      let semester = '1';

      if (unitId >= 1 && unitId <= 6) {
        grade = 'E4';
        semester = '1';
      } else if (unitId >= 7 && unitId <= 12) {
        grade = 'E4';
        semester = '2';
      } else if (unitId >= 13 && unitId <= 18) {
        grade = 'E5';
        semester = '1';
      }
      // Add more mappings as needed

      let curriculumUnit = await unitRepository.findOne({
        where: {
          curriculum: '2015개정',
          grade,
          semester,
          unitName,
        },
      });

      if (!curriculumUnit) {
        curriculumUnit = unitRepository.create({
          curriculum: '2015개정',
          grade,
          semester,
          unitName,
          displayOrder: unitId,
        });
        await unitRepository.save(curriculumUnit);
        console.log(`  ✅ Created unit ${unitId}: ${unitName}`);
      } else {
        console.log(`  ⏭️  Unit ${unitId} exists: ${unitName}`);
      }

      unitMap.set(unitId, curriculumUnit.id);
    }

    // ==========================================
    // STEP 4: Create All Tests and Questions
    // ==========================================
    console.log('\n📝 Creating tests and questions...');
    console.log('='.repeat(80));

    let testsCreated = 0;
    let testsSkipped = 0;
    let testsUpdated = 0;
    let questionsCreated = 0;

    for (let i = 0; i < testsData.length; i++) {
      const testData = testsData[i];
      const progress = `[${i + 1}/${testsData.length}]`;

      try {
        // Parse test code
        const parsed = parseTestCode(testData.file_name);

        // Check if test already exists
        let test = await testRepository.findOne({
          where: { testCode: parsed.testCode },
        });

        if (test) {
          console.log(`${progress} ⏭️  Test exists: ${parsed.testCode}`);
          testsSkipped++;
          continue;
        }

        // Create new test
        test = testRepository.create({
          testCode: parsed.testCode,
          testType: TestType.ACHIEVEMENT,
          title: testData.name_korean,
          curriculum: '2015개정',
          grade: parsed.grade,
          semester: parsed.semester,
          term: '',
          level: parsed.level,
          examType: parsed.examType,
          testNumber: parsed.number,
          totalQuestions: testData.total_questions,
          totalScore: testData.total_score,
          pdfFilename: testData.file_name,
          duration: 45, // Default 45 minutes
          status: TestStatus.PUBLISHED,
          // Default statistics (can be updated later with real data)
          nationalAverage: 70,
          maxScore: testData.total_score,
          totalApplicants: 0,
          creatorId: systemUser.id,
        });

        test = await testRepository.save(test);
        testsCreated++;

        // Create questions
        const questions: TestQuestion[] = [];

        for (const qData of testData.questions) {
          const unitName = getUnitName(qData.unit_id);

          const question = new TestQuestion();
          question.testId = test.id;
          question.questionNumber = qData.question_number;
          question.sectionNumber = 1; // Achievement tests don't have sections like A-DTM
          question.unitName = unitName;
          question.answerType =
            qData.answer_type === 1 ? AnswerType.MULTIPLE_CHOICE : AnswerType.SHORT_ANSWER;
          question.correctAnswer = qData.answer;
          question.score = qData.score;
          // Achievement tests don't store question text/images

          questions.push(question);
        }

        await questionRepository.save(questions);
        questionsCreated += questions.length;

        console.log(
          `${progress} ✅ Created: ${parsed.testCode} ` +
            `(${testData.total_questions} questions, ${testData.total_score} points)`,
        );

        // Progress indicator every 10 tests
        if ((i + 1) % 10 === 0) {
          console.log(`  📊 Progress: ${i + 1}/${testsData.length} tests processed`);
        }
      } catch (error) {
        console.error(`${progress} ❌ Error processing ${testData.file_name}:`, error.message);
        // Continue with next test
      }
    }

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ SEED COMPLETED');
    console.log('='.repeat(80));
    console.log(`📊 Statistics:`);
    console.log(`  - Tests created:       ${testsCreated}`);
    console.log(`  - Tests skipped:       ${testsSkipped} (already exist)`);
    console.log(`  - Questions created:   ${questionsCreated}`);
    console.log(`  - Units created:       ${uniqueUnitIds.size}`);
    console.log('='.repeat(80));

    console.log('\n📋 Tests by Grade:');
    const testsByGrade = testsData.reduce(
      (acc, t) => {
        const grade = parseTestCode(t.file_name).grade;
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const [grade, count] of Object.entries(testsByGrade)) {
      const gradeName = grade.startsWith('E') ? '초등' : '중등';
      console.log(`  - ${gradeName} ${grade.slice(1)}학년: ${count} tests`);
    }

    console.log('\n📝 Tests by Exam Type:');
    const testsByExamType = testsData.reduce(
      (acc, t) => {
        const parsed = parseTestCode(t.file_name);
        const key = parsed.examType === ExamType.MIDTERM ? '중간고사' : '기말고사';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const [type, count] of Object.entries(testsByExamType)) {
      console.log(`  - ${type}: ${count} tests`);
    }

    console.log('\n🎯 Sample Test Codes Created:');
    const sampleTests = testsData.slice(0, 5).map((t) => parseTestCode(t.file_name).testCode);
    sampleTests.forEach((code) => console.log(`  - ${code}`));

    console.log('='.repeat(80));
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed
seedAllAchievementTests()
  .then(() => {
    console.log('\n🎉 All done! All Achievement Tests have been seeded.');
    console.log('You can now use these tests in the application.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });
