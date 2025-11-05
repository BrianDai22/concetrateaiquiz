/**
 * Seed Test Users Script
 * Creates test users for E2E testing with known credentials
 *
 * Usage:
 *   npx tsx scripts/seed-test-users.ts
 */

import { db } from '@concentrate/database';
import { hashPassword } from '@concentrate/shared/utils/password';
import { randomUUID } from 'crypto';

const TEST_USERS = [
  {
    email: 'admin@school.edu',
    password: 'Admin123!@#',
    name: 'Test Admin',
    role: 'admin' as const,
  },
  {
    email: 'teacher@school.edu',
    password: 'Teacher123!@#',
    name: 'Test Teacher',
    role: 'teacher' as const,
  },
  {
    email: 'student@school.edu',
    password: 'Student123!@#',
    name: 'Test Student',
    role: 'student' as const,
  },
];

async function seedTestUsers() {
  console.log('🌱 Seeding test users...\n');

  for (const user of TEST_USERS) {
    try {
      // Check if user already exists
      const existing = await db
        .selectFrom('users')
        .select(['id', 'email'])
        .where('email', '=', user.email)
        .executeTakeFirst();

      if (existing) {
        console.log(`⚠️  User already exists: ${user.email} (${user.role})`);
        console.log(`   Updating password...`);

        // Update password for existing user
        const passwordHash = await hashPassword(user.password);
        await db
          .updateTable('users')
          .set({
            password_hash: passwordHash,
            name: user.name,
            role: user.role,
            updated_at: new Date(),
          })
          .where('id', '=', existing.id)
          .execute();

        console.log(`✅ Updated: ${user.email}\n`);
      } else {
        // Create new user
        const passwordHash = await hashPassword(user.password);
        const userId = randomUUID();

        await db
          .insertInto('users')
          .values({
            id: userId,
            email: user.email,
            password_hash: passwordHash,
            name: user.name,
            role: user.role,
            suspended: false,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();

        console.log(`✅ Created: ${user.email} (${user.role})`);
        console.log(`   Password: ${user.password}\n`);
      }
    } catch (error) {
      console.error(`❌ Failed to seed user: ${user.email}`);
      console.error(error);
    }
  }

  console.log('\n✨ Test user seeding complete!\n');
  console.log('📋 Test Users:');
  console.log('   Admin:   admin@school.edu / Admin123!@#');
  console.log('   Teacher: teacher@school.edu / Teacher123!@#');
  console.log('   Student: student@school.edu / Student123!@#\n');
}

// Run the seed function
seedTestUsers()
  .then(() => {
    console.log('👍 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error seeding test users:', error);
    process.exit(1);
  });
