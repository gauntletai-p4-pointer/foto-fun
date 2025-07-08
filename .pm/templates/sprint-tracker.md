# Sprint [Epic.Sprint]: [Sprint Name] Tracker

## Sprint Overview

**Status**: NOT STARTED | IN PROGRESS | IN REVIEW | APPROVED | BLOCKED  
**Start Date**: [Date]  
**End Date**: [Date]  
**Epic**: [Epic number and name]

**Sprint Goal**: [1-2 sentences on what this sprint delivers]

**User Story Contribution**: 
- Enables [specific feature] for Story X: [Story name]

## 🚨 Required Development Practices

### Database Management
- **Use Supabase MCP** to inspect current database state: `mcp_supabase_get_schemas`, `mcp_supabase_get_tables`, etc.
- **Keep types synchronized**: Run type generation after ANY schema changes
- **Migration files required**: Every database change needs a migration file
- **Test migrations**: Ensure migrations run cleanly on fresh database

### UI/UX Consistency
- **Use Tamagui components**: `View`, `Text`, `XStack`, `YStack`, `Stack`
- **Follow UI/UX rules**: See `.pm/process/ui-ux-consistency-rules.md`
- **Use Colors constant**: Import from `@/theme` - NEVER hardcode colors
- **Standard spacing**: Use Tamagui's `$1`, `$2`, `$3`, etc. tokens

### Code Quality
- **Zero tolerance**: No lint errors, no TypeScript errors
- **Type safety**: No `any` types without explicit justification
- **Run before handoff**: `bun run lint && bun run typecheck`

## Sprint Plan

### Objectives
1. [Specific objective 1]
2. [Specific objective 2]
3. [Specific objective 3]

### Files to Create
| File Path | Purpose | Status |
|-----------|---------|--------|
| `[path/to/file]` | [What this file does] | NOT STARTED |
| `[path/to/file]` | [What this file does] | NOT STARTED |

### Files to Modify  
| File Path | Changes Needed | Status |
|-----------|----------------|--------|
| `[path/to/file]` | [What changes] | NOT STARTED |
| `[path/to/file]` | [What changes] | NOT STARTED |

### Implementation Approach
[Detailed technical approach for this sprint]

**Key Technical Decisions**:
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

### Dependencies & Risks
**Dependencies**:
- [External library/service if any]
- [Depends on code from Sprint X.X]

**Identified Risks**:
- [Risk]: [Mitigation plan]

## Implementation Log

### Day-by-Day Progress
**[Date]**:
- Started: [What was begun]
- Completed: [What was finished]
- Blockers: [Any issues]
- Decisions: [Any changes to plan]

**[Date]**:
- Started: [What was begun]
- Completed: [What was finished]
- Blockers: [Any issues]
- Decisions: [Any changes to plan]

### Reality Checks & Plan Updates

**Reality Check 1** - [Date]
- Issue: [What wasn't working]
- Options Considered:
  1. [Option 1] - Pros/Cons
  2. [Option 2] - Pros/Cons
- Decision: [What was chosen]
- Plan Update: [How sprint plan changed]
- Epic Impact: [Any epic updates needed]

### Code Quality Checks

**Linting Results**:
- [ ] Initial run: [X errors, Y warnings]
- [ ] Final run: [Should be 0 errors]

**Type Checking Results**:
- [ ] Initial run: [X errors]
- [ ] Final run: [Should be 0 errors]

**Build Results**:
- [ ] Development build passes
- [ ] Production build passes

## Key Code Additions

### New Functions/Components
```typescript
// Example of key function signature
functionName(params): ReturnType
// Purpose: [What it does]
// Used by: [Where it's used]
```

### API Endpoints Implemented
| Method | Path | Request | Response | Status |
|--------|------|---------|----------|--------|
| POST | /api/[endpoint] | `{...}` | `{...}` | WORKING |

### State Management
- [What state was added]
- [How it's managed]

## Testing Performed

### Manual Testing
- [ ] [Test scenario 1]: [Result]
- [ ] [Test scenario 2]: [Result]
- [ ] [Integration with X]: [Result]

### Edge Cases Considered
- [Edge case 1]: [How handled]
- [Edge case 2]: [How handled]

## Documentation Updates

- [ ] Code comments added where needed
- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)
- [ ] Complex logic documented

## Handoff to Reviewer

### What Was Implemented
[Clear summary of all work completed]

### Files Modified/Created
**Created**:
- `[file1.ts]` - [Purpose]
- `[file2.tsx]` - [Purpose]

**Modified**:
- `[file3.ts]` - [What changed and why]
- `[file4.tsx]` - [What changed and why]

### Key Decisions Made
1. [Decision]: [Rationale and impact]
2. [Decision]: [Rationale and impact]

### Deviations from Original Plan
- [Deviation 1]: [Why it was necessary] - [Approved by user on date]

### Known Issues/Concerns
- [Any issues the reviewer should know about]
- [Any areas that might need special attention]

### Suggested Review Focus
- [Area 1]: [Why it needs attention]
- [Area 2]: [Why it needs attention]

**Sprint Status**: READY FOR REVIEW

---

## Reviewer Section

**Reviewer**: [R persona]  
**Review Date**: [Date]

### Review Checklist
- [ ] Code matches sprint objectives
- [ ] All planned files created/modified
- [ ] Follows established patterns
- [ ] No unauthorized scope additions
- [ ] Code is clean and maintainable
- [ ] No obvious bugs or issues
- [ ] Integrates properly with existing code

### Review Outcome

**Status**: APPROVED | NEEDS REVISION

### Feedback
[If NEEDS REVISION, specific feedback here]

**Required Changes**:
1. **File**: `[filename]`
   - Issue: [What's wrong]
   - Required Change: [What to do]
   - Reasoning: [Why it matters]

2. **File**: `[filename]`
   - Issue: [What's wrong]
   - Required Change: [What to do]
   - Reasoning: [Why it matters]

### Post-Review Updates
[Track changes made in response to review]

**Update 1** - [Date]
- Changed: [What was modified]
- Result: [New status]

---

## Sprint Metrics

**Duration**: Planned [X] days | Actual [Y] days  
**Scope Changes**: [Number of plan updates]  
**Review Cycles**: [Number of review rounds]  
**Files Touched**: [Total count]  
**Lines Added**: ~[Estimate]  
**Lines Removed**: ~[Estimate]

## Learnings for Future Sprints

1. [Learning 1]: [How to apply in future]
2. [Learning 2]: [How to apply in future]

---

*Sprint Started: [Date]*  
*Sprint Completed: [Date]*  
*Final Status: [APPROVED/IN PROGRESS/BLOCKED]*