/**
 * Production Database Seeding Script
 * Creates initial production data including admin user
 *
 * This script is idempotent - it can be run multiple times safely
 */

import { db } from './index';
import { hashPassword } from '@concentrate/shared/utils/password';
import { randomUUID } from 'crypto';

const PRODUCTION_USERS = [
  {
    email: 'admin@school.edu',
    password: 'Admin123!@#',
    name: 'System Administrator',
    role: 'admin' as const,
  },
];

async function seedProductionData() {
  console.log('🌱 Seeding production database...\n');

  // Seed admin users
  for (const user of PRODUCTION_USERS) {
    try {
      // Check if user already exists
      const existing = await db
        .selectFrom('users')
        .select(['id', 'email'])
        .where('email', '=', user.email)
        .executeTakeFirst();

      if (existing) {
        console.log(`⚠️  User already exists: ${user.email} (${user.role})`);
        console.log(`   Skipping (use update script to modify existing users)\n`);
      } else {
        // Create new admin user
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
      throw error;
    }
  }

  console.log('\n✨ Production data seeding complete!\n');
  console.log('📋 Admin Credentials:');
  console.log('   Email:    admin@school.edu');
  console.log('   Password: Admin123!@#\n');
  console.log('⚠️  IMPORTANT: Change the admin password after first login!\n');
}

// Run the seed function
seedProductionData()
  .then(async () => {
    console.log('👍 Done!');
    await db.destroy();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Error seeding production data:', error);
    await db.destroy();
    process.exit(1);
  });
