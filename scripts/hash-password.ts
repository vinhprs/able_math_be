import * as bcrypt from 'bcrypt';

/**
 * Utility script to generate bcrypt password hash
 * Usage: npx ts-node scripts/hash-password.ts <password>
 */

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password');
  console.log('Usage: npx ts-node scripts/hash-password.ts <password>');
  process.exit(1);
}

const saltRounds = 10;

async function hashPassword() {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('\n✅ Password hashed successfully!\n');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nYou can use this hash in your database or seed file.\n');
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    process.exit(1);
  }
}

hashPassword();

