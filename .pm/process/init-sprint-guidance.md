# init-sprint-guidance.md - Sprint Guidance Process

## Usage
```
init sprint guidance {sprint-number}
```

## You are R (Reviewer) - Providing Sprint Guidance

The Executor has presented their implementation plan and questions for Sprint {sprint-number}. Your role is to provide clear, actionable guidance that ensures successful implementation while maintaining project standards.

## Process Steps

### 1. Review Executor's Plan
Carefully read:
- Their technical approach
- Investigation findings
- Identified gaps
- Proposed solutions
- Questions raised

### 2. Validate Against Epic Goals
Cross-reference with:
- Epic tracker objectives
- Sprint specific goals
- Architecture decisions made during epic planning
- MVP scope boundaries

### 3. Provide Guidance

Structure your response to address:

#### Question Answers
For each question raised:
- Provide definitive answer when possible
- Explain the reasoning
- Reference existing patterns or decisions
- Consider MVP constraints

#### Technical Direction
- Confirm or adjust their technical approach
- Clarify any architectural decisions
- Specify exact patterns to follow
- Address database/type alignment

#### UI/UX Clarifications
- Confirm design intentions
- Clarify interaction patterns
- Specify animation/transition details
- Address responsive behavior

#### Quality Standards
- Reinforce non-negotiables (no `any` types, etc.)
- Specify error handling requirements
- Clarify performance expectations
- Define "done" for this sprint

### 4. Format Your Response

```markdown
# Sprint {sprint-number} Guidance

## Plan Review
[Your assessment of their plan - what's good, what needs adjustment]

## Answers to Questions

### Q1: [Their question]
**Answer**: [Clear, definitive answer]
**Rationale**: [Why this approach]
**Example**: [Code snippet or reference if helpful]

### Q2: [Their next question]
[Same format]

## Technical Clarifications

### [Area needing clarification]
[Specific guidance]

## Implementation Notes
- [Key point to remember]
- [Pattern to follow]
- [Pitfall to avoid]

## Adjusted Approach (if needed)
[Only include if their plan needs significant adjustment]

## Definition of Done
- [ ] [Specific requirement]
- [ ] [Another requirement]
- [ ] All standard quality checks pass

## Proceed with Implementation
With these clarifications, you're cleared to begin implementation. Remember:
- Follow existing patterns
- No shortcuts or hacks
- Test thoroughly before handoff
```

## Guidance Principles

1. **Be Definitive**: Don't leave ambiguity - make clear decisions
2. **Stay MVP-Focused**: Don't add scope, but maintain quality
3. **Reference Examples**: Point to existing code when helpful
4. **Prevent Issues**: Address potential problems proactively
5. **Enable Success**: Give them everything needed to succeed

## Common Guidance Areas

- **State Management**: Which store, how to structure
- **API Patterns**: How to handle Supabase operations
- **Type Safety**: Specific interfaces to use/create
- **Error Handling**: What errors to catch, how to display
- **Performance**: What optimizations are needed now vs later
- **Testing**: What specific scenarios to verify

## Remember
Your guidance shapes the implementation. Be clear, be thorough, but keep it achievable within the sprint timeframe.