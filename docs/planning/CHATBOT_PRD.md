# Chatbot Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2025-11-06
**Status:** Approved for Implementation
**Project:** School Portal Platform Chatbot (Extra Credit Feature)

---

## 1. Product Requirements Document

### 1.1 Overview

The School Portal Platform Chatbot is a context-aware AI assistant designed to help users (students, teachers, and administrators) navigate and understand the platform's features. The chatbot leverages OpenAI's GPT-4o-mini model to provide instant, intelligent responses to user questions while maintaining full awareness of the user's role, permissions, and current context within the system.

**Primary Objectives:**
- Reduce user friction by providing instant answers to common questions
- Improve user onboarding experience
- Decrease support burden by handling routine inquiries
- Demonstrate advanced technical capabilities for hiring assessment

**Scope:**
This is a minimal viable product (MVP) implementation focused on core functionality:
- Real-time chat interface accessible to authenticated users
- Context-aware responses based on user role and data
- Stateless operation (no conversation history storage)
- Full integration with existing authentication system

**Out of Scope for MVP:**
- Conversation history persistence (keeping it simple)
- Multi-turn conversation memory
- Advanced RAG (Retrieval-Augmented Generation) with vector search
- Function calling / tool use capabilities
- Admin analytics dashboard for chat metrics
- Database storage of messages

---

### 1.2 Technical Stack

| Component | Technology | Version/Details |
|-----------|-----------|-----------------|
| **LLM Provider** | OpenAI GPT-4o-mini | Via official `openai` npm package |
| **Backend API** | Fastify | Existing service integration |
| **Frontend Framework** | Next.js 15 | App Router architecture |
| **UI Components** | Radix UI | Dialog, ScrollArea, Input components |
| **State Management** | React State | Simple useState for message display |
| **Validation** | Zod | Request/response schemas |
| **Testing** | Vitest | Mocked OpenAI API for deterministic tests |
| **Authentication** | JWT + Google OAuth | Existing `requireAuth` middleware |

**New Dependencies Required:**
- `openai` (Official OpenAI Node.js SDK)

**Note:** Database not used for chatbot - keeping it stateless and simple

---

### 1.3 Features

#### Feature 1: Chat API Endpoint
**Mapped to SPECS.md:** Lines 36-41 (Extra Credit - "API calls to LLM provider with app-level context")

**Description:**
A secure, authenticated REST API endpoint that accepts user messages and returns AI-generated responses.

**Technical Specifications:**
- **Endpoint:** `POST /api/v0/chatbot/chat`
- **Authentication:** Protected by existing `requireAuth` middleware
- **Request Schema:**
  ```typescript
  {
    message: string;           // User's message (1-1000 characters)
  }
  ```
- **Response Schema:**
  ```typescript
  {
    response: string;          // AI-generated response
    timestamp: Date;           // Server timestamp
  }
  ```

**Implementation Details:**
1. Extract authenticated user from `request.user` (populated by `requireAuth`)
2. Fetch user context from database (role, name, enrolled classes)
3. Construct system prompt with user-specific context
4. Call OpenAI API with GPT-4o-mini model
5. Return response to client

**Note:** Stateless design - no conversation history stored

---

#### Feature 2: App-Level Context Awareness
**Mapped to SPECS.md:** Lines 36-41 (Extra Credit - "app-level context")

**Description:**
The chatbot understands who the user is, their role, and their relationship to the platform, enabling personalized and relevant responses.

**Context Information Included:**
1. **User Identity:**
   - Full name
   - Email address
   - User role (student, teacher, admin)

2. **Role-Specific Context:**
   - **Students:** Enrolled classes, assignment count, recent grades
   - **Teachers:** Taught classes, student count, pending submissions
   - **Admins:** System-wide statistics, user counts

3. **Platform Knowledge:**
   - Available features per role
   - Navigation instructions
   - Common workflows (assignment submission, grading, etc.)

**System Prompt Template:**
```typescript
const systemPrompt = `You are a helpful assistant for the School Portal Platform.

User Information:
- Name: ${user.name}
- Role: ${user.role}
- Email: ${user.email}

${getRoleSpecificContext(user)}

You can help users with:
- Understanding how to use platform features
- Navigating the interface
- Answering questions about assignments, classes, and grading
- Explaining role-specific capabilities

Always provide clear, concise, and helpful responses. If you don't know something, direct users to contact support.`;
```

---

#### Feature 3: Basic Question Answering
**Mapped to SPECS.md:** Lines 36-41 (Extra Credit - "Should be able to answer basic questions")

**Description:**
The chatbot can answer common user questions about platform functionality without requiring human intervention.

**Example Questions by Role:**

**Students:**
- "How do I submit an assignment?"
- "Where can I see my grades?"
- "What classes am I enrolled in?"
- "When is my next assignment due?"

**Teachers:**
- "How do I create a new assignment?"
- "How do I grade student submissions?"
- "How do I add students to my class?"
- "Where can I see assignment statistics?"

**Admins:**
- "How do I create a new teacher account?"
- "How do I suspend a student?"
- "Where can I view school-wide statistics?"
- "How do I manage user groups?"

**Response Quality Standards:**
- Accurate information based on platform features
- Clear step-by-step instructions when appropriate
- Friendly, professional tone
- Acknowledgment when question is outside chatbot's knowledge

---

#### Feature 4: Floating Chat Widget (Frontend)
**Mapped to SPECS.md:** Lines 36-41 (Extra Credit - User interface requirement implied)

**Description:**
A non-intrusive, always-accessible chat interface that appears as a floating button on all authenticated pages.

**UI Components:**
1. **Floating Button:**
   - Position: Fixed bottom-right corner
   - Icon: Message bubble or chat icon
   - Badge: Shows unread message count (future)
   - Visibility: Only when user is authenticated

2. **Chat Modal (Radix UI Dialog):**
   - Width: 400px on desktop, full-screen on mobile
   - Height: 600px max on desktop
   - Header: "Platform Assistant" with close button
   - Message list: Scrollable area with user/bot messages
   - Input field: Text input with send button
   - Loading state: Spinner when awaiting response

3. **Message Display:**
   - User messages: Right-aligned, blue background
   - Bot messages: Left-aligned, gray background
   - Timestamps: Shown on hover
   - Markdown support: Basic formatting (bold, links)

**State Management:**
- Use React useState to display current conversation
- Messages cleared on page navigation (keeping it simple)
- No persistence between sessions

**Note:** Simplified approach - no conversation history stored anywhere

---

### 1.4 Assumptions and Constraints

#### Assumptions
1. **OpenAI API Availability:** The OpenAI API is available and reliable for production use
2. **Token Budget:** 500 tokens per response is sufficient for basic questions
3. **User Behavior:** Users will ask questions within the platform's domain (not general queries)
4. **Stateless Design:** Users don't need conversation history for basic Q&A
5. **Network Reliability:** Users have stable internet connections for real-time chat

#### Technical Constraints
1. **Test Coverage:** Must maintain 90%+ test coverage (100% aspirational)
2. **Type Safety:** No `any` types allowed (ESLint enforced)
3. **Dependencies:** Can only use dependencies listed in `package.json` + Radix UI components
4. **OAuth Isolation:** Chatbot code must not interfere with existing Google OAuth authentication
5. **Token Limits:** Maximum 500 tokens per response (configured in environment)
6. **Rate Limiting:** No custom rate limiting for MVP - rely on OpenAI's limits

#### Operational Constraints
1. **API Costs:** OpenAI API usage will incur costs based on token consumption
2. **Deployment:** Must be containerized and deployable via Docker Compose
3. **Production Stability:** Cannot break existing OAuth authentication (Session 43 lesson)
4. **Backwards Compatibility:** Must work with existing user data and authentication

---

### 1.5 Acceptance Criteria

Each criterion is mapped to specific requirements in SPECS.md (Extra Credit section, lines 36-41).

#### AC-1: LLM API Integration (SPECS.md Lines 36-41)
- [ ] Chatbot makes successful API calls to OpenAI GPT-4o-mini
- [ ] API calls complete within 5 seconds (95th percentile)
- [ ] Graceful error handling for API failures (429, 5xx errors)
- [ ] All OpenAI responses are logged to database
- [ ] Token usage is tracked and recorded

**Verification:** Integration test showing successful OpenAI API call with mocked response

---

#### AC-2: App-Level Context Awareness (SPECS.md Lines 36-41)
- [ ] System prompt includes user name, role, and email
- [ ] Role-specific context is fetched from database dynamically
- [ ] Students see context about their enrolled classes
- [ ] Teachers see context about their taught classes
- [ ] Admins see system-wide context
- [ ] Context is refreshed on each API call

**Verification:** Unit test showing system prompt construction with different user roles

---

#### AC-3: Basic Question Answering (SPECS.md Lines 36-41)
- [ ] Chatbot correctly answers "How do I submit an assignment?" (student)
- [ ] Chatbot correctly answers "How do I grade submissions?" (teacher)
- [ ] Chatbot correctly answers "How do I create a user?" (admin)
- [ ] Chatbot provides helpful responses for out-of-scope questions
- [ ] Response quality is consistent across roles

**Verification:** End-to-end test with predefined questions and expected response patterns

---

#### AC-4: Authentication and Security
- [ ] Chat endpoint is protected by existing `requireAuth` middleware
- [ ] Unauthenticated requests return 401 Unauthorized
- [ ] User can only access their own chat history
- [ ] OAuth authentication remains functional after chatbot deployment
- [ ] No security vulnerabilities introduced (XSS, injection, etc.)

**Verification:** Security test suite with unauthorized access attempts

---

#### AC-5: Frontend User Interface
- [ ] Floating chat button appears on all authenticated pages
- [ ] Chat modal opens when button is clicked
- [ ] Messages are displayed in chronological order
- [ ] User input is validated (1-1000 characters)
- [ ] Loading state is shown during API calls
- [ ] Error messages are user-friendly
- [ ] Chat history persists across page navigation

**Verification:** Component tests for Chatbot.tsx with user interaction scenarios

---

#### AC-6: Testing and Quality
- [ ] Test coverage is 90% or higher for chatbot code
- [ ] All OpenAI API calls are mocked in tests
- [ ] Integration tests cover happy path and error scenarios
- [ ] No `any` types in TypeScript code (ESLint enforced)
- [ ] All tests pass in CI/CD pipeline

**Verification:** Coverage report showing 90%+ for chatbot service and route

---

#### AC-7: Production Deployment
- [ ] Chatbot is accessible at https://coolstudentportal.online
- [ ] Environment variables are correctly configured
- [ ] Docker container builds successfully
- [ ] No production errors in Sentry logs
- [ ] OAuth authentication still works in production

**Verification:** Manual smoke test in production environment

---

## 2. AI Model Insights (Zen MCP Consensus)

### 2.1 Gemini 2.5 Pro Analysis (Confidence: 9/10)

#### Key Recommendations

**1. Architecture Decision: Integrated vs. Separate Service**
- **Recommendation:** Integrate chatbot into existing Fastify API
- **Rationale:**
  - Avoids operational overhead of separate microservice
  - Shares existing infrastructure (auth, database, deployment)
  - Simpler for MVP with fewer moving parts
  - Easier to maintain and debug

**2. OAuth Isolation Strategy**
- **Recommendation:** Reuse existing `requireAuth` middleware
- **Rationale:**
  - Previous OAuth failure likely due to middleware misconfiguration
  - Creating separate auth flow increases complexity and risk
  - Standard protected endpoint pattern is proven and safe
  - Place chatbot code in dedicated `src/modules/chatbot/` directory

**3. Context Injection Approach**
- **Recommendation:** Fetch user context dynamically from database on each request
- **Rationale:**
  - Ensures context is always current (enrollment changes, role updates)
  - Slight performance overhead is acceptable for MVP
  - Enables personalized responses based on real-time data
  - Start with minimal context to respect 500 token limit

**4. Error Handling Strategy**
- **Recommendation:** Fail-fast approach for MVP
- **Rationale:**
  - Request queues add complexity without clear MVP benefit
  - User-friendly error messages for 429 (rate limit) and 5xx errors
  - Future iterations can add retry logic and queuing
  - Simple is better for initial release

**5. Conversation History**
- **Recommendation:** Persist all messages in PostgreSQL from day one
- **Rationale:**
  - Enables future features (conversation continuity, analytics)
  - Provides debugging and quality assurance data
  - Minimal implementation cost (single table)
  - Critical for long-term product evolution

**6. Testing Strategy**
- **Recommendation:** Mock OpenAI API client entirely using `vitest.mock`
- **Rationale:**
  - Fast, deterministic tests without API costs
  - Enables 90%+ coverage of application logic
  - Tests run offline without external dependencies
  - Production OpenAI integration tested manually

**7. Frontend Implementation**
- **Recommendation:** Floating chat widget with Radix UI components
- **Components:** `Dialog`, `ScrollArea`, `Input`
- **State Management:** Zustand for client-side message persistence
- **Rationale:**
  - Non-intrusive UI pattern (doesn't block main content)
  - Accessible on all pages when authenticated
  - Radix UI provides accessible, customizable components
  - Zustand is lightweight and integrates well with React

---

### 2.2 GPT-5-Pro Analysis

**Status:** API authentication error encountered during consensus gathering.

**Note:** Due to API key issues with the Zen MCP GPT-5-Pro provider, we proceeded with Gemini 2.5 Pro's analysis alone. The recommendations provided are comprehensive and align with industry best practices.

---

### 2.3 Consensus Summary

**High Agreement Areas:**
- Integrate chatbot into existing Fastify API (not separate service)
- Reuse existing authentication middleware for OAuth safety
- Persist conversation history in database
- Mock external APIs in tests for coverage and reliability
- Use fail-fast error handling for MVP

**Confidence Level:** High (9/10)

**Primary Risk:** Previous OAuth failure root cause unknown, but isolation strategy should prevent recurrence.

---

## 3. Implementation Plan

### 3.1 File Structure

```
packages/services/src/
└── ChatbotService.ts                # Simple stateless ChatbotService

apps/api/src/routes/
└── chatbot.ts                       # Chatbot route (POST /api/v0/chatbot/chat)

apps/api/tests/routes/
└── chatbot.test.ts                  # Integration tests for chatbot route

apps/frontend/components/
└── Chatbot.tsx                      # Simple chat component with useState

packages/types/
└── chatbot.ts                       # Shared TypeScript types (optional)
```

**Note:** Simplified structure - no database models, no separate stores, no complex file organization

---

### 3.2 Backend Implementation Priority

**Phase 1: Core Service (30-60 min)**
1. Install `openai` npm package ✅
2. Create `ChatbotService` class in `packages/services/src/ChatbotService.ts`
3. Implement user context fetching from database
4. Implement system prompt construction
5. Implement OpenAI API integration (stateless)

**Phase 2: API Route (30 min)**
1. Create Zod schemas for request/response validation
2. Implement `POST /api/v0/chatbot/chat` route
3. Integrate with `requireAuth` middleware
4. Add error handling for OpenAI API failures

**Phase 3: Testing (30-45 min)**
1. Create mock OpenAI client with `vitest.mock`
2. Write unit tests for `ChatbotService`
3. Write integration tests for API route
4. Verify 90%+ coverage with `npm run coverage`

---

### 3.3 Frontend Implementation Priority

**Phase 1: Simple Chat Component (1 hour)**
1. Create `Chatbot.tsx` component with React useState
2. Implement floating button UI
3. Implement simple message display
4. Add loading states and error handling

**Phase 2: Integration (15 min)**
1. Connect to `/api/v0/chatbot/chat` endpoint
2. Handle authentication errors (redirect to login)
3. Display loading states and error messages

**Phase 3: Testing (30 min)**
1. Write component tests for `Chatbot.tsx`
2. Mock API responses
3. Test user interactions (send message, close dialog)
4. Test error scenarios (network failure, validation errors)

---

### 3.4 Implementation Order (Simplified)

```
1. Backend Service (30-60 min)
   ├─> Create simple ChatbotService ✅ openai installed
   └─> Create chatbot route

2. Backend Testing (30-45 min)
   ├─> Mock OpenAI API
   └─> Write integration tests

3. Frontend Component (1 hour)
   ├─> Create simple Chatbot.tsx with useState
   └─> Integrate with backend API

4. Frontend Testing (30 min)
   └─> Write component tests

5. End-to-End Testing (15 min)
   └─> Manual testing in all three roles

6. Documentation (30-45 min)
   ├─> Create Testing Log
   └─> Create Compliance Summary

Total Estimated Time: 3-4 hours (simplified!)
```

---

## 4. Testing and Verification Strategy

### 4.1 Unit Testing

**ChatbotService Tests:**
```typescript
describe('ChatbotService', () => {
  it('should construct system prompt with user context', async () => {
    const service = new ChatbotService(mockDb);
    const prompt = await service.buildSystemPrompt(mockUser);
    expect(prompt).toContain(mockUser.name);
    expect(prompt).toContain(mockUser.role);
  });

  it('should call OpenAI API with correct parameters', async () => {
    const service = new ChatbotService(mockDb);
    await service.chat(mockUser.id, 'Hello');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      messages: expect.any(Array),
      max_tokens: 500,
      temperature: 0.7,
    });
  });

  it('should persist conversation to database', async () => {
    const service = new ChatbotService(mockDb);
    await service.chat(mockUser.id, 'Hello');
    expect(mockDb.insertInto).toHaveBeenCalledWith('chat_messages');
  });
});
```

**Target Coverage:** 90%+ for all service methods

---

### 4.2 Integration Testing

**Chatbot Route Tests:**
```typescript
describe('POST /api/v0/chatbot/chat', () => {
  it('should return 401 for unauthenticated requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v0/chatbot/chat',
      payload: { message: 'Hello' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return chatbot response for authenticated user', async () => {
    const { cookies } = await loginAsStudent(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v0/chatbot/chat',
      payload: { message: 'How do I submit an assignment?' },
      cookies,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('response');
    expect(response.json()).toHaveProperty('conversationId');
  });

  it('should handle OpenAI API errors gracefully', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(
      new Error('Rate limit exceeded')
    );
    const { cookies } = await loginAsStudent(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v0/chatbot/chat',
      payload: { message: 'Hello' },
      cookies,
    });
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toContain('chatbot');
  });
});
```

**Target Coverage:** 100% of API routes

---

### 4.3 Component Testing

**Chatbot Component Tests:**
```typescript
describe('Chatbot Component', () => {
  it('should render floating chat button', () => {
    render(<Chatbot />);
    expect(screen.getByLabelText('Open chat')).toBeInTheDocument();
  });

  it('should open dialog when button is clicked', async () => {
    render(<Chatbot />);
    await userEvent.click(screen.getByLabelText('Open chat'));
    expect(screen.getByText('Platform Assistant')).toBeInTheDocument();
  });

  it('should send message when form is submitted', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Hello!', conversationId: 'abc' }),
    });
    global.fetch = mockFetch;

    render(<Chatbot />);
    await userEvent.click(screen.getByLabelText('Open chat'));
    await userEvent.type(screen.getByPlaceholderText('Type a message...'), 'Hello');
    await userEvent.click(screen.getByText('Send'));

    expect(mockFetch).toHaveBeenCalledWith('/api/v0/chatbot/chat', expect.any(Object));
  });
});
```

**Target Coverage:** 90%+ for UI components

---

### 4.4 End-to-End Testing

**Manual Testing Checklist:**
1. [ ] Login as student, ask "How do I submit an assignment?"
2. [ ] Login as teacher, ask "How do I grade submissions?"
3. [ ] Login as admin, ask "How do I create a user?"
4. [ ] Test chat persistence across page navigation
5. [ ] Test error handling (disconnect internet, send message)
6. [ ] Verify OAuth login still works after chatbot deployment
7. [ ] Test in production environment

---

## 5. Risk Assessment and Mitigation

### 5.1 Critical Risks

#### Risk 1: OAuth Authentication Breakage (HIGH)
**Description:** Previous chatbot implementation broke Google OAuth authentication in Session 43.

**Likelihood:** Medium
**Impact:** Critical (prevents all user access)

**Mitigation Strategies:**
1. **Isolation:** Place all chatbot code in dedicated `modules/chatbot/` directory
2. **Reuse Middleware:** Use existing `requireAuth` middleware without modifications
3. **No Auth Changes:** Never modify `auth.ts`, `app.ts`, or OAuth routes
4. **Testing:** Verify OAuth login after every chatbot code change
5. **Rollback Plan:** Keep Session 43 revert commits as reference

**Success Criteria:** OAuth authentication remains functional in production after deployment

---

#### Risk 2: OpenAI API Rate Limiting (MEDIUM)
**Description:** OpenAI enforces rate limits that could affect user experience.

**Likelihood:** Medium
**Impact:** Medium (degraded UX but not broken)

**Mitigation Strategies:**
1. **Model Selection:** Use `gpt-4o-mini` (higher rate limits than GPT-4)
2. **Token Limits:** Set `max_tokens: 500` to reduce API load
3. **Error Handling:** Return user-friendly message on 429 errors
4. **Future:** Implement request queue and retry logic (post-MVP)

**Success Criteria:** Users see clear error message during rate limiting, can retry

---

#### Risk 3: Test Coverage Below 90% (MEDIUM)
**Description:** Complex async logic with external API calls may be hard to test.

**Likelihood:** Low (with proper mocking)
**Impact:** High (CI/CD pipeline failure)

**Mitigation Strategies:**
1. **Mock Early:** Mock OpenAI API from the start using `vitest.mock`
2. **Test-Driven:** Write tests concurrently with implementation
3. **Coverage Monitoring:** Run `npm run coverage` frequently
4. **Edge Cases:** Test all error paths (API failures, validation errors)

**Success Criteria:** Coverage report shows 90%+ for all chatbot code

---

#### Risk 4: Token Budget Overruns (LOW)
**Description:** User context injection consumes too many tokens, leaving insufficient space for responses.

**Likelihood:** Low
**Impact:** Medium (poor response quality)

**Mitigation Strategies:**
1. **Minimal Context:** Start with only essential context (name, role, email)
2. **Token Monitoring:** Log token usage in database metadata
3. **Context Prioritization:** Add more context only if 500 token budget allows
4. **Testing:** Verify responses are complete and helpful in manual tests

**Success Criteria:** All test responses are complete and under 500 tokens

---

### 5.2 Non-Critical Risks

#### Risk 5: OpenAI API Cost Overruns (LOW)
**Mitigation:** Use `gpt-4o-mini` (cheapest model), set token limits, monitor usage in OpenAI dashboard

#### Risk 6: Poor Response Quality (LOW)
**Mitigation:** Iterate on system prompt based on manual testing, add example Q&A to prompt

#### Risk 7: Zustand State Management Complexity (LOW)
**Mitigation:** Can fall back to React state if Zustand adds complexity, not required for MVP

---

## 6. Success Metrics

### 6.1 Technical Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Test Coverage | ≥90% | `npm run coverage` report |
| API Response Time | <5s (p95) | OpenAI metadata in database |
| Error Rate | <5% | Sentry logs, API response status |
| OAuth Stability | 100% | Manual testing, production monitoring |
| TypeScript Strictness | 0 `any` types | ESLint check (enforced) |

### 6.2 User Experience Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| First Response Time | <3s | Frontend stopwatch measurement |
| Chat Widget Accessibility | 100% | WCAG accessibility audit |
| Mobile Responsiveness | Full-screen on mobile | Manual testing on iOS/Android |
| Cross-Page Persistence | 100% | Manual navigation tests |

### 6.3 Business Metrics (Future)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User Engagement | 20% of users try chat in first week | Analytics (post-MVP) |
| Question Resolution | 70% of questions answered satisfactorily | User feedback survey (post-MVP) |
| Support Ticket Reduction | 10% decrease | Support ticket volume (post-MVP) |

---

## 7. Deployment Checklist

### 7.1 Pre-Deployment
- [ ] All tests passing (`npm run test`)
- [ ] Test coverage ≥90% (`npm run coverage`)
- [ ] Lint check passing (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] OAuth authentication verified locally
- [ ] Manual testing completed in all three roles
- [ ] Database migration tested in development

### 7.2 Deployment
- [ ] Environment variables configured in production `.env`
- [ ] Database migration executed in production
- [ ] Docker container built successfully
- [ ] Docker Compose deployment succeeds
- [ ] Nginx configuration updated (if needed)
- [ ] SSL certificates valid

### 7.3 Post-Deployment Verification
- [ ] Chatbot accessible at https://coolstudentportal.online
- [ ] OAuth login works (test with Google account)
- [ ] Chat widget visible when authenticated
- [ ] Send test message, verify response
- [ ] Check Sentry for errors (expect 0 chatbot errors)
- [ ] Monitor OpenAI API usage in dashboard

---

## 8. Future Enhancements (Post-MVP)

### 8.1 Short-Term (Next 2-4 Weeks)
1. **Conversation Memory:** Multi-turn context retention within same session
2. **Analytics Dashboard:** Admin view of chat metrics and common questions
3. **Response Feedback:** Thumbs up/down for response quality tracking
4. **Custom System Prompts:** Role-specific prompt customization

### 8.2 Medium-Term (1-3 Months)
1. **RAG Integration:** Vector search over documentation and FAQs
2. **Function Calling:** Direct actions via chat ("Create assignment: Math Quiz")
3. **Multi-Language Support:** i18n for Spanish, French, Chinese
4. **Voice Input:** Speech-to-text for accessibility

### 8.3 Long-Term (3-6 Months)
1. **Proactive Suggestions:** "You have 3 assignments due this week"
2. **Advanced Analytics:** Sentiment analysis, topic clustering
3. **Custom Training:** Fine-tune model on platform-specific data
4. **Integration with LMS:** Sync with Canvas, Blackboard, etc.

---

## 9. Appendices

### 9.1 Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...                  # OpenAI API key
CHATBOT_MODEL=gpt-4o-mini                   # Model to use
CHATBOT_MAX_TOKENS=500                      # Max response length
CHATBOT_TEMPERATURE=0.7                     # Response creativity (0-1)
```

### 9.2 API Error Codes

| Status Code | Error Type | User Message |
|-------------|-----------|--------------|
| 401 | Unauthorized | "Please log in to use the chatbot" |
| 400 | Validation Error | "Message must be 1-1000 characters" |
| 429 | Rate Limited | "Too many requests. Please try again in a moment." |
| 500 | OpenAI API Error | "Chatbot is temporarily unavailable. Please try again." |
| 503 | Service Unavailable | "Service is currently down for maintenance." |

### 9.3 System Prompt Examples

**Student Context:**
```
You are a helpful assistant for the School Portal Platform.

User Information:
- Name: Jane Doe
- Role: Student
- Email: jane@example.com

Current Enrollment:
- Math 101 (Ms. Smith)
- English 201 (Mr. Johnson)
- Science 301 (Dr. Lee)

You can help students with:
- Submitting assignments
- Viewing grades and feedback
- Understanding class schedules
- Navigating the platform
```

**Teacher Context:**
```
You are a helpful assistant for the School Portal Platform.

User Information:
- Name: John Smith
- Role: Teacher
- Email: john.smith@example.com

Classes You Teach:
- Math 101 (25 students, 3 pending submissions)
- Math 102 (18 students, 0 pending submissions)

You can help teachers with:
- Creating and managing assignments
- Grading student submissions
- Managing class rosters
- Viewing class statistics
```

---

## 10. Approval and Sign-Off

**Document Status:** ✅ Approved for Implementation

**Approved By:** AI Consensus (Gemini 2.5 Pro)
**Date:** 2025-11-06
**Confidence:** 9/10

**Next Steps:**
1. Begin Phase 1: Database migration and backend service implementation
2. Follow implementation plan priority order
3. Maintain 90%+ test coverage throughout development
4. Create Testing Log and Compliance Summary during implementation

---

**Document Version History:**
- v1.0 (2025-11-06): Initial PRD created with AI consensus insights
