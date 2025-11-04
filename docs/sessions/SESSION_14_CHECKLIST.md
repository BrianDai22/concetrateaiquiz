# Session 14 - Frontend Development Checklist

**Date:** 2025-11-04
**Goal:** Build complete Next.js 15 frontend
**Estimated Time:** 22-28 hours

---

## 📋 Pre-Development Checklist

### ✅ Verify Backend (5 minutes)
- [ ] PostgreSQL running: `docker-compose ps | grep concentrate-quiz-db`
- [ ] Redis running: `docker-compose ps | grep school-portal-redis`
- [ ] `.env` file exists: `ls -la .env`
- [ ] `.env` has Google credentials: `grep GOOGLE_CLIENT_ID .env`
- [ ] Backend builds: `npm run build -w @concentrate/api`
- [ ] Server starts: `node apps/api/dist/server.js`
- [ ] Health check: `curl http://localhost:3001/health`
- [ ] OAuth works: Open `http://localhost:3001/api/v0/auth/oauth/google`

### ✅ Read Documentation (15 minutes)
- [ ] Read `SESSION_14_START_HERE.md` (overview)
- [ ] Read `dev/active/SESSION_14_FRONTEND_KICKOFF.md` (implementation plan)
- [ ] Skim `docs/planning/SPECS.md` (API endpoints)

---

## 🏗️ Phase 1: Project Setup (2-3 hours)

### Initialize Project
- [ ] Create Next.js app: `npx create-next-app@latest frontend`
  - [ ] TypeScript: Yes
  - [ ] Tailwind: Yes
  - [ ] App Router: Yes
  - [ ] src directory: No
- [ ] Install dependencies:
  ```bash
  npm install @tanstack/react-query
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
  npm install zod
  ```

### Configure Environment
- [ ] Create `.env.local`:
  ```bash
  NEXT_PUBLIC_API_URL=http://localhost:3001
  NEXT_PUBLIC_OAUTH_REDIRECT_URL=http://localhost:3000/dashboard
  ```

### Set Up Project Structure
- [ ] Create folders:
  ```
  app/
  ├── (auth)/
  │   ├── login/
  │   └── register/
  ├── (dashboard)/
  │   ├── admin/
  │   ├── teacher/
  │   └── student/
  └── stats/
  components/
  ├── ui/
  ├── auth/
  └── shared/
  lib/
  └── utils/
  hooks/
  ```

### Create Core Utilities
- [ ] Create `lib/api.ts` (API client)
- [ ] Create `lib/auth.ts` (auth utilities)
- [ ] Create `lib/utils.ts` (helper functions)
- [ ] Set up TanStack Query provider

### Test Setup
- [ ] Start dev server: `npm run dev`
- [ ] Verify http://localhost:3000 loads
- [ ] Verify Tailwind styles work

---

## 🔐 Phase 2: Authentication UI (3-4 hours)

### Login Page (`/login`)
- [ ] Create login page component
- [ ] Email/password form with validation
- [ ] "Sign in with Google" button
- [ ] Link to register page
- [ ] Error message display
- [ ] Loading states
- [ ] Test with backend API

### Register Page (`/register`)
- [ ] Create register page component
- [ ] Email/password/name form
- [ ] Password strength indicator
- [ ] "Sign up with Google" button
- [ ] Link to login page
- [ ] Form validation with Zod
- [ ] Test with backend API

### OAuth Integration
- [ ] Implement Google OAuth redirect
- [ ] Handle callback with query params
- [ ] Display success/error messages
- [ ] Redirect to dashboard on success
- [ ] Test full OAuth flow

### Auth Context
- [ ] Create auth context/provider
- [ ] Store user session
- [ ] Handle token refresh
- [ ] Logout functionality
- [ ] Protected route middleware
- [ ] Test authentication state

---

## 👨‍💼 Phase 3: Admin Dashboard (4-5 hours)

### Layout
- [ ] Create admin layout component
- [ ] Navigation sidebar
- [ ] Header with user info
- [ ] Logout button

### User Management (`/admin/users`)
- [ ] User list table
- [ ] Sorting and filtering
- [ ] Create user modal/form
- [ ] Edit user modal/form
- [ ] Delete user confirmation
- [ ] Suspend/unsuspend actions
- [ ] TanStack Query integration
- [ ] Test all CRUD operations

### Teacher Groups (`/admin/groups`)
- [ ] Group list view
- [ ] Create group form
- [ ] Edit group form
- [ ] Delete group
- [ ] Add/remove teachers
- [ ] Test functionality

### Shared Components
- [ ] Reusable data table
- [ ] Modal/dialog component
- [ ] Form components
- [ ] Action buttons
- [ ] Loading skeletons

---

## 👨‍🏫 Phase 4: Teacher Dashboard (5-6 hours)

### Layout
- [ ] Create teacher layout
- [ ] Navigation between sections
- [ ] Quick stats overview

### Classes Page (`/teacher/classes`)
- [ ] Class list view (cards or table)
- [ ] Create class form
- [ ] Edit class form
- [ ] Delete class confirmation
- [ ] View students in class
- [ ] Test CRUD operations

### Class Detail (`/teacher/classes/:id`)
- [ ] Class overview
- [ ] Student list
- [ ] Add student functionality
- [ ] Remove student functionality
- [ ] Assignments for class
- [ ] Test all features

### Assignments Page (`/teacher/assignments`)
- [ ] Assignment list grouped by class
- [ ] Create assignment form
- [ ] Edit assignment form
- [ ] Delete assignment
- [ ] Publish/unpublish toggle
- [ ] Test assignment management

### Grading Page (`/teacher/grading`)
- [ ] Submissions list
- [ ] Grade submission form
- [ ] Feedback text area
- [ ] Filter by class/student
- [ ] Bulk actions (if applicable)
- [ ] Test grading workflow

---

## 👨‍🎓 Phase 5: Student Dashboard (3-4 hours)

### Layout
- [ ] Create student layout
- [ ] Navigation between sections
- [ ] Quick stats (upcoming assignments)

### Classes Page (`/student/classes`)
- [ ] Enrolled classes list
- [ ] Class details view
- [ ] Assignment list per class
- [ ] Test data fetching

### Assignments Page (`/student/assignments`)
- [ ] All assignments list
- [ ] Filter by class/status
- [ ] View assignment details
- [ ] Submit assignment form
- [ ] File upload (if required)
- [ ] Test submission flow

### Grades Page (`/student/grades`)
- [ ] Grades table grouped by class
- [ ] Assignment details
- [ ] Teacher feedback display
- [ ] Grade charts/visualizations
- [ ] Test data display

---

## 📊 Phase 6: Public Stats Page (2 hours)

### Stats Dashboard (`/stats`)
- [ ] Overall average grades display
- [ ] Teacher list
- [ ] Student list
- [ ] Class list with averages
- [ ] Class detail with students
- [ ] Data visualizations (charts)
- [ ] Responsive layout
- [ ] Test public access

---

## 🧪 Phase 7: Testing & Polish (3-4 hours)

### Component Tests
- [ ] Write tests for auth components
- [ ] Write tests for admin components
- [ ] Write tests for teacher components
- [ ] Write tests for student components
- [ ] Write tests for shared components
- [ ] Target >80% coverage

### E2E Tests (Playwright)
- [ ] Test login flow (password)
- [ ] Test login flow (OAuth)
- [ ] Test admin user management
- [ ] Test teacher class creation
- [ ] Test teacher assignment creation
- [ ] Test student assignment submission
- [ ] Test grading workflow

### UI/UX Polish
- [ ] Add loading states everywhere
- [ ] Add error boundaries
- [ ] Implement toast notifications
- [ ] Add form validation feedback
- [ ] Improve responsive design
- [ ] Test on mobile devices

### Accessibility
- [ ] Add ARIA labels
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Check color contrast
- [ ] Add focus indicators

### Performance
- [ ] Optimize images
- [ ] Code splitting
- [ ] Lazy loading components
- [ ] Check bundle size
- [ ] Test page load times

---

## ✅ Final Verification

### Functionality
- [ ] All user roles can log in
- [ ] OAuth "Sign in with Google" works
- [ ] Admin can create/edit/delete users
- [ ] Admin can suspend/unsuspend users
- [ ] Teachers can create/edit/delete classes
- [ ] Teachers can add/remove students
- [ ] Teachers can create/edit/delete assignments
- [ ] Teachers can publish assignments
- [ ] Teachers can grade submissions
- [ ] Students can view classes
- [ ] Students can view assignments
- [ ] Students can submit assignments
- [ ] Students can view grades
- [ ] Stats page displays data
- [ ] Logout works correctly

### Quality
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No ESLint violations
- [ ] Component tests passing
- [ ] E2E tests passing
- [ ] Mobile responsive
- [ ] Accessible (WCAG AA)
- [ ] Fast page loads (<2s)

### Documentation
- [ ] README updated
- [ ] Setup instructions clear
- [ ] Environment variables documented
- [ ] API integration documented

---

## 🚀 Deployment Prep (Optional)

### Production Ready
- [ ] Environment variables configured
- [ ] Production API URL set
- [ ] OAuth credentials for production
- [ ] Error tracking setup (Sentry)
- [ ] Analytics setup (optional)

### Docker
- [ ] Create Dockerfile for frontend
- [ ] Update docker-compose.yml
- [ ] Test full stack with Docker

### CI/CD
- [ ] GitHub Actions workflow
- [ ] Run tests on PR
- [ ] Build on merge
- [ ] Deploy to production

---

## 📊 Progress Tracking

### Time Estimates:
- ✅ Phase 1 (Setup): 2-3 hours
- ⬜ Phase 2 (Auth): 3-4 hours
- ⬜ Phase 3 (Admin): 4-5 hours
- ⬜ Phase 4 (Teacher): 5-6 hours
- ⬜ Phase 5 (Student): 3-4 hours
- ⬜ Phase 6 (Stats): 2 hours
- ⬜ Phase 7 (Testing): 3-4 hours

**Total:** 22-28 hours (3-4 days)

### Completion Percentage:
- Backend: 100% ✅
- Frontend: 0% → Update as you go

---

## 🆘 Quick Troubleshooting

### Backend not responding
```bash
# Restart backend
npm run build -w @concentrate/api
node apps/api/dist/server.js
```

### CORS errors
- Ensure frontend is on `localhost:3000`
- Ensure backend is on `localhost:3001`
- Check `credentials: 'include'` in fetch

### OAuth not working
- Check `.env` has Google credentials
- Check Google Console callback URL
- Check server logs for dotenv loading

### Cookies not being set
- Check `credentials: 'include'` in API requests
- Check browser dev tools → Application → Cookies

---

**🎯 Start here: Phase 1 - Project Setup**

**Reference:** `dev/active/SESSION_14_FRONTEND_KICKOFF.md`

**Last Updated:** 2025-11-04
