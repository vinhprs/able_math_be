/**
 * SEED SCRIPT: A-DTM TEMPLATES
 *
 * Import all 23 A-DTM test templates into database
 * Run this script ONCE to populate the database
 *
 * Usage:
 * cd backend
 * ts-node scripts/seed-adtm-templates.ts
 */

// Register tsconfig-paths to resolve @shared/* imports
import 'tsconfig-paths/register';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { DataSource } from 'typeorm';
import {
  Test,
  TestQuestion,
  Unit,
  StudentAnswer,
  StudentAssignment,
  StudentSubmission,
  AdtmSubmission,
  ReportCard,
  Class,
  User,
} from '../src/database/entities';
import { UserRole } from '@shared/types/enum';
import * as path from 'path';
import * as fs from 'fs';

// Template Interface
interface AdtmTemplate {
  code: string;
  name: string;
  grade: string;
  semester: string;
  order: number;
  pdfFile: string;
  isActive: boolean;
  sections: Array<{
    number: number;
    name: string;
    nameKorean: string;
    questionCount: number;
    maxScore: number;
    hasSpecialInputs: boolean;
    questions?: Array<{
      questionNumber: number;
      maxScore: number;
      difficulty: number;
    }>;
    units?: Array<{
      name: string;
      nameEnglish: string;
      questionCount: number;
      questions: Array<{
        questionNumber: number;
        maxScore: number;
        difficulty: number;
      }>;
    }>;
  }>;
}

// Load all template files
function loadTemplates(): AdtmTemplate[] {
  const templatesDir = path.join(__dirname, 'templates');

  const templateFiles = [
    // Elementary
    'e2-1.json',
    'e2-2.json',
    'e3-1.json',
    'e3-2.json',
    'e4-1.json',
    'e4-2.json',
    'e5-1.json',
    'e5-2.json',
    'e6-1.json',
    'e6-2.json',
    // Middle School
    'm1-1.json',
    'm1-2.json',
    'm2-1.json',
    'm2-2.json',
    'm3-1.json',
    'm3-2.json',
    // High School
    'advanced(upper).json',
    'highschool(lower).json',
    'number1.json',
    'number2.json',
    'probability_statistics.json',
    'calculus.json',
    'geometry.json',
  ];

  return templateFiles.map((filename) => {
    const filePath = path.join(templatesDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as AdtmTemplate;
  });
}

// Validate difficulty number (1-4)
function validateDifficulty(difficulty: number): number {
  if (difficulty >= 1 && difficulty <= 4) {
    return difficulty;
  }
  // Default to 2 (Medium) if invalid
  return 2;
}

// Seed one template
async function seedTemplate(
  dataSource: DataSource,
  template: AdtmTemplate,
  creatorId: string,
): Promise<void> {
  const testRepository = dataSource.getRepository(Test);
  const questionRepository = dataSource.getRepository(TestQuestion);

  console.log(`\n📝 Seeding template: ${template.name} (${template.code})`);

  // Calculate total score
  const totalScore = template.sections.reduce((sum, section) => sum + section.maxScore, 0);

  // Create Test entity
  const test = testRepository.create({
    testCode: template.code,
    testType: 'ADTM',
    title: template.name,
    grade: template.grade,
    curriculum: '2015 Revised Curriculum',
    semester: template.semester,
    term: template.semester,
    level: template.order,
    totalScore: totalScore,
    status: 'PUBLISHED',
    creatorId: creatorId,
  });

  await testRepository.save(test);
  console.log(`  ✓ Test created: ${test.testCode}`);

  // Create questions for each section
  let totalQuestions = 0;

  for (const section of template.sections) {
    console.log(`  📋 Section ${section.number}: ${section.name}`);

    // Section 1 or sections without units (4, 5)
    if (!section.units) {
      if (!section.questions) {
        console.log(`    ⚠️  No questions found for section ${section.number}`);
        continue;
      }

      for (const q of section.questions) {
        const question = questionRepository.create({
          testId: test.id,
          questionNumber: q.questionNumber,
          sectionNumber: section.number,
          unitName: undefined,
          questionText: '', // Empty for A-DTM
          questionImage: undefined,
          correctAnswer: '', // Empty for A-DTM
          score: q.maxScore,
          difficulty: validateDifficulty(q.difficulty),
        });

        await questionRepository.save(question);
        totalQuestions++;
      }

      console.log(`    ✓ Created ${section.questions.length} questions`);
    }
    // Sections with units (Sections 2, 3)
    else {
      for (const unit of section.units) {
        for (const q of unit.questions) {
          const question = questionRepository.create({
            testId: test.id,
            questionNumber: q.questionNumber,
            sectionNumber: section.number,
            unitName: unit.name,
            questionText: '', // Empty for A-DTM
            questionImage: undefined,
            correctAnswer: '', // Empty for A-DTM
            score: q.maxScore,
            difficulty: validateDifficulty(q.difficulty),
          });

          await questionRepository.save(question);
          totalQuestions++;
        }
      }

      console.log(
        `    ✓ Created ${section.questionCount} questions across ${section.units.length} units`,
      );
    }
  }

  console.log(`  ✅ Total questions created: ${totalQuestions}`);
}

// Main seed function
async function seedAllTemplates() {
  console.log('🚀 Starting A-DTM Templates Seeding...\n');

  // Database connection
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
      StudentAssignment,
      StudentSubmission,
      AdtmSubmission,
      ReportCard,
      Class,
      User,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✓ Database connected\n');

    // Load templates
    const templates = loadTemplates();
    console.log(`📦 Loaded ${templates.length} templates\n`);

    // Find or get an admin user to use as creator
    const userRepository = dataSource.getRepository(User);
    let adminUser = await userRepository.findOne({
      where: { role: UserRole.ADMIN },
    });

    if (!adminUser) {
      // If no admin exists, try to find any user
      adminUser = await userRepository.findOne({});
      if (!adminUser) {
        throw new Error(
          'No users found in database. Please create at least one user (preferably an ADMIN) before running this script.',
        );
      }
      console.log(
        `⚠️  No ADMIN user found. Using user "${adminUser.username}" (${adminUser.role}) as creator.\n`,
      );
    } else {
      console.log(`✓ Using admin user "${adminUser.username}" as creator.\n`);
    }

    // Check if templates already exist
    const testRepository = dataSource.getRepository(Test);
    const existingTests = await testRepository.find({
      where: { testType: 'ADTM' },
    });

    if (existingTests.length > 0) {
      console.log(`⚠️  Found ${existingTests.length} existing A-DTM templates`);
      console.log('   Do you want to delete them and re-seed? (y/n)');

      // In production, you might want to add confirmation logic here
      // For now, we'll skip if templates exist
      console.log('   Skipping to avoid duplicates. Delete manually if needed.\n');
      return;
    }

    // Seed each template
    for (const template of templates) {
      await seedTemplate(dataSource, template, adminUser.id);
    }

    console.log('\n✅ ALL TEMPLATES SEEDED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log(`  Elementary: 10 templates`);
    console.log(`  Middle School: 6 templates`);
    console.log(`  High School: 7 templates`);
    console.log(`  TOTAL: 23 templates\n`);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('✓ Database connection closed');
  }
}

// Run the seed
seedAllTemplates()
  .then(() => {
    console.log('\n🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
