import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { dataSourceOptions } from '../../config/data-source';
import { User } from '../entities/user.entity';
import { UserRole } from '@shared/types/enum';

/**
 * Initial database seed
 * Creates default users for testing and development
 * 
 * Run with: npx ts-node src/database/seeds/initial-seed.ts
 */

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('✅ Database connected\n');

  const userRepository = dataSource.getRepository(User);

  try {
    // Check if users already exist
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log('⚠️  Users already exist. Skipping seed...');
      await dataSource.destroy();
      return;
    }

    const saltRounds = 10;

    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const admin = userRepository.create({
      username: 'admin',
      email: 'admin@ablemath.com',
      password: adminPassword,
      fullName: 'System Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    });

    // Create Teacher User
    const teacherPassword = await bcrypt.hash('teacher123', saltRounds);
    const teacher = userRepository.create({
      username: 'teacher',
      email: 'teacher@ablemath.com',
      password: teacherPassword,
      fullName: 'John Teacher',
      role: UserRole.TEACHER,
      isActive: true,
    });

    // Create Student User
    const studentPassword = await bcrypt.hash('student123', saltRounds);
    const student = userRepository.create({
      username: 'student',
      email: 'student@ablemath.com',
      password: studentPassword,
      fullName: 'Jane Student',
      role: UserRole.STUDENT,
      isActive: true,
    });

    // Save all users
    await userRepository.save([admin, teacher, student]);

    console.log('✅ Seed completed successfully!\n');
    console.log('📝 Created users:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Admin:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@ablemath.com');
    console.log('');
    console.log('👤 Teacher:');
    console.log('   Username: teacher');
    console.log('   Password: teacher123');
    console.log('   Email: teacher@ablemath.com');
    console.log('');
    console.log('👤 Student:');
    console.log('   Username: student');
    console.log('   Password: student123');
    console.log('   Email: student@ablemath.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  Remember to change these passwords in production!\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await dataSource.destroy();
    console.log('✅ Database connection closed');
  }
}

seed().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

