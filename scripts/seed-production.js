// Production seed script for creating test users
const { db } = require('@concentrate/database');
const bcrypt = require('bcrypt');

async function seedUsers() {
  try {
    console.log('Starting user seed...');

    const users = [
      {
        email: 'admin@school.edu',
        password: 'Admin123!@#',
        full_name: 'Admin User',
        role: 'admin',
      },
      {
        email: 'teacher@school.edu',
        password: 'Teacher123!@#',
        full_name: 'Teacher User',
        role: 'teacher',
      },
      {
        email: 'student@school.edu',
        password: 'Student123!@#',
        full_name: 'Student User',
        role: 'student',
      },
    ];

    for (const user of users) {
      // Check if user exists
      const existing = await db
        .selectFrom('users')
        .where('email', '=', user.email)
        .selectAll()
        .executeTakeFirst();

      if (existing) {
        // Update existing user
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db
          .updateTable('users')
          .set({
            password_hash: hashedPassword,
            full_name: user.full_name,
            role: user.role,
            is_suspended: false,
            updated_at: new Date(),
          })
          .where('id', '=', existing.id)
          .execute();
        console.log(`Updated existing user: ${user.email}`);
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db
          .insertInto('users')
          .values({
            email: user.email,
            password_hash: hashedPassword,
            full_name: user.full_name,
            role: user.role,
            is_suspended: false,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();
        console.log(`Created new user: ${user.email}`);
      }
    }

    console.log('Seed completed successfully!');
    console.log('\nTest users created:');
    console.log('- admin@school.edu / Admin123!@#');
    console.log('- teacher@school.edu / Teacher123!@#');
    console.log('- student@school.edu / Student123!@#');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();