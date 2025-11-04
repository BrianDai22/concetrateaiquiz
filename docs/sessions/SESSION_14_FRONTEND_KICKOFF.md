# Session 14 - Frontend Development Kickoff

**Last Updated:** 2025-11-04
**Status:** 🚀 Ready to Start Frontend Implementation
**Previous Session:** Session 13 - OAuth Implementation Complete

---

## ✅ Backend Status - PRODUCTION READY

### What's Complete:
- ✅ **Database Layer**: PostgreSQL 17 with Kysely ORM
- ✅ **Service Layer**: 287/287 tests passing, 100% coverage
- ✅ **API Layer**: 42 endpoints fully functional
  - Admin routes: 10 endpoints
  - Teacher routes: 14 endpoints
  - Student routes: 7 endpoints
  - Stats routes: 6 public endpoints
  - Auth routes: 7 endpoints (including OAuth)
- ✅ **Authentication**: JWT with refresh token rotation
- ✅ **Google OAuth 2.0**: Fully implemented and tested
  - OAuthAccountRepository: 100% coverage
  - OAuthService: 98.38% coverage
  - 65 OAuth tests passing
  - Live tested and verified working
- ✅ **Testing**: 294/297 tests passing (99%)
- ✅ **Coverage**: 91.35% overall

### Backend Documentation:
- Full API docs: `docs/planning/SPECS.md`
- OAuth setup: `docs/OAUTH_SETUP.md`
- Session history: `docs/sessions/SESSION_13_OAUTH_COMPLETE.md`
- Quick start: `dev/active/QUICK_START_NEXT_SESSION.md`

---

## 🎯 Frontend Development Goals

### Phase 1: Project Setup (Estimated: 2-3 hours)
**Goal:** Bootstrap Next.js 15 application with proper structure

#### Tasks:
- [ ] Initialize Next.js 15 with TypeScript
- [ ] Set up App Router structure
- [ ] Configure TailwindCSS
- [ ] Install and configure Radix UI primitives
- [ ] Set up TanStack Query for API integration
- [ ] Create environment variables (.env.local)
- [ ] Set up project structure (components, lib, hooks)
- [ ] Configure TypeScript for strict mode

#### Expected Structure:
```
apps/frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   ├── teacher/
│   │   └── student/
│   ├── stats/
│   └── layout.tsx
├── components/
│   ├── ui/          # Radix UI components
│   ├── auth/
│   └── shared/
├── lib/
│   ├── api.ts       # API client
│   ├── auth.ts      # Auth utilities
│   └── utils.ts
└── hooks/
    └── use-user.ts
```

#### Tech Stack Reference:
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "latest",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.4.0",
    "zod": "^3.22.0"
  }
}
```

---

### Phase 2: Authentication UI (Estimated: 3-4 hours)
**Goal:** Build login/register pages with Google OAuth

#### Tasks:
- [ ] Create login page (`/login`)
  - [ ] Email/password form
  - [ ] "Sign in with Google" button
  - [ ] Link to register page
  - [ ] Form validation with Zod
- [ ] Create register page (`/register`)
  - [ ] Email/password/name form
  - [ ] "Sign up with Google" button
  - [ ] Link to login page
  - [ ] Password strength indicator
- [ ] Implement OAuth flow
  - [ ] Redirect to `/api/v0/auth/oauth/google`
  - [ ] Handle callback redirect to dashboard
  - [ ] Display error messages from query params
- [ ] Create auth context/provider
  - [ ] Store user session
  - [ ] Handle token refresh
  - [ ] Protect routes with middleware
- [ ] Build logout functionality

#### API Endpoints to Use:
```typescript
// Regular login
POST /api/v0/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Register
POST /api/v0/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "student"
}

// Google OAuth
GET /api/v0/auth/oauth/google
// Redirects to Google, then back to callback

// Logout
POST /api/v0/auth/logout

// Refresh token
POST /api/v0/auth/refresh

// Get current user
GET /api/v0/auth/me
```

#### OAuth Integration Example:
```typescript
// In login page component
<Button onClick={() => {
  window.location.href = 'http://localhost:3001/api/v0/auth/oauth/google'
}}>
  <GoogleIcon /> Sign in with Google
</Button>

// OAuth success redirects to:
// http://localhost:3000/dashboard?oauth=success

// OAuth error redirects to:
// http://localhost:3000/login?error=oauth_failed
```

---

### Phase 3: Admin Dashboard (Estimated: 4-5 hours)
**Goal:** Build admin user management interface

#### Tasks:
- [ ] Create admin layout (`/admin/layout.tsx`)
- [ ] Build user management page (`/admin/users`)
  - [ ] User list table with sorting/filtering
  - [ ] Create user modal/form
  - [ ] Edit user modal/form
  - [ ] Delete user confirmation
  - [ ] Suspend/unsuspend actions
- [ ] Build teacher groups page (`/admin/groups`)
  - [ ] Group list
  - [ ] Create/edit/delete groups
  - [ ] Add/remove teachers from groups
- [ ] Create shared components
  - [ ] Data table component (reusable)
  - [ ] Modal/dialog component
  - [ ] Form components
  - [ ] Action buttons

#### API Endpoints to Use:
```typescript
// User management
GET /api/v0/admin/users
POST /api/v0/admin/users
PUT /api/v0/admin/users/:id
DELETE /api/v0/admin/users/:id
PUT /api/v0/admin/users/:id/suspend
PUT /api/v0/admin/users/:id/unsuspend

// Teacher groups (placeholders for now)
GET /api/v0/admin/teacher-groups
POST /api/v0/admin/teacher-groups
PUT /api/v0/admin/teacher-groups/:id
DELETE /api/v0/admin/teacher-groups/:id
```

---

### Phase 4: Teacher Dashboard (Estimated: 5-6 hours)
**Goal:** Build class and assignment management

#### Tasks:
- [ ] Create teacher layout (`/teacher/layout.tsx`)
- [ ] Build classes page (`/teacher/classes`)
  - [ ] Class list cards/table
  - [ ] Create class form
  - [ ] Edit class form
  - [ ] Delete class confirmation
  - [ ] View students in class
- [ ] Build class detail page (`/teacher/classes/:id`)
  - [ ] Class overview
  - [ ] Student list
  - [ ] Add/remove students
  - [ ] Assignments for this class
- [ ] Build assignments page (`/teacher/assignments`)
  - [ ] Assignment list grouped by class
  - [ ] Create assignment form
  - [ ] Edit assignment form
  - [ ] Delete assignment
  - [ ] Publish/unpublish toggle
- [ ] Build grading page (`/teacher/grading`)
  - [ ] Submissions list
  - [ ] Grade submission form
  - [ ] Feedback text area
  - [ ] Bulk grading actions

#### API Endpoints to Use:
```typescript
// Classes
GET /api/v0/teacher/classes
POST /api/v0/teacher/classes
PUT /api/v0/teacher/classes/:id
DELETE /api/v0/teacher/classes/:id

// Students in class
POST /api/v0/teacher/classes/:id/students
DELETE /api/v0/teacher/classes/:classId/students/:studentId

// Assignments
GET /api/v0/teacher/assignments
POST /api/v0/teacher/assignments
PUT /api/v0/teacher/assignments/:id
DELETE /api/v0/teacher/assignments/:id
PUT /api/v0/teacher/assignments/:id/publish

// Grading
GET /api/v0/teacher/submissions
PUT /api/v0/teacher/submissions/:id/grade
```

---

### Phase 5: Student Dashboard (Estimated: 3-4 hours)
**Goal:** Build student view for classes and assignments

#### Tasks:
- [ ] Create student layout (`/student/layout.tsx`)
- [ ] Build classes page (`/student/classes`)
  - [ ] Enrolled classes list
  - [ ] Class details view
- [ ] Build assignments page (`/student/assignments`)
  - [ ] Assignment list (all classes)
  - [ ] Filter by class/status
  - [ ] View assignment details
  - [ ] Submit assignment form
  - [ ] File upload (if applicable)
- [ ] Build grades page (`/student/grades`)
  - [ ] Grades table grouped by class
  - [ ] Assignment details
  - [ ] Teacher feedback display
  - [ ] Grade charts/visualizations

#### API Endpoints to Use:
```typescript
// Classes
GET /api/v0/student/classes

// Assignments
GET /api/v0/student/assignments

// Submissions
POST /api/v0/student/submissions
GET /api/v0/student/submissions

// Grades
GET /api/v0/student/grades
GET /api/v0/student/grades/:id
```

---

### Phase 6: Public Stats Page (Estimated: 2 hours)
**Goal:** Build public statistics dashboard

#### Tasks:
- [ ] Create stats page (`/stats`)
  - [ ] Average grades chart (all classes)
  - [ ] Teacher list
  - [ ] Student list
  - [ ] Class list with average grades
  - [ ] Class detail with student list
- [ ] Add data visualizations
  - [ ] Charts with recharts or similar
  - [ ] Cards for key metrics
  - [ ] Responsive layout

#### API Endpoints to Use:
```typescript
GET /api/v0/stats/average-grades
GET /api/v0/stats/average-grades/:id
GET /api/v0/stats/teacher-names
GET /api/v0/stats/student-names
GET /api/v0/stats/classes
GET /api/v0/stats/classes/:id
```

---

### Phase 7: Testing & Polish (Estimated: 3-4 hours)

#### Tasks:
- [ ] Write component tests with @testing-library/react
- [ ] Write E2E tests with Playwright
  - [ ] Login flow (password + OAuth)
  - [ ] Admin user management
  - [ ] Teacher class/assignment creation
  - [ ] Student assignment submission
  - [ ] Grading flow
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Implement toast notifications
- [ ] Add form validation feedback
- [ ] Mobile responsiveness
- [ ] Accessibility (ARIA labels, keyboard nav)

---

## 🔧 Backend API Base URL

**Development:**
```
http://localhost:3001
```

**Backend must be running:**
```bash
cd /Users/briandai/Documents/concentrateaiproject
npm run build -w @concentrate/api
node apps/api/dist/server.js
```

---

## 🔑 Environment Variables

Create `apps/frontend/.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_OAUTH_REDIRECT_URL=http://localhost:3000/dashboard

# Optional
NEXT_PUBLIC_APP_NAME="Concentrate School Portal"
```

---

## 📚 Key References

### Backend Documentation:
- **SPECS.md**: `docs/planning/SPECS.md`
- **OAuth Setup**: `docs/OAUTH_SETUP.md`
- **API Routes**: Check `apps/api/src/routes/*.ts`
- **Test Examples**: Check `apps/api/tests/routes/*.test.ts`

### Frontend Tech Stack:
- Next.js 15: https://nextjs.org/docs
- React 19: https://react.dev
- TanStack Query: https://tanstack.com/query
- Radix UI: https://www.radix-ui.com
- TailwindCSS: https://tailwindcss.com

### Useful Patterns:
```typescript
// API client example (lib/api.ts)
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
    {
      ...options,
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API request failed')
  }

  return response.json()
}

// TanStack Query hook example (hooks/use-user.ts)
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => apiRequest<User>('/api/v0/auth/me'),
    retry: false,
  })
}
```

---

## ⚠️ Important Notes

### Backend Requirements:
- PostgreSQL and Redis must be running via Docker Compose
- `.env` file must exist with OAuth credentials
- Server must be built and started before frontend testing

### Frontend Best Practices:
- Use Server Components by default (Next.js 15)
- Add 'use client' only when needed (forms, interactivity)
- Leverage TanStack Query for data fetching and caching
- Follow Radix UI accessibility patterns
- Validate forms with Zod
- Handle loading/error states consistently

### Testing:
- Write tests alongside components
- Test user flows, not implementation details
- Use Playwright for critical E2E flows
- Aim for >80% coverage on components

---

## 🚀 Getting Started

### Step 1: Initialize Frontend
```bash
cd apps
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
cd frontend
npm install @tanstack/react-query @radix-ui/react-dialog zod
```

### Step 2: Start Backend
```bash
cd /Users/briandai/Documents/concentrateaiproject
docker-compose up -d
npm run build -w @concentrate/api
node apps/api/dist/server.js
```

### Step 3: Start Frontend
```bash
cd apps/frontend
npm run dev
# Visit http://localhost:3000
```

### Step 4: Test OAuth
1. Go to http://localhost:3000/login
2. Click "Sign in with Google"
3. Should redirect to Google login
4. After success, should redirect to dashboard

---

## 📊 Progress Tracking

### Completion Estimate:
- **Phase 1 (Setup)**: 2-3 hours
- **Phase 2 (Auth UI)**: 3-4 hours
- **Phase 3 (Admin)**: 4-5 hours
- **Phase 4 (Teacher)**: 5-6 hours
- **Phase 5 (Student)**: 3-4 hours
- **Phase 6 (Stats)**: 2 hours
- **Phase 7 (Testing)**: 3-4 hours

**Total Estimated Time**: 22-28 hours (3-4 full days)

---

## 🎯 Success Criteria

Frontend is complete when:
- ✅ All user roles have functional dashboards
- ✅ OAuth "Sign in with Google" works end-to-end
- ✅ Regular email/password login works
- ✅ Admin can manage users
- ✅ Teachers can create classes and assignments
- ✅ Students can submit assignments
- ✅ Grading workflow is functional
- ✅ Public stats page displays data
- ✅ Component tests passing
- ✅ E2E tests covering critical flows
- ✅ Mobile responsive
- ✅ Accessible (keyboard navigation, ARIA)

---

**Ready to start frontend development!** 🎨

**Last Backend Update**: Session 13 - OAuth Complete
**Next Session**: Session 14 - Frontend Development
**Status**: ✅ Backend Production Ready | 🚀 Frontend Kickoff
