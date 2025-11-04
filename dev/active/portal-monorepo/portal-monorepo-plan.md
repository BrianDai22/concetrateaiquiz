# Canvas-Style School Portal Platform - Development Plan

**Last Updated: 2025-11-03**

## Project Overview

Building a production-ready educational SaaS platform with monorepo architecture, integrating Zen Planner with Gemini 2.5 Pro and GPT-5-Pro.

## Technical Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS, Radix UI (MotherDuck-inspired design)
- **Backend**: Fastify, Kysely ORM, PostgreSQL 17, Redis
- **Testing**: Vitest, @testing-library/react, Supertest, Playwright
- **Infrastructure**: Docker, Nginx, GitHub Actions CI/CD
- **AI Integration**: Zen MCP tools with Gemini 2.5 Pro and GPT-5-Pro

## Constraints

1. Use ONLY dependencies from package.json (Radix/shadcn UI allowed)
2. 100% test coverage required (CI/CD enforced)
3. No `any` types allowed (ESLint enforced)
4. JWT authentication with at least one OAuth provider
5. Complete Docker containerization

## Monorepo Architecture

```
concentrateaiproject/
├── apps/
│   ├── web/                     # Next.js 15 frontend
│   │   ├── app/                 # App Router
│   │   │   ├── (auth)/          # Auth routes
│   │   │   ├── (dashboard)/      # Protected routes
│   │   │   │   ├── admin/       # Admin pages
│   │   │   │   ├── teacher/     # Teacher pages
│   │   │   │   └── student/     # Student pages
│   │   │   └── api/             # API proxy routes
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utilities
│   │   └── styles/              # Global styles
│   │
│   └── api/                     # Fastify backend
│       ├── src/
│       │   ├── routes/          # API endpoints
│       │   ├── services/        # Business logic
│       │   ├── middleware/      # Auth, validation
│       │   ├── plugins/         # Fastify plugins
│       │   └── server.ts        # Server setup
│       └── tsconfig.json
│
├── packages/
│   ├── database/                # Kysely ORM layer
│   │   ├── src/
│   │   │   ├── client.ts        # DB client
│   │   │   ├── migrations/      # SQL migrations
│   │   │   ├── schema/          # Type definitions
│   │   │   ├── repositories/    # Data access
│   │   │   └── seeds/           # Test data
│   │   └── tsconfig.json
│   │
│   ├── validation/              # Zod schemas
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   ├── class.ts
│   │   │   └── assignment.ts
│   │   └── tsconfig.json
│   │
│   ├── shared/                  # Shared types
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   └── tsconfig.json
│   │
│   └── ui/                      # Component library
│       ├── src/
│       │   ├── components/      # Radix wrappers
│       │   └── tokens/          # Design tokens
│       └── tsconfig.json
│
├── tests/                       # Test suites
├── docker/                      # Docker configs
└── .github/                     # CI/CD workflows
```

## Implementation Phases

### Phase 0: Foundation Setup (Days 1-2) ✅ IN PROGRESS
- [x] Create task tracking structure
- [ ] Initialize monorepo with npm workspaces
- [ ] Configure TypeScript with strict settings
- [ ] Set up Vitest with 100% coverage threshold
- [ ] Configure ESLint and Prettier
- [ ] Create package structure

### Phase 1: Core Infrastructure (Days 3-5)
- [ ] Build database package with Kysely
- [ ] Design and implement database schema
- [ ] Create validation package with Zod
- [ ] Implement JWT + OAuth authentication
- [ ] Set up Redis caching layer
- [ ] Build repository pattern

### Phase 2: Backend API (Days 6-10)
- [ ] Set up Fastify server with plugins
- [ ] Implement authentication middleware
- [ ] Create admin routes
- [ ] Create teacher routes
- [ ] Create student routes
- [ ] Implement public stats API
- [ ] Write API integration tests

### Phase 3: Design System (Days 11-13)
- [ ] Configure Tailwind with MotherDuck theme
- [ ] Build Radix UI component wrappers
- [ ] Create custom components
- [ ] Set up Storybook documentation
- [ ] Write component tests

### Phase 4: Frontend Application (Days 14-20) ✅ 60% COMPLETE
- [x] Set up Next.js with App Router
- [x] Implement authentication flow (password + Google OAuth)
- [x] Implement role-based routing
- [ ] Build admin dashboard (pending)
- [x] Build teacher foundation (types + API client, pages pending)
- [x] Build student portal (COMPLETE - 4 pages fully functional)
- [ ] Write E2E tests with Playwright

### Phase 5: AI Chatbot (Days 21-23)
- [ ] Integrate LLM provider
- [ ] Build chatbot service
- [ ] Create chat UI components
- [ ] Implement context awareness
- [ ] Test chatbot functionality

### Phase 6: Deployment (Days 24-26)
- [ ] Create multi-stage Dockerfile
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificates
- [ ] Build CI/CD pipeline
- [ ] Deploy to cloud platform

### Phase 7: Polish & Documentation (Days 27-30)
- [ ] Achieve 100% test coverage
- [ ] Perform security audit
- [ ] Complete all documentation
- [ ] Record demo video
- [ ] Final submission

## MotherDuck Design System

### Color Palette
```css
--color-background: #F4EFEA;    /* Warm beige */
--color-surface: #FFFFFF;       /* White */
--color-text: #383838;          /* Charcoal */
--color-primary: #6FC2FF;       /* Accent blue */
--color-primary-hover: #2BA5FF;
--color-accent: #FFDE00;        /* Yellow */
--color-accent-cyan: #53DBC9;
--color-error: #FF7169;
--color-border: #383838;
```

### Typography
```css
--font-body: 'Inter', sans-serif;
--font-heading: 'Aeonik Mono', monospace;
--font-mono: 'Aeonik Fono', monospace;
```

### Component Patterns
- 2px bold borders
- Offset shadow effects (translate 7px, -7px on hover)
- Fixed header height: 90px
- Max container width: 1302px
- Responsive breakpoints: 728px, 960px, 1302px

## AI Tool Integration Strategy

### Daily Workflow
- **Morning**: `mcp__zen__planner` (Gemini 2.5 Pro) for task planning
- **Development**: Domain-specific agents for assistance
- **Pre-commit**: `mcp__zen__precommit` (GPT-5-Pro) for validation
- **Code Review**: `mcp__zen__codereview` (GPT-5-Codex) for quality

### Agent Assignments
| Task | Agent | Purpose |
|------|-------|---------|
| Architecture | `code-architecture-reviewer` | Validate design decisions |
| Frontend Bugs | `frontend-error-fixer` | Debug React/TypeScript |
| Auth Testing | `auth-route-tester` | Test JWT endpoints |
| Documentation | `documentation-architect` | Generate docs |
| Refactoring | `refactor-planner` | Optimize code structure |

## Success Metrics

### Technical Requirements
- [ ] 100% test coverage achieved
- [ ] Zero `any` types in codebase
- [ ] All API endpoints functional
- [ ] OAuth integration working
- [ ] Docker deployment operational
- [ ] CI/CD pipeline running

### Performance Targets
- API response time < 200ms
- Frontend Lighthouse score > 90
- Time to First Byte < 600ms
- First Contentful Paint < 1.5s

### Quality Standards
- WCAG 2.1 AA compliance
- ESLint passing with no warnings
- All tests passing
- Comprehensive documentation
- Security best practices implemented

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| TypeScript monorepo complexity | Medium | Use project references, Turborepo |
| Redis session sync | Low | Sticky sessions, replication |
| Test coverage maintenance | High | Test-first development, CI gates |
| Schedule slippage | Medium | 2-day buffer, feature prioritization |
| OAuth integration issues | Medium | Start early, use proven libraries |

## Resources & Dependencies

### External Services
- PostgreSQL 17 (Docker)
- Redis (Docker)
- Google OAuth
- LLM Provider (OpenAI/Anthropic)

### Key Dependencies
- Next.js 15.0.0
- React 19.0.0
- Fastify 5.1.0
- Kysely 0.27.0
- Zod 3.24.1
- Radix UI
- TailwindCSS 3.4.17
- Vitest 2.1.8
- Playwright 1.48.0

## Notes

- Prioritize test coverage from the start
- Use Zen MCP tools strategically throughout development
- Document decisions as they're made
- Regular commits with meaningful messages
- Daily progress updates in tasks.md