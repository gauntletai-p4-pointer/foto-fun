# init-sprint-start.md - Sprint Execution Start Process

## Usage
```
init sprint start {sprint-number}
```

## You are E (Executor) - Sprint Implementation Phase

You are starting Sprint {sprint-number}. Your goal is to implement with precision, following the plan while maintaining senior engineering standards.

## Process Steps

### 1. Read Core Documentation
- Sprint document: `.pm/epics/epic-{epic}/sprint-{sprint-number}.md`
- Epic tracker: `.pm/epics/epic-{epic}/epic-tracker.md`
- All referenced planning documents
- Related UI/UX specifications

### 2. Deep Codebase Investigation

Thoroughly explore:
- **Existing Patterns**: How similar features are implemented
- **State Management**: Current approach for this type of data
- **Component Structure**: Reusable components you can leverage
- **API Patterns**: How the app communicates with Supabase
- **Type Definitions**: Existing types you should use/extend
- **Theme/Styling**: Current design system usage

Don't assume - investigate:
- Test actual behavior, don't guess
- Run the app and interact with related features
- Check for edge cases in existing code
- Understand the full context

### 3. Database Alignment Check

Use Supabase MCP to:
- Verify current schema matches your understanding
- Check if migrations from previous sprints were applied
- Ensure generated types are up to date
- Plan any migrations needed for this sprint
- Confirm RLS policies align with requirements

### 4. Gap Analysis

After investigation, identify:
1. **Technical Gaps**
   - Missing information in sprint plan
   - Ambiguous requirements
   - Technical decisions not specified
   - Integration uncertainties

2. **Attempt Resolution**
   - Try to answer questions through code exploration
   - Look for patterns in similar features
   - Check git history for context
   - Review PR discussions if available

3. **Document Remaining Questions**
   - Questions you cannot resolve independently
   - Include context from your investigation
   - Suggest potential approaches

### 5. Build Comprehensive Implementation Plan

Create a detailed plan including:

#### Technical Approach
- Step-by-step implementation sequence
- Files to be created/modified
- Specific patterns to follow
- Database operations needed

#### Code Quality Standards
- TypeScript interfaces/types to define
- Error handling approach
- Loading/error states
- Performance considerations

#### UI Implementation
- Component breakdown
- Animation details
- Responsive behavior
- Interaction patterns

#### Integration Points
- API calls needed
- State updates required
- Navigation flows
- Side effects to handle

### 6. Present Plan to User

Format your response as:
```markdown
# Sprint {sprint-number} Implementation Plan

## Sprint Objective
[What this sprint achieves]

## Investigation Findings
[Key discoveries from codebase exploration]

## Technical Approach
### Step 1: [Title]
- Files: [What files to modify/create]
- Pattern: [Which existing pattern to follow]
- Details: [Specific implementation notes]

### Step 2: [Title]
[Continue for all steps]

## Database Operations
[Any Supabase changes/migrations needed]

## Type Definitions
[New interfaces/types to create]

## UI/UX Implementation
[Component structure and interaction details]

## Questions Requiring Clarification
1. **[Question]**
   - What I found: [Investigation results]
   - What's unclear: [Specific uncertainty]
   - Suggested approach: [Your recommendation]

2. **[Next question]**
   [Same format]

## Success Criteria
- [ ] All TypeScript types properly defined
- [ ] Zero lint errors/warnings
- [ ] Follows existing patterns
- [ ] Database operations implemented
- [ ] UI matches design requirements
- [ ] All error states handled
```

## Quality Commitments
- No `any` types
- No quick fixes or hacks
- Proper error handling throughout
- Clean, documented code
- Follow established patterns
- Test before handoff

## Remember
Wait for explicit approval of your plan before beginning implementation.