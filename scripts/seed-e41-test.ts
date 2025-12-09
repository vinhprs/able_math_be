// scripts/seed-e41-test.ts
import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';
import {
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
} from '../src/database/entities';
import { TestType, TestStatus, ExamType, AnswerType, UserRole } from '../src/shared/types/enum';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Seed data for E41-T1-L2-01 test paper
 * Grade 4, Semester 1, Midterm, Level 2
 */

async function seedE41Test() {
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
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  const testRepository = dataSource.getRepository(Test);
  const questionRepository = dataSource.getRepository(TestQuestion);
  const unitRepository = dataSource.getRepository(CurriculumUnit);

  try {
    // ==========================================
    // STEP 1: Create Curriculum Units
    // ==========================================
    console.log('\n📚 Creating curriculum units...');

    const units = [
      { id: 1, name: '1. 큰수', displayOrder: 1 },
      { id: 2, name: '2. 각도', displayOrder: 2 },
      { id: 3, name: '3. 곱셈과 나눗셈', displayOrder: 3 },
      { id: 4, name: '4. 평면도형의 이동', displayOrder: 4 },
      { id: 5, name: '5. 막대그래프', displayOrder: 5 },
      { id: 6, name: '6. 규칙찾기', displayOrder: 6 },
    ];

    const unitMap = new Map<number, string>(); // Map unit ID to UUID

    for (const unit of units) {
      let curriculumUnit = await unitRepository.findOne({
        where: {
          curriculum: '2015개정',
          grade: 'E4',
          semester: '1',
          unitName: unit.name,
        },
      });

      if (!curriculumUnit) {
        curriculumUnit = unitRepository.create({
          curriculum: '2015개정',
          grade: 'E4',
          semester: '1',
          unitName: unit.name,
          displayOrder: unit.displayOrder,
        });
        await unitRepository.save(curriculumUnit);
        console.log(`  ✅ Created unit: ${unit.name}`);
      } else {
        console.log(`  ⏭️  Unit exists: ${unit.name}`);
      }

      unitMap.set(unit.id, curriculumUnit.id);
    }

    // ==========================================
    // STEP 2: Get or Create System User
    // ==========================================
    console.log('\n👤 Finding system user...');
    const userRepository = dataSource.getRepository(User);

    // Find first admin user, or create a system user
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
        password: 'system', // Should be hashed, but for seed script this is OK
        isActive: true,
      });
      systemUser = await userRepository.save(systemUser);
      console.log(`  ✅ Created system user: ${systemUser.id}`);
    } else {
      console.log(`  ✅ Using existing admin user: ${systemUser.id}`);
    }

    // ==========================================
    // STEP 3: Create Test
    // ==========================================
    console.log('\n📝 Creating test E41-T1-L2-01...');

    const testCode = 'E41-T1-L2-01';

    // Check if test already exists
    let test = await testRepository.findOne({
      where: { testCode },
    });

    if (test) {
      console.log('  ⚠️  Test already exists, deleting old version...');
      // Delete old questions first
      await questionRepository.delete({ testId: test.id });
      await testRepository.remove(test);
    }

    // Create new test
    test = testRepository.create({
      testCode: 'E41-T1-L2-01',
      testType: TestType.ACHIEVEMENT,
      title: '초등 4학년 1학기 중간고사',
      curriculum: '2015개정',
      grade: 'E4',
      semester: '1',
      term: '',
      level: 2, // L2
      examType: ExamType.MIDTERM,
      testNumber: '01',
      totalQuestions: 20,
      totalScore: 100, // Sum of all question scores
      pdfFilename: 'E41-T1-L2-01.PDF',
      duration: 45,
      status: TestStatus.PUBLISHED,
      // Statistics (from dataset or example values)
      nationalAverage: 75.5,
      maxScore: 100,
      totalApplicants: 150,
      creatorId: systemUser.id,
    });

    test = await testRepository.save(test);
    console.log(`  ✅ Created test: ${test.testCode} (ID: ${test.id})`);

    // ==========================================
    // STEP 4: Create Questions with Answers
    // ==========================================
    console.log('\n❓ Creating 20 questions...');

    /**
     * Question data from dataset:
     * - Question 1-20 with answers
     * - Unit IDs: 1 (큰수), 2 (각도), 3 (곱셈과 나눗셈)
     * - Answer types: 1 (객관식), 2 (주관식)
     */

    const questionsData = [
      // Q#, UnitID, AnswerType, Answer, Score
      { no: 1, unitId: 3, type: 1, answer: '1', score: 4 },
      { no: 2, unitId: 2, type: 2, answer: '2', score: 4 },
      { no: 3, unitId: 1, type: 1, answer: '5', score: 4 },
      { no: 4, unitId: 2, type: 2, answer: '70', score: 4 },
      { no: 5, unitId: 1, type: 2, answer: '4', score: 4 },
      { no: 6, unitId: 2, type: 2, answer: '30', score: 4 },
      { no: 7, unitId: 1, type: 1, answer: '3', score: 5 },
      { no: 8, unitId: 1, type: 2, answer: '700000', score: 5 },
      { no: 9, unitId: 3, type: 2, answer: '26250', score: 5 },
      { no: 10, unitId: 1, type: 1, answer: '5', score: 5 },
      { no: 11, unitId: 1, type: 1, answer: '3', score: 5 },
      { no: 12, unitId: 3, type: 1, answer: '5', score: 5 },
      { no: 13, unitId: 3, type: 2, answer: '98', score: 5 },
      { no: 14, unitId: 2, type: 2, answer: '70', score: 6 },
      { no: 15, unitId: 3, type: 2, answer: '81', score: 5 },
      { no: 16, unitId: 2, type: 2, answer: '540', score: 6 },
      { no: 17, unitId: 2, type: 2, answer: '110', score: 6 },
      { no: 18, unitId: 3, type: 2, answer: '12840', score: 6 },
      { no: 19, unitId: 2, type: 2, answer: '107', score: 6 },
      { no: 20, unitId: 3, type: 2, answer: '820000', score: 6 },
    ];

    const questions: TestQuestion[] = [];

    for (const q of questionsData) {
      const unitUuid = unitMap.get(q.unitId);
      const unitName = units.find((u) => u.id === q.unitId)?.name || '';

      const question = new TestQuestion();
      question.testId = test.id;
      question.questionNumber = q.no;
      question.sectionNumber = 1;
      question.unitName = unitName;
      question.answerType = q.type === 1 ? AnswerType.MULTIPLE_CHOICE : AnswerType.SHORT_ANSWER;
      question.correctAnswer = q.answer;
      question.score = q.score;
      // Achievement Test doesn't store question text or images
      // Leave questionText and questionImage as undefined (will be null in DB)

      questions.push(question);
    }

    await questionRepository.save(questions);
    console.log(`  ✅ Created ${questions.length} questions`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEED COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`Test Code:        ${test.testCode}`);
    console.log(`Grade:            초등 4학년 (Elementary 4)`);
    console.log(`Semester:         1학기 (Semester 1)`);
    console.log(`Exam Type:        중간고사 (Midterm)`);
    console.log(`Level:            L2`);
    console.log(`Total Questions:  ${test.totalQuestions}`);
    console.log(`Total Score:      ${test.totalScore}`);
    console.log(`Status:           ${test.status}`);
    console.log('='.repeat(60));
    console.log('\n📊 Questions Summary:');
    console.log(
      `  - Unit 1 (큰수): ${questions.filter((q) => q.unitName.includes('큰수')).length} questions`,
    );
    console.log(
      `  - Unit 2 (각도): ${questions.filter((q) => q.unitName.includes('각도')).length} questions`,
    );
    console.log(
      `  - Unit 3 (곱셈과 나눗셈): ${questions.filter((q) => q.unitName.includes('곱셈')).length} questions`,
    );
    console.log('\n📋 Question Types:');
    console.log(
      `  - Multiple Choice: ${questions.filter((q) => q.answerType === 'MULTIPLE_CHOICE').length}`,
    );
    console.log(
      `  - Short Answer: ${questions.filter((q) => q.answerType === 'SHORT_ANSWER').length}`,
    );
    console.log('\n💯 Score Distribution:');
    console.log(`  - 4 points: ${questions.filter((q) => q.score === 4).length} questions`);
    console.log(`  - 5 points: ${questions.filter((q) => q.score === 5).length} questions`);
    console.log(`  - 6 points: ${questions.filter((q) => q.score === 6).length} questions`);
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
seedE41Test()
  .then(() => {
    console.log('\n🎉 All done! You can now test with E41-T1-L2-01');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });
