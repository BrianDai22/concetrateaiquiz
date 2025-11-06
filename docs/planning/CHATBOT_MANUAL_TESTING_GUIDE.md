# Chatbot Manual Testing Guide

**Feature:** AI-Powered Chatbot Assistant
**Purpose:** Manual UI testing across all user roles
**Date:** November 6, 2025

---

## Prerequisites

### 1. Start Development Servers

```bash
# Terminal 1: Start database services (if not running)
docker-compose up -d

# Terminal 2: Start backend API
cd apps/api
npm run dev
# Backend should be running at http://localhost:3001

# Terminal 3: Start frontend
cd apps/frontend
npm run dev
# Frontend should be running at http://localhost:3000
```

### 2. Environment Variables

Ensure these are set in `apps/api/.env`:
```env
OPENAI_API_KEY=your-actual-openai-api-key
CHATBOT_MODEL=gpt-4o-mini
CHATBOT_MAX_TOKENS=500
CHATBOT_TEMPERATURE=0.7
```

---

## Test Scenarios

### Scenario 1: Student User Testing

**Objective:** Verify student-specific context and responses

**Steps:**

1. **Login as Student**
   - Navigate to: `http://localhost:3000/login`
   - Email: (any registered student email)
   - Password: (student password)
   - ✅ Check: Successfully logged in

2. **Open Chatbot**
   - Locate floating chat button (bottom-right corner)
   - ✅ Check: Button visible with chat icon
   - Click the button
   - ✅ Check: Modal dialog opens with MotherDuck-inspired design

3. **Verify Welcome Message**
   - ✅ Check: Welcome message displays: "Hello! How can I help you today?"
   - ✅ Check: Input field is empty and focused
   - ✅ Check: Send button is visible

4. **Test Questions**

   **Question 1: "What classes am I enrolled in?"**
   - Type the question
   - Click Send (or press Enter)
   - ✅ Check: Loading spinner appears
   - ✅ Check: User message appears in chat
   - ✅ Check: AI response mentions student's enrolled classes
   - ✅ Check: Response is contextually relevant to student

   **Question 2: "How do I submit an assignment?"**
   - Type the question
   - ✅ Check: AI provides instructions about assignment submission
   - ✅ Check: Response references student context

   **Question 3: "What's my grade in [class name]?"**
   - Replace [class name] with actual enrolled class
   - ✅ Check: AI responds with grade information or asks for clarification

5. **Test UI Behavior**
   - ✅ Check: Input clears after sending
   - ✅ Check: Timestamps appear on messages
   - ✅ Check: Scroll behavior works (auto-scrolls to bottom)
   - ✅ Check: Messages format correctly (user vs AI differentiation)

6. **Test Error Scenarios**
   - Send empty message
   - ✅ Check: Send button should be disabled OR message not sent

   - Send very long message (>1000 characters)
   - ✅ Check: Validation error OR message truncated

7. **Close Chatbot**
   - Click X button or outside modal
   - ✅ Check: Dialog closes
   - ✅ Check: Floating button remains visible

---

### Scenario 2: Teacher User Testing

**Objective:** Verify teacher-specific context and responses

**Steps:**

1. **Login as Teacher**
   - Logout from student account
   - Login with teacher credentials
   - ✅ Check: Successfully logged in as teacher

2. **Open Chatbot**
   - Click floating chat button
   - ✅ Check: Dialog opens

3. **Test Questions**

   **Question 1: "What classes do I teach?"**
   - ✅ Check: AI lists teacher's classes
   - ✅ Check: Context includes teaching assignments

   **Question 2: "How do I grade an assignment?"**
   - ✅ Check: AI provides grading instructions
   - ✅ Check: Response is teacher-focused

   **Question 3: "How many students are in my [class name] class?"**
   - ✅ Check: AI responds with student count or relevant info

4. **Verify Teacher Context**
   - ✅ Check: Responses reference teaching role
   - ✅ Check: No student-specific information appears
   - ✅ Check: Context awareness is correct

---

### Scenario 3: Admin User Testing

**Objective:** Verify admin-specific context and responses

**Steps:**

1. **Login as Admin**
   - Logout and login with admin credentials
   - ✅ Check: Successfully logged in as admin

2. **Open Chatbot**
   - Click floating chat button
   - ✅ Check: Dialog opens

3. **Test Questions**

   **Question 1: "How many users are in the system?"**
   - ✅ Check: AI provides system statistics
   - ✅ Check: Response includes user counts

   **Question 2: "How do I create a new teacher?"**
   - ✅ Check: AI explains admin user creation process
   - ✅ Check: Response is admin-focused

   **Question 3: "Show me system statistics"**
   - ✅ Check: AI provides overview of system data
   - ✅ Check: Context includes admin privileges

4. **Verify Admin Context**
   - ✅ Check: Responses reference admin role
   - ✅ Check: System-level information provided
   - ✅ Check: No confusion with student/teacher roles

---

### Scenario 4: Unauthenticated User Testing

**Objective:** Verify authentication protection

**Steps:**

1. **Logout from all accounts**
   - Click logout button
   - ✅ Check: Redirected to login page

2. **Attempt to use chatbot**
   - Try to access chatbot (if visible)
   - ✅ Check: Either chatbot hidden OR displays auth error
   - ✅ Check: No API calls succeed without auth

---

### Scenario 5: Edge Cases & Error Handling

**Objective:** Test error scenarios and edge cases

**Test Cases:**

1. **Empty Message**
   - Try to send empty/whitespace-only message
   - ✅ Check: Button disabled OR validation error

2. **Very Long Message**
   - Send message >1000 characters
   - ✅ Check: Validation error displayed
   - ✅ Check: Error message is clear

3. **Special Characters**
   - Send: "Hello!@#$%^&*()"
   - ✅ Check: Message processes correctly

4. **Multilingual Input**
   - Send: "你好 مرحبا Hello"
   - ✅ Check: Unicode handled correctly

5. **Multiline Message**
   - Type message with Shift+Enter for newlines
   - ✅ Check: Newlines preserved
   - ✅ Check: Enter key alone sends message

6. **Network Error Simulation**
   - Stop backend server during chat
   - Send message
   - ✅ Check: Error message displays
   - ✅ Check: UI remains functional

7. **Session Expiry**
   - Wait for token to expire (or manually expire)
   - Send message
   - ✅ Check: 401 error handled gracefully
   - ✅ Check: User prompted to re-authenticate

---

### Scenario 6: UI/UX Testing

**Objective:** Verify design and usability

**Design Checks:**

1. **MotherDuck-Inspired Design**
   - ✅ Check: Clean, modern interface
   - ✅ Check: Proper color scheme (brand colors)
   - ✅ Check: Icons are clear and recognizable

2. **Responsive Design**
   - Test on different screen sizes:
     - Desktop (1920x1080)
     - Tablet (768x1024)
     - Mobile (375x667)
   - ✅ Check: Dialog adapts to screen size
   - ✅ Check: Text is readable on all devices
   - ✅ Check: Floating button positioned correctly

3. **Loading States**
   - Send message and observe loading
   - ✅ Check: Loading spinner appears immediately
   - ✅ Check: Input/button disabled during loading
   - ✅ Check: No UI jank or layout shift

4. **Message Display**
   - ✅ Check: User messages aligned right
   - ✅ Check: AI messages aligned left
   - ✅ Check: Different background colors for user/AI
   - ✅ Check: Timestamps formatted correctly
   - ✅ Check: Text wraps properly

5. **Scroll Behavior**
   - Send multiple messages (>10)
   - ✅ Check: Auto-scrolls to latest message
   - ✅ Check: Scroll bar appears when needed
   - ✅ Check: Manual scroll works correctly

6. **Accessibility**
   - Test keyboard navigation
   - ✅ Check: Tab order is logical
   - ✅ Check: Enter key sends message
   - ✅ Check: Escape key closes dialog
   - ✅ Check: Focus indicators visible

---

## Performance Testing

### Response Time

1. **Measure API Response**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Send chatbot message
   - ✅ Check: `/api/v0/chatbot/chat` appears
   - ✅ Check: Response time <3 seconds (OpenAI dependent)
   - ✅ Check: No console errors

2. **UI Responsiveness**
   - ✅ Check: No lag when typing
   - ✅ Check: Smooth animations
   - ✅ Check: No memory leaks (check DevTools Memory)

---

## Browser Compatibility

Test in multiple browsers:

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

For each browser:
- ✅ Check: Chatbot opens correctly
- ✅ Check: Messages send/receive
- ✅ Check: No console errors
- ✅ Check: Styling consistent

---

## Issue Reporting Template

If you find issues, document them with:

```markdown
**Issue:** [Brief description]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]

**Expected Behavior:** [What should happen]
**Actual Behavior:** [What actually happened]
**User Role:** [Student/Teacher/Admin]
**Browser:** [Chrome 120.0]
**Screenshot:** [If applicable]
**Console Errors:** [From DevTools]
```

---

## Success Criteria

✅ **Pass Criteria:**
- All 3 user roles work correctly
- Context awareness verified for each role
- Error handling works properly
- UI is responsive and accessible
- No console errors in normal usage
- Design matches MotherDuck inspiration

❌ **Fail Criteria:**
- Incorrect context for user role
- UI crashes or becomes unresponsive
- Authentication bypassed
- Critical console errors
- Data leakage between roles

---

## Quick Test Commands

```bash
# Check API is responding
curl http://localhost:3001/api/v0/health

# Check frontend is running
curl http://localhost:3000

# View backend logs
cd apps/api && npm run dev

# View frontend logs
cd apps/frontend && npm run dev

# Check database connection
docker exec concentrate-quiz-db pg_isready -U postgres
```

---

## Test Results Template

After testing, fill out:

| Scenario | Student | Teacher | Admin | Notes |
|----------|---------|---------|-------|-------|
| Open chatbot | ☐ Pass | ☐ Pass | ☐ Pass | |
| Send message | ☐ Pass | ☐ Pass | ☐ Pass | |
| Correct context | ☐ Pass | ☐ Pass | ☐ Pass | |
| Error handling | ☐ Pass | ☐ Pass | ☐ Pass | |
| UI responsive | ☐ Pass | ☐ Pass | ☐ Pass | |

**Overall Status:** ☐ Pass / ☐ Fail

**Tested By:** ________________
**Date:** November 6, 2025
**Environment:** Development

---

## Next Steps After Testing

1. **If all tests pass:**
   - Document results
   - Prepare for production deployment
   - Update CHATBOT_TESTING_LOG.md with manual results

2. **If issues found:**
   - Document each issue
   - Prioritize by severity
   - Create fix plan
   - Re-test after fixes

---

**Happy Testing! 🧪**
