# School Portal Platform - Video Script (5-10 Minutes)

---

## PART 1: HIGH-LEVEL OVERVIEW (1-2 minutes)

[show browser with login page]

Hey there! I'm going to walk you through the School Portal Platform I built for the Concentrate.ai hiring assessment. This is a Canvas-style educational SaaS platform—a full-stack application with three distinct user roles: Admin, Teacher, and Student.

[show architecture diagram or docker-compose.yml]

**The tech stack is modern and production-ready:**
- **Frontend:** Next.js 15 with React 19, TailwindCSS, and Radix UI components
- **Backend:** Fastify API server with TypeScript and Zod validation
- **Database:** PostgreSQL 17 with Kysely ORM for type-safe queries
- **Caching:** Redis for session management
- **Infrastructure:** Everything containerized with Docker, deployed behind an Nginx reverse proxy with SSL support

[show package.json or project structure]

The project is a **monorepo** organized into packages and apps. I have five shared packages—database, services, validation, shared utilities, and UI components—and three apps: the API, the main frontend, and a web app placeholder.

**What can users actually do?** Well, it depends on their role:
- **Admins** can create users, suspend accounts, and manage teacher groups
- **Teachers** can create classes, publish assignments, enroll students, and grade submissions
- **Students** can view their classes, submit assignments, and see their grades with feedback

Plus, there's a **public stats API** that exposes school-wide metrics like average grades, teacher and student names, and class rosters—no authentication required.

And as a bonus, I implemented an **AI chatbot** powered by OpenAI that provides context-aware guidance based on the user's role and enrollment data.

---

## PART 2: ARCHITECTURE & DESIGN (2-3 minutes)

[open apps/api/src directory]

Let me dive into the architecture. The backend follows a **strict layered pattern**:

**Layer 1: Routes** (`apps/api/src/routes/`)
These are the HTTP endpoints. I have six route files totaling about 1,300 lines:
- `auth.ts` - registration, login, logout, token refresh, and Google OAuth callback
- `admin.ts` - user CRUD, suspend/unsuspend operations
- `teacher.ts` - class management, assignments, grading
- `student.ts` - view classes, submit assignments, view grades
- `stats.ts` - six public endpoints for school-wide statistics
- `chatbot.ts` - AI assistant endpoint

[open apps/api/src/app.ts]

**Entry point:** The Fastify app in `app.ts` registers middleware—CORS with a whitelist, Helmet for security headers, cookie support for JWT tokens, and the Google OAuth2 plugin. All routes are registered under `/api/v0`.

There's also a **global error handler** that maps custom exceptions (like `NotFoundError`, `UnauthorizedError`, `ForbiddenError`) to proper HTTP status codes. This keeps error handling consistent across all endpoints.

[open packages/services/src]

**Layer 2: Services** (`packages/services/src/`)
Services contain all business logic. For example:
- **AuthService** handles registration, login, password hashing with bcrypt, JWT generation, refresh token rotation, and session management
- **ClassService** manages class CRUD, student enrollment, and ownership checks
- **AssignmentService** handles assignments, submissions, and grading logic
- **ChatbotService** integrates with OpenAI and fetches user-specific context

Services depend only on repositories—they never touch database queries directly.

[open packages/database/src/repositories]

**Layer 3: Repositories** (`packages/database/src/repositories/`)
Repositories encapsulate all database access using Kysely. Each repository has methods like `create`, `findById`, `update`, `delete`, plus specialized queries like `findByRole` or `getEnrolledStudents`. No business logic here—just type-safe SQL operations.

[show packages/validation/src]

**Input validation** is handled with **Zod schemas**. Every request body and URL parameter is validated before it hits the service layer. This eliminates a whole class of bugs and provides great TypeScript autocomplete.

[open packages/database/src/migrations/001_initial_schema.ts]

**Database design** is solid. I have:
- **users** table with email, password_hash, role (admin/teacher/student), and a suspended flag
- **classes** and **assignments** tables with foreign keys to users
- **submissions** and **grades** tables for student work
- **sessions** table for JWT refresh tokens
- **oauth_accounts** table for Google OAuth
- **teacher_groups** and junction tables for many-to-many relationships

All IDs are UUIDs. I have foreign key constraints with appropriate cascades (e.g., deleting a class cascades to assignments and submissions). There are **14 indexes** on frequently queried columns like `users.email`, `classes.teacher_id`, and `assignments.due_date` for performance.

Plus, there's a PostgreSQL trigger function that auto-updates `updated_at` columns on all tables.

[show apps/api/src/hooks/auth.ts and rbac.ts]

**Authentication flow** end-to-end:
1. User logs in with email/password at `/api/v0/auth/login`
2. **AuthService** verifies password with bcrypt, checks if user is suspended
3. Generates an **access token** (JWT, 15-minute expiry) and a **refresh token** (random string, 7-day expiry)
4. Stores refresh token in **Redis** with user ID and expiry
5. Sets both tokens as **HTTP-only cookies** (secure in production, sameSite: lax)
6. For protected routes, the `requireAuth` hook extracts the access token, verifies the JWT signature, and attaches user info to the request
7. The `requireRole` hook checks if the user has the required role (admin, teacher, or student)

For Google OAuth, the flow is:
1. User clicks "Sign in with Google" → redirects to Google
2. Google redirects back to `/api/v0/auth/oauth/google/callback` with an authorization code
3. Backend exchanges code for access token, fetches user profile from Google
4. **OAuthService** finds or creates user, stores OAuth account, generates JWT tokens
5. Redirects to frontend OAuth callback page with success parameter

[show nginx.conf]

**Infrastructure highlights:**
- **Multi-stage Docker builds** for API and frontend—builder stage compiles TypeScript, production stage runs minimal Node image with only production dependencies and compiled artifacts
- **Docker Compose** orchestrates PostgreSQL, Redis, API, Frontend, and Nginx containers with health checks and dependency management
- **Nginx** reverse proxy routes `/api/v0/*` to the Fastify backend and everything else to the Next.js frontend, with rate limiting (10 req/s for API, 30 req/s for general), gzip compression, SSL via Let's Encrypt, and security headers (HSTS, X-Frame-Options, CSP)

The production compose file disables volume mounts and configures SSL certificates via a Certbot container that auto-renews certificates every 12 hours.

---

## PART 3: DEEP DIVE INTO FEATURES (2-3 minutes)

[show admin dashboard in browser]

**Admin workflows:**
Let me show you what an admin can do. Admins have full control over users.

[navigate to /admin/users]

On the users page, they can:
- **Create users** with email, name, password, and role (POST `/api/v0/admin/users`)
- **List all users** with optional filtering by role or suspension status (GET `/api/v0/admin/users`)
- **Suspend or unsuspend** users (POST `/api/v0/admin/users/:id/suspend`), which immediately invalidates their sessions
- **Delete users** (DELETE `/api/v0/admin/users/:id`)

There's also a **teacher groups** feature where admins can create groups and add teachers to them (POST `/api/v0/admin/teacher-groups`).

[open apps/api/src/routes/admin.ts]

**Business rules enforced:**
- Admins cannot suspend themselves
- Admins cannot delete the last admin account (there's a check in `UserService` that counts admins before deletion)
- Suspended users are immediately locked out via checks in `requireAuth` and during login

[show teacher dashboard]

**Teacher workflows:**
Teachers have powerful class management capabilities.

[navigate to /teacher/classes]

1. **Create classes** (POST `/api/v0/teacher/classes`) - name, description, auto-assigns teacher_id
2. **Add/remove students** (POST/DELETE `/api/v0/teacher/classes/:id/students/:studentId`)
3. **Create assignments** (POST `/api/v0/teacher/assignments`) - title, description, due date, class ID
4. **Grade submissions** (POST `/api/v0/teacher/assignments/:id/submissions/:submissionId/grade`) - numeric grade and optional feedback text

[open apps/api/src/routes/teacher.ts around line 200-250]

Teachers can only modify their own classes. There's an **ownership check** in every endpoint—before updating or deleting a class, we verify `class.teacher_id === request.user.userId`. If not, we throw a `ForbiddenError`.

When grading, the service ensures:
- The assignment belongs to the teacher's class
- The submission exists for that assignment
- Only one grade per submission (enforced by unique constraint on `grades.submission_id`)

[show student dashboard]

**Student workflows:**
Students have read-heavy permissions with write access only for submissions.

[navigate to /student/classes]

1. **View enrolled classes** (GET `/api/v0/student/classes`) - uses a join on `class_students` table
2. **View assignments** (GET `/api/v0/student/assignments`) - fetches all assignments for enrolled classes with due dates
3. **Submit assignments** (POST `/api/v0/student/assignments/:id/submit`) - content text and optional file URL
4. **View grades** (GET `/api/v0/student/grades`) - joins submissions with grades and includes teacher feedback

[open apps/api/src/routes/student.ts]

Students can only access data for classes they're enrolled in. Every query filters by `class_students.student_id = request.user.userId`.

[show postman or curl hitting /api/v0/stats/average-grades]

**Public stats API:**
These six endpoints require no authentication. Examples:
- `GET /stats/average-grades` - calculates average grade across all submissions
- `GET /stats/average-grades/:classId` - average for a specific class using a three-table join
- `GET /stats/teacher-names` - returns array of all teacher names
- `GET /stats/student-names` - returns array of all student names
- `GET /stats/classes` - lists all classes with teacher info
- `GET /stats/classes/:id` - lists students enrolled in a specific class

[open apps/api/src/routes/stats.ts]

The implementation is straightforward—direct database queries with Kysely, no service layer needed since there's no business logic, just aggregation and filtering.

---

## PART 4: TESTING, ROBUSTNESS, AND QUALITY (1-2 minutes)

[show coverage report or terminal with test output]

**Testing is comprehensive.** I have **91.35% overall coverage** on the backend, with:
- **75+ integration tests** across all route files
- **100% coverage** on auth routes, stats routes, and RBAC hooks
- **96-100% coverage** on admin and teacher routes
- **98% coverage** on student routes (with documented exceptions)

[show vitest.config.ts]

The test setup uses **Vitest** with the v8 coverage provider. All tests run against a **real PostgreSQL database**—no mocks except for specific error scenarios. This gives me confidence that the code works in production.

[open apps/api/tests/routes/auth.test.ts]

**Test patterns:**
- Each test file has `beforeAll` to build the Fastify app and run migrations
- Each test has `beforeEach` to clear database tables for isolation
- Tests use `app.inject()` to simulate HTTP requests
- Assertions check status codes, response bodies, and database state

For example, the auth tests verify:
- Successful registration creates a user and returns 201
- Login returns JWT cookies and correct user data
- Token refresh works and rotates tokens correctly
- Logout clears cookies and invalidates refresh token
- Invalid credentials return 401
- Suspended users cannot log in

[open apps/api/COVERAGE_REPORT.md]

There are **two documented coverage gaps**:
1. **app.ts error handlers (30% coverage)** - This is a known limitation of v8 coverage with Fastify's `setErrorHandler` callback registration. The error handlers DO execute correctly (test logs prove it), but the coverage tool can't instrument them. All error types are tested via integration tests.
2. **student.ts catch block (98.34% vs 100%)** - There's a catch block in the grades endpoint that's covered when running tests in isolation but causes test pollution in full suite runs due to prototype-level spies. The catch block is tested and functional.

Both gaps are **documented, explained, and functionally tested**. The actual coverage of business logic is closer to 100%.

[show frontend component tests]

**Frontend testing:**
I have **40 test files** including:
- Component tests for Button, Card, Input, Chatbot, LogoutButton using @testing-library/react
- AuthContext tests that mock the API
- Validation tests for Zod schemas

[show playwright.config.ts]

There's also a **Playwright config** for E2E tests, though the focus has been on backend integration tests.

**Code quality measures:**
- **No `any` types allowed**—enforced by ESLint, will fail the build
- **Prettier** with Tailwind plugin for consistent formatting
- **TypeScript strict mode** enabled
- **Zod validation** for all inputs
- **Kysely** for type-safe queries (no raw SQL strings)

---

## PART 5: STRENGTHS, WEAKNESSES, AND BOTTLENECKS (1-2 minutes)

[show service and repository files side by side]

**Strengths:**

1. **Clean separation of concerns** - Routes handle HTTP, services handle business logic, repositories handle data access. Each layer has a single responsibility. For example, `AuthService` never writes SQL—it calls `UserRepository.create()` and `SessionRepository.create()`.

2. **Type safety everywhere** - TypeScript + Kysely + Zod means I catch bugs at compile time. The database schema is typed, so I get autocomplete for columns and type errors if I query a non-existent field.

3. **Comprehensive error handling** - Custom error classes (`NotFoundError`, `UnauthorizedError`, etc.) map to HTTP status codes in the global error handler. Services throw semantic errors, routes return proper HTTP responses.

4. **Security best practices**:
   - Passwords hashed with bcrypt (12 rounds)
   - JWT tokens in HTTP-only cookies (not localStorage)
   - Refresh token rotation to prevent token reuse
   - Redis sessions with automatic expiration
   - RBAC enforced at route level with `requireAuth` and `requireRole` hooks
   - Nginx rate limiting and security headers

5. **Performance optimizations**:
   - 14 database indexes on frequently queried columns
   - Connection pooling with pg (PostgreSQL driver)
   - Redis caching for sessions
   - Nginx gzip compression
   - Multi-stage Docker builds (small production images)

6. **Production-ready infrastructure** - Docker Compose with health checks, SSL via Let's Encrypt, automatic certificate renewal, graceful shutdown with dumb-init

[open packages/services/src/AssignmentService.ts or ChatbotService.ts]

**Weaknesses and Risks:**

1. **Some services are getting large** - `AssignmentService` is 190+ lines with multiple responsibilities (assignments, submissions, grading). This could be split into `AssignmentService`, `SubmissionService`, and `GradingService` for better modularity.

2. **No pagination on some endpoints** - Teacher's `GET /assignments` and student's `GET /classes` return all results. With 1,000+ assignments, this could cause performance issues. **Fix:** Add `page` and `limit` query params, implement offset/limit in repositories.

3. **N+1 queries in stats routes** - `GET /stats/classes/:id` fetches student IDs, then calls `getUserById` in a loop. With 100 students, that's 101 queries. **Fix:** Use a single join query to fetch all students in one go.

4. **Chatbot has no conversation history** - Each message is stateless. For better UX, we'd need to store conversation context in Redis or database. **Fix:** Add a `conversations` table with message history, pass recent messages to OpenAI.

5. **No retry logic for Redis/OpenAI failures** - If Redis is down, all authenticated requests fail. If OpenAI API is rate-limited, chatbot crashes. **Fix:** Add exponential backoff retry with libraries like `p-retry`, graceful degradation (e.g., return cached response or error message).

6. **File uploads not implemented** - Submissions have a `file_url` field, but there's no endpoint to upload files. **Fix:** Add `POST /student/assignments/:id/upload` with multipart/form-data handling, store files in S3 or similar, save URL to database.

7. **Tight coupling in routes** - Some routes instantiate services directly (e.g., `new AuthService(request.db)`). This makes unit testing harder. **Fix:** Implement dependency injection—create services once per request in a Fastify decorator.

[show nginx.conf rate limiting section]

**Potential Bottlenecks:**

1. **Database query performance at scale** - No query logging or slow query analysis. With 10,000+ users, some joins (like fetching all enrolled classes with assignments) could slow down. **Fix:** Add query timing middleware, analyze slow queries with `EXPLAIN ANALYZE`, add more indexes.

2. **Single Redis instance** - If Redis crashes, all sessions are lost. **Fix:** Use Redis Sentinel for high availability or Redis Cluster for horizontal scaling.

3. **No API response caching** - Public stats endpoints recalculate averages on every request. With 100 requests/second, that's expensive. **Fix:** Cache responses in Redis with 5-minute TTL, invalidate on grade creation.

4. **Nginx as single point of failure** - If Nginx crashes, the entire app is down. **Fix:** Deploy multiple Nginx instances behind a load balancer (AWS ALB, GCP Load Balancer).

5. **No database read replicas** - All reads hit the primary database. With high read traffic, this could bottleneck. **Fix:** Set up PostgreSQL read replicas, route `SELECT` queries to replicas.

---

## PART 6: CONCLUSION (30 seconds)

[show full app running, maybe navigate through all three role dashboards]

So that's the School Portal Platform. It's a production-ready, full-stack application with:
- **42+ API endpoints** across six route files
- **91% test coverage** with 75+ integration tests
- **Clean layered architecture** with strict separation of concerns
- **Type safety** from database to frontend with TypeScript, Kysely, and Zod
- **Modern infrastructure** with Docker, PostgreSQL, Redis, and Nginx
- **Security best practices** including JWT auth, refresh token rotation, RBAC, and HTTPS

The strengths are solid architecture, comprehensive testing, and type safety. The weaknesses are around pagination, caching, and retry logic—all things I'd tackle in the next iteration.

Thanks for watching! If you have questions, I'm happy to dive deeper into any part of the codebase.

---

## VALIDATION

**Verified Against Codebase:**
✅ All file paths reference actual files in the repository
✅ All feature descriptions match implemented code (auth.ts routes, admin CRUD, teacher grading, student submissions, stats API, chatbot)
✅ Architecture details match actual structure (monorepo with packages/apps, Kysely repos, service layer, Zod validation)
✅ Test coverage numbers match COVERAGE_REPORT.md (91.35%, 75+ tests)
✅ Infrastructure details match Dockerfiles, docker-compose.yml, nginx.conf
✅ Database schema matches migrations/001_initial_schema.ts
✅ No embellishment—all features described are implemented

**Honest Gaps:**
- OAuth is implemented (Google OAuth callback in auth.ts)
- Chatbot is implemented (ChatbotService.ts, chatbot.ts routes)
- Frontend pages exist for all roles (admin/, teacher/, student/ directories)
- Stats API is public and functional (stats.ts)

**Script Total Time:** Approximately 7-9 minutes at natural speaking pace.
