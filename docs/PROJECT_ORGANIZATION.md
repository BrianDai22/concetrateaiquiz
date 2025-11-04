# Project Organization Guide

**Last Updated:** Session 13 - 2025-11-04

## Directory Structure

```
concentrateaiproject/
├── .github/                    # (Future) CI/CD workflows
├── .claude/                    # Claude Code configuration
├── apps/                       # Application code
│   └── api/                   # Fastify API (COMPLETE)
│       ├── src/               # Source code
│       ├── tests/             # Test files
│       └── coverage/          # Test coverage (gitignored)
├── packages/                   # Shared packages
│   ├── database/              # Kysely ORM + repositories
│   ├── services/              # Business logic
│   ├── shared/                # Shared utilities
│   └── validation/            # Zod schemas
├── docs/                       # 📚 Documentation hub
│   ├── sessions/              # Development session notes
│   ├── reviews/               # Code review documents
│   ├── planning/              # Specifications + compliance
│   └── README.md              # Documentation index
├── dev/                        # Active development docs
│   └── active/                # Current session working docs
├── test/                       # Global test configuration
├── coverage/                   # Root coverage (gitignored)
├── .gitignore                  # Git ignore rules
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── .prettierignore             # Prettier ignore rules
├── CLAUDE.md                   # AI assistant instructions
├── README.md                   # Main project README
├── TESTING.md                  # Testing guide
├── docker-compose.yml          # Database + Redis services
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Root test configuration
└── vitest.integration.config.ts # Integration test config
```

## File Organization Rules

### Root Directory
**Keep only:**
- Essential configuration files (`.eslintrc.json`, `.prettierrc`, etc.)
- Core project files (`package.json`, `tsconfig.json`, `docker-compose.yml`)
- Main documentation (`README.md`, `CLAUDE.md`, `TESTING.md`)
- Build configurations (`vitest.config.ts`)

**Never put in root:**
- Session notes (→ `docs/sessions/`)
- Code reviews (→ `docs/reviews/`)
- Specifications (→ `docs/planning/`)
- Build artifacts (→ gitignored)
- Coverage reports (→ gitignored)

### docs/ Directory

#### sessions/
Development session summaries and handoff documents.
- `SESSION_*.md` - Detailed session notes
- `HANDOFF*.md` - Session transition documents
- Named chronologically for easy reference

#### reviews/
Code reviews and comparative analysis.
- Repository comparisons
- Code quality reviews
- Architecture assessments

#### planning/
Project specifications and compliance tracking.
- `SPECS.md` - Complete project requirements
- `SPECS_COMPLIANCE_CHECKLIST.md` - Implementation tracking
- Feature planning documents

### dev/ Directory
Active development documentation and working notes.
- Current session working documents
- Technical planning
- Architecture decisions in progress

## Navigation Quick Reference

**Starting a new session?**
1. Read: `docs/sessions/SESSION_XX_STATUS.md` (latest)
2. Read: `README.md` (project overview)
3. Read: `TESTING.md` (how to test)

**Need specifications?**
→ `docs/planning/SPECS.md`

**Need test coverage info?**
→ `docs/sessions/SESSION_13_STATUS.md`

**Need to understand the codebase?**
→ `CLAUDE.md` (architecture + patterns)

**Need to run tests?**
→ `TESTING.md`

## Gitignore Rules

The `.gitignore` file excludes:
```gitignore
# Dependencies
node_modules/

# Coverage reports
coverage/
apps/*/coverage/
packages/*/coverage/

# Build outputs
dist/
.next/
*.tsbuildinfo
*.js.map
*.d.ts (compiled)

# Environment files
.env
.env.local
.env.*.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db
```

## Cleanup Commands

```bash
# Remove all coverage reports
rm -rf coverage apps/*/coverage packages/*/coverage

# Remove all build artifacts
find . -name "*.tsbuildinfo" -delete
find . -name "*.d.ts" -not -path "*/node_modules/*" -not -path "*/packages/*/src/*" -delete
find . -name "*.js.map" -not -path "*/node_modules/*" -delete

# Clean compiled configs (keep source .ts files)
rm -f vitest.config.js vitest.config.d.ts vitest.integration.config.js vitest.integration.config.d.ts
```

## Best Practices

1. **Session Documentation**
   - Always create `SESSION_XX_STATUS.md` at end of session
   - Include what was accomplished, what's next, and any blockers
   - Move to `docs/sessions/` immediately

2. **Code Organization**
   - Keep business logic in `packages/services/`
   - Keep data access in `packages/database/`
   - Keep validation in `packages/validation/`
   - Keep routes/controllers in `apps/api/src/routes/`

3. **Testing**
   - Always run from project root
   - Use `JWT_SECRET=test-secret` prefix
   - Generate coverage to verify quality
   - Document coverage exceptions

4. **Git Commits**
   - Don't commit coverage folders
   - Don't commit build artifacts
   - Don't commit session notes (until organized in docs/)
   - Use meaningful commit messages

## Session Workflow

1. **Start of Session**
   ```bash
   cd /Users/briandai/Documents/concentrateaiproject
   git status
   cat docs/sessions/SESSION_XX_STATUS.md  # Read latest
   ```

2. **During Session**
   - Work in appropriate directories
   - Run tests frequently
   - Document as you go

3. **End of Session**
   ```bash
   # Create status document
   vim docs/sessions/SESSION_XX_STATUS.md

   # Clean up
   rm -rf coverage apps/*/coverage

   # Commit organized changes
   git add .
   git commit -m "Session XX: [summary]"
   ```

---

**This organization was established in Session 13 to improve project cleanliness and maintainability.**
