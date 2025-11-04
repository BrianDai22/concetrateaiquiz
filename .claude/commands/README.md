# Slash Commands

Custom slash commands for enhanced Claude Code workflows.

## Available Commands

### /dev-docs - Strategic Planning
**Purpose:** Transform requirements into structured, actionable project plans

**Usage:**
```
/dev-docs [task description]
```

**Examples:**
```
/dev-docs Implement user authentication system
/dev-docs Refactor quiz components for better reusability
/dev-docs Add real-time grading with WebSockets
```

**Creates:**
- `dev/active/[task-name]-plan.md` - Comprehensive implementation plan
- `dev/active/[task-name]-context.md` - Dependencies and constraints
- `dev/active/[task-name]-checklist.md` - Task tracking

**When to use:**
- Starting major features
- Planning refactoring work
- Breaking down complex requirements
- Need persistent task tracking

---

### /dev-docs-update - Context Preservation
**Purpose:** Capture project state before context reset or session end

**Usage:**
```
/dev-docs-update
```

**Updates:**
- Active task documentation with progress
- Session learnings and decisions
- Project knowledge files
- Unfinished work documentation
- Handoff notes for resumption

**When to use:**
- Approaching token limits
- End of coding session
- After major discoveries
- Before task switching
- Partial work in progress

---

### /api-test - API Testing Helper
**Purpose:** Research and test API endpoints systematically

**Usage:**
```
/api-test [route-path]
/api-test                  # Scans recently modified routes
```

**Examples:**
```
/api-test /api/auth/login
/api-test /api/quizzes
```

**Tests:**
- Endpoint accessibility
- HTTP methods
- Authentication requirements
- Input validation
- Response formats
- Error handling

**Creates:**
- `dev/api-tests/[route-name]-test.md` - Test documentation
- `dev/api-tests/test-results.md` - Test results
- Test files (if requested)

**When to use:**
- Testing new endpoints
- Validating API contracts
- Debugging route issues
- Generating test cases
- API documentation

---

## How Slash Commands Work

1. **Type the command** - Start with `/` followed by command name
2. **Add arguments** - Provide required parameters (if any)
3. **Claude executes** - Command prompt is loaded and processed
4. **Get results** - Structured output based on command logic

## Command Locations

All commands are stored in: `.claude/commands/[command-name].md`

Each file contains:
- Command description
- Usage instructions
- What the command does
- Output format
- Best practices
- Success criteria

## Creating Custom Commands

To create your own slash command:

1. Create a new `.md` file in `.claude/commands/`
2. Name it `your-command-name.md`
3. Write the command instructions (what Claude should do)
4. Use it with `/your-command-name`

**Example structure:**
```markdown
# /my-command - Description

Purpose and what it does.

## Instructions
Step-by-step what Claude should execute.

## Usage
Examples of how to use it.
```

## Tips

- Use descriptive command names
- Include clear examples
- Document expected outputs
- Keep commands focused on one task
- Make them reusable across projects

## Integration

Commands work with:
- Skills (can reference skills)
- Agents (can launch agents)
- Hooks (triggered automatically)
- Project structure (create/update files)

## Resources

- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Original Showcase](https://github.com/diet103/claude-code-infrastructure-showcase)
