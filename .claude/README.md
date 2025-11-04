# Claude Code Infrastructure

**Installed:** November 3, 2025
**Source:** [Claude Code Infrastructure Showcase](https://github.com/diet103/claude-code-infrastructure-showcase)

## Overview

Complete Claude Code infrastructure with automatic skill activation, development guidelines, specialized agents, and workflow commands.

---

## 📦 What's Installed

### 🔧 Hooks (Automation)
**Location:** `.claude/hooks/`

Auto-suggests relevant skills based on your prompts and file edits.

- Monitors keywords in prompts (backend, API, component, React, etc.)
- Watches file edits in configured paths
- Activates skills automatically when needed

### 📚 Skills (Development Guidelines)
**Location:** `.claude/skills/`

**backend-dev-guidelines** - Node.js/Express/TypeScript patterns
- 11 resource files covering architecture, routing, validation, testing
- Layered architecture: Routes → Controllers → Services → Repositories
- Complete examples and best practices

**frontend-dev-guidelines** - React/TypeScript patterns
- 10 resource files covering components, data fetching, performance
- Modern React patterns with hooks and TypeScript
- Complete examples and optimization techniques

### 🤖 Agents (Specialized Tasks)
**Location:** `.claude/agents/`

**10 specialized agents** for autonomous task handling:

1. **auto-error-resolver** - TypeScript error detection and fixing
2. **code-architecture-reviewer** - Comprehensive code reviews
3. **code-refactor-master** - Large-scale refactoring projects
4. **refactor-planner** - Strategic refactoring planning
5. **frontend-error-fixer** - Frontend bug diagnosis and fixes
6. **auth-route-tester** - Authentication endpoint testing
7. **auth-route-debugger** - Auth flow debugging
8. **documentation-architect** - Documentation creation and organization
9. **plan-reviewer** - Development plan evaluation
10. **web-research-specialist** - Internet research and debugging help

### ⚡ Slash Commands (Workflows)
**Location:** `.claude/commands/`

**/dev-docs [task]** - Create development plans
**/dev-docs-update** - Save session context
**/api-test [route]** - Test API endpoints

---

## 🚀 Quick Start

### Automatic Skill Activation

Just work naturally! Skills activate when you mention:

**Backend:** API, endpoint, route, controller, service, validation, Prisma
**Frontend:** component, React, UI, modal, dialog, form, styling

Example:
```
You: "Help me create an API endpoint for quiz submission"

🎯 SKILL ACTIVATION CHECK
📚 RECOMMENDED SKILLS:
 → backend-dev-guidelines
```

### Using Slash Commands

```bash
# Plan a feature
/dev-docs Implement user authentication system

# Test an API
/api-test /api/auth/login

# Save your work
/dev-docs-update
```

### Using Agents

Agents work autonomously on complex tasks. Just request them naturally:

```
Use the code-architecture-reviewer agent to review my authentication code
Use the auto-error-resolver agent to fix all TypeScript errors
Use the web-research-specialist agent to find solutions for this error
Use the refactor-planner agent to plan the service layer refactoring
```

---

## 📖 Resource Library

### Backend Resources (11 files, ~120 KB)
- architecture-overview.md - Layered architecture patterns
- routing-and-controllers.md - Route and controller best practices
- services-and-repositories.md - Business logic and data access
- validation-patterns.md - Input validation with Zod
- complete-examples.md - Full working code examples
- database-patterns.md - Prisma patterns
- middleware-guide.md - Middleware implementation
- async-and-errors.md - Error handling
- sentry-and-monitoring.md - Error tracking
- configuration.md - Config management
- testing-guide.md - Testing strategies

### Frontend Resources (10 files, ~130 KB)
- complete-examples.md - Full component examples
- data-fetching.md - TanStack Query patterns
- loading-and-error-states.md - UI state management
- file-organization.md - Project structure
- component-patterns.md - Component design
- performance.md - Optimization techniques
- common-patterns.md - Reusable patterns
- typescript-standards.md - Type safety
- styling-guide.md - MUI styling
- routing-guide.md - Navigation

---

## 🔧 Configuration

### Skill Triggers
**File:** `.claude/skills/skill-rules.json`

Customize when skills activate:
- Add keywords to match your domain
- Adjust file path patterns
- Change priority levels
- Add intent patterns (regex)

### Settings
**File:** `.claude/settings.json`

Hook configuration - generally no changes needed.

---

## 💡 Usage Examples

### Backend Development
```
"I need to create an API endpoint for quiz submission"
→ backend-dev-guidelines activates
→ References routing-and-controllers.md, validation-patterns.md
→ Provides layered architecture implementation
```

### Frontend Development
```
"Build a modal component for quiz settings"
→ frontend-dev-guidelines activates
→ References component-patterns.md, complete-examples.md
→ Provides modern React component with TypeScript
```

### Create Development Plan
```
/dev-docs Implement real-time quiz collaboration
→ Creates dev/active/quiz-collaboration-plan.md
→ Creates dev/active/quiz-collaboration-context.md
→ Creates dev/active/quiz-collaboration-checklist.md
```

---

## 📊 Installation Statistics

**Total Files:** 40+
**Resource Docs:** 21 comprehensive guides (~250 KB)
**Skills:** 2 (backend + frontend)
**Agents:** 2
**Commands:** 3

---

## ✅ Customization

### Add Project-Specific Patterns

Edit skill files to add your conventions:
- `.claude/skills/backend-dev-guidelines/SKILL.md`
- `.claude/skills/frontend-dev-guidelines/SKILL.md`

### Create Custom Commands

Add `.claude/commands/your-command.md`:
```markdown
# /your-command - Description

What this command does...

## Instructions
Step by step...
```

Use with: `/your-command`

### Adjust Triggers

Edit `.claude/skills/skill-rules.json`:
```json
{
  "backend-dev-guidelines": {
    "promptTriggers": {
      "keywords": ["your-keyword", "another-term"]
    }
  }
}
```

---

## 🧪 Verification

All components tested:
- ✅ Hook TypeScript compilation
- ✅ Backend skill activation
- ✅ Frontend skill activation
- ✅ Multiple skill activation
- ✅ Resource files (21 downloaded)
- ✅ Agents accessible
- ✅ Commands functional

---

## 📚 Command Reference

### /dev-docs [task]
Creates comprehensive development plan with:
- Executive summary and analysis
- Implementation phases
- Detailed task breakdown
- Risk assessment
- Success metrics

**Output:** `dev/active/[task-name]/`

### /dev-docs-update
Captures session state before context reset:
- Implementation progress
- Key decisions
- Modified files
- Current blockers
- Next steps

**Updates:** Active task docs, project knowledge

### /api-test [route]
Tests and documents API endpoints:
- Route discovery
- Contract documentation
- Test case generation
- Authentication checks
- Validation testing

**Output:** `dev/api-tests/`

---

## 🔗 Resources

- **Original Repository:** https://github.com/diet103/claude-code-infrastructure-showcase
- **Claude Code Docs:** https://docs.claude.com/claude-code

---

## 🎯 What You Get

**Consistency:** Standardized patterns across your codebase
**Productivity:** Automatic skill suggestions when needed
**Quality:** Production-tested patterns and best practices
**Knowledge:** Persistent documentation that survives context resets

---

**The infrastructure works automatically in the background to enhance your development workflow!**

---

## 🤖 Agent Reference

### Code Quality & Review

**code-architecture-reviewer**
- Performs comprehensive code reviews
- Checks architectural consistency
- Validates best practices
- Reviews type safety and error handling
- Provides structured feedback with priorities

**Usage:** `Use the code-architecture-reviewer agent to review [component/feature]`

---

**auto-error-resolver**
- Detects TypeScript compilation errors
- Analyzes and fixes type issues automatically
- Handles imports, type mismatches, missing definitions
- Verifies fixes with tsc

**Usage:** `Use the auto-error-resolver agent to fix TypeScript errors`

---

**frontend-error-fixer**
- Diagnoses frontend bugs and errors
- Analyzes React component issues
- Fixes UI/UX bugs
- Handles state management problems
- Resolves styling and rendering issues

**Usage:** `Use the frontend-error-fixer agent to debug this component`

---

### Refactoring & Planning

**code-refactor-master**
- Executes large-scale refactoring projects
- Maintains code consistency during changes
- Handles dependencies and references
- Updates tests and documentation
- Ensures no functionality breaks

**Usage:** `Use the code-refactor-master agent to refactor the user service`

---

**refactor-planner**
- Creates strategic refactoring plans
- Analyzes code smells and technical debt
- Identifies refactoring opportunities
- Prioritizes changes by impact
- Provides step-by-step implementation guide

**Usage:** `Use the refactor-planner agent to plan the backend refactoring`

---

**plan-reviewer**
- Evaluates development plans
- Identifies gaps and risks
- Validates task breakdown
- Suggests improvements
- Ensures completeness

**Usage:** `Use the plan-reviewer agent to review my implementation plan`

---

### Testing & Debugging

**auth-route-tester**
- Tests authentication endpoints
- Validates JWT token handling
- Checks authorization logic
- Tests protected routes
- Generates comprehensive test cases

**Usage:** `Use the auth-route-tester agent to test /api/auth/login`

---

**auth-route-debugger**
- Debugs authentication flows
- Traces JWT token issues
- Analyzes authorization failures
- Identifies security vulnerabilities
- Provides detailed debugging reports

**Usage:** `Use the auth-route-debugger agent to debug the login flow`

---

### Documentation & Research

**documentation-architect**
- Creates comprehensive documentation
- Organizes documentation structure
- Writes API references
- Generates code examples
- Maintains documentation consistency

**Usage:** `Use the documentation-architect agent to document the API`

---

**web-research-specialist**
- Researches technical problems online
- Finds solutions in GitHub issues, Stack Overflow, Reddit
- Compiles best practices from multiple sources
- Discovers community solutions
- Provides comprehensive research reports

**Usage:** `Use the web-research-specialist agent to research this error`

---

## 🎯 Agent Best Practices

### When to Use Agents

Use agents for:
- ✅ Complex, multi-step tasks
- ✅ Tasks requiring specialized expertise
- ✅ Autonomous work without constant supervision
- ✅ Comprehensive analysis and reporting
- ✅ Tasks that benefit from focused attention

Don't use agents for:
- ❌ Simple, single-step tasks
- ❌ Quick questions or clarifications
- ❌ Tasks you want to supervise closely
- ❌ Rapid iteration and feedback

### Agent Workflow

1. **Request the agent** - Specify which agent and what task
2. **Agent works autonomously** - Runs independently with tool access
3. **Receive report** - Agent returns comprehensive findings
4. **Review and act** - Implement recommendations or ask follow-ups

### Combining Agents

You can use multiple agents in sequence:

```
1. Use web-research-specialist to research best practices
2. Use refactor-planner to create a refactoring plan
3. Use plan-reviewer to validate the plan
4. Use code-refactor-master to execute the refactoring
5. Use code-architecture-reviewer to review the result
```

---

