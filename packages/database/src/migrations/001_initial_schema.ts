import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Create user role enum
  await sql`CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student')`.execute(db)

  // Create users table
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('password_hash', 'varchar(255)')
    .addColumn('role', sql`user_role`, (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('suspended', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  // Create teacher_groups table
  await db.schema
    .createTable('teacher_groups')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('admin_id', 'uuid', (col) =>
      col.references('users.id').onDelete('restrict').notNull()
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  // Create teacher_group_members junction table
  await db.schema
    .createTable('teacher_group_members')
    .addColumn('group_id', 'uuid', (col) =>
      col.references('teacher_groups.id').onDelete('cascade').notNull()
    )
    .addColumn('teacher_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('joined_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addPrimaryKeyConstraint('teacher_group_members_pkey', ['group_id', 'teacher_id'])
    .execute()

  // Create classes table
  await db.schema
    .createTable('classes')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('teacher_id', 'uuid', (col) =>
      col.references('users.id').onDelete('restrict').notNull()
    )
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  // Create class_students junction table
  await db.schema
    .createTable('class_students')
    .addColumn('class_id', 'uuid', (col) =>
      col.references('classes.id').onDelete('cascade').notNull()
    )
    .addColumn('student_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('enrolled_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addPrimaryKeyConstraint('class_students_pkey', ['class_id', 'student_id'])
    .execute()

  // Create assignments table
  await db.schema
    .createTable('assignments')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('class_id', 'uuid', (col) =>
      col.references('classes.id').onDelete('cascade').notNull()
    )
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('due_date', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  // Create submissions table
  await db.schema
    .createTable('submissions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('assignment_id', 'uuid', (col) =>
      col.references('assignments.id').onDelete('cascade').notNull()
    )
    .addColumn('student_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('file_url', 'varchar(500)')
    .addColumn('submitted_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  // Create grades table
  await db.schema
    .createTable('grades')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('submission_id', 'uuid', (col) =>
      col.references('submissions.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('teacher_id', 'uuid', (col) =>
      col.references('users.id').onDelete('restrict').notNull()
    )
    .addColumn('grade', sql`numeric(5,2)`, (col) => col.notNull())
    .addColumn('feedback', 'text')
    .addColumn('graded_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  // Create oauth_accounts table
  await db.schema
    .createTable('oauth_accounts')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('provider', 'varchar(50)', (col) => col.notNull())
    .addColumn('provider_account_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('expires_at', 'timestamptz')
    .addColumn('token_type', 'varchar(50)')
    .addColumn('scope', 'text')
    .addColumn('id_token', 'text')
    .addColumn('session_state', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addUniqueConstraint('oauth_accounts_provider_account', ['provider', 'provider_account_id'])
    .execute()

  // Create sessions table for JWT refresh tokens
  await db.schema
    .createTable('sessions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('refresh_token', 'text', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  // Create indexes for better query performance
  await db.schema.createIndex('idx_users_email').on('users').column('email').execute()
  await db.schema.createIndex('idx_users_role').on('users').column('role').execute()
  await db.schema.createIndex('idx_classes_teacher').on('classes').column('teacher_id').execute()
  await db.schema.createIndex('idx_assignments_class').on('assignments').column('class_id').execute()
  await db.schema.createIndex('idx_assignments_due_date').on('assignments').column('due_date').execute()
  await db.schema.createIndex('idx_submissions_assignment').on('submissions').column('assignment_id').execute()
  await db.schema.createIndex('idx_submissions_student').on('submissions').column('student_id').execute()
  await db.schema.createIndex('idx_grades_submission').on('grades').column('submission_id').execute()
  await db.schema.createIndex('idx_sessions_user').on('sessions').column('user_id').execute()
  await db.schema.createIndex('idx_sessions_expires').on('sessions').column('expires_at').execute()

  // Create updated_at trigger function
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `.execute(db)

  // Apply updated_at trigger to all tables with updated_at column
  const tablesWithUpdatedAt = [
    'users',
    'teacher_groups',
    'classes',
    'assignments',
    'submissions',
    'grades',
    'oauth_accounts',
    'sessions'
  ]

  for (const table of tablesWithUpdatedAt) {
    await sql`
      CREATE TRIGGER update_${sql.raw(table)}_updated_at
      BEFORE UPDATE ON ${sql.table(table)}
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `.execute(db)
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop all tables in reverse order
  await db.schema.dropTable('sessions').ifExists().execute()
  await db.schema.dropTable('oauth_accounts').ifExists().execute()
  await db.schema.dropTable('grades').ifExists().execute()
  await db.schema.dropTable('submissions').ifExists().execute()
  await db.schema.dropTable('assignments').ifExists().execute()
  await db.schema.dropTable('class_students').ifExists().execute()
  await db.schema.dropTable('classes').ifExists().execute()
  await db.schema.dropTable('teacher_group_members').ifExists().execute()
  await db.schema.dropTable('teacher_groups').ifExists().execute()
  await db.schema.dropTable('users').ifExists().execute()

  // Drop the enum type
  await sql`DROP TYPE IF EXISTS user_role`.execute(db)

  // Drop the trigger function
  await sql`DROP FUNCTION IF EXISTS update_updated_at_column()`.execute(db)
}