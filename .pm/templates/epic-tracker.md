# Epic [Number]: [Epic Name] Tracker

## Epic Overview

**Status**: NOT STARTED | IN PROGRESS | COMPLETED | BLOCKED  
**Start Date**: [Date]  
**Target End Date**: [Date]  
**Actual End Date**: [Date when completed]

**Epic Goal**: [1-2 sentences on what this epic achieves]

**User Stories Addressed**:
- Story X: [Story name] - [Which parts this epic completes]
- Story Y: [Story name] - [Which parts this epic completes]

**PRD Reference**: [Link to relevant PRD sections]

## Sprint Breakdown

| Sprint # | Sprint Name | Status | Start Date | End Date | Key Deliverable |
|----------|-------------|--------|------------|----------|-----------------|
| 01.00 | Infrastructure/Setup | NOT STARTED | - | - | [Main outcome] |
| 01.01 | [Feature Name] | NOT STARTED | - | - | [Main outcome] |
| 01.02 | [Feature Name] | NOT STARTED | - | - | [Main outcome] |
| 01.03 | [Feature Name] | NOT STARTED | - | - | [Main outcome] |

**Statuses**: NOT STARTED | IN PROGRESS | IN REVIEW | APPROVED | BLOCKED

## Architecture & Design Decisions

### High-Level Architecture for This Epic
[Describe how the components in this epic fit together]

### Key Design Decisions
1. **[Decision Area]**: [What was decided and why]
   - Alternatives considered: [Other options]
   - Rationale: [Why this choice]
   - Trade-offs: [What we're accepting]

2. **[Decision Area]**: [What was decided and why]
   - Alternatives considered: [Other options]
   - Rationale: [Why this choice]
   - Trade-offs: [What we're accepting]

### Dependencies
**External Dependencies**:
- [Library/Service]: [Why needed] - [Version]

**Internal Dependencies**:
- Requires: [What from previous epics]
- Provides: [What for future epics]

## Implementation Notes

### File Structure for Epic
```
[Relevant part of codebase]
├── [New directories/files]
└── [Organization approach]
```

### API Endpoints Added
| Method | Path | Purpose | Sprint |
|--------|------|---------|--------|
| [GET/POST] | /api/[path] | [What it does] | 01.01 |

### Data Model Changes
```
[Any schema additions/modifications]
```

### Key Functions/Components Created
- `[FunctionName]` - [Purpose] - Sprint 01.01
- `[ComponentName]` - [Purpose] - Sprint 01.02

## Sprint Execution Log

### Sprint 01.00: Infrastructure/Setup
**Status**: [Status]
**Summary**: [What was set up]
**Key Decisions**: [Any important choices made]
**Issues Encountered**: [Problems and solutions]

### Sprint 01.01: [Name]
**Status**: [Status]
**Summary**: [What was built]
**Key Decisions**: [Any important choices made]
**Issues Encountered**: [Problems and solutions]

[Continue for each completed sprint]

## Testing & Quality

### Testing Approach
- [What level of testing for this epic]
- [Any specific test scenarios]

### Known Issues
| Issue | Severity | Sprint | Status | Resolution |
|-------|----------|--------|--------|------------|
| [Issue] | HIGH/MED/LOW | 01.01 | OPEN/FIXED | [How fixed or plan to fix] |

## Refactoring Completed

### Code Improvements
- [What was refactored]: [Why and impact]
- [What was refactored]: [Why and impact]

### Performance Optimizations
- [Optimization]: [Measured impact]

## Learnings & Gotchas

### What Worked Well
- [Success 1]: [Why it worked]
- [Success 2]: [Why it worked]

### Challenges Faced
- [Challenge 1]: [How we solved it]
- [Challenge 2]: [How we solved it]

### Gotchas for Future Development
- **[Gotcha title]**: [Detailed explanation of the issue and how to avoid it]

## Build Testing & Verification

### Epic-End Build Process (MANDATORY)

Before marking an epic as complete, the following build verification MUST be performed:

1. **Clean all caches:**
   ```bash
   rm -rf .expo node_modules/.cache .tamagui ios/build android/build
   ```

2. **Force clean prebuild for both platforms:**
   ```bash
   bun expo prebuild --platform ios --clean
   bun expo prebuild --platform android --clean
   ```

3. **Run full quality checks:**
   ```bash
   bun run lint      # MUST return 0 errors, 0 warnings
   bun run typecheck # MUST return 0 errors
   ```

4. **Test builds on both platforms:**
   ```bash
   # iOS
   bun expo run:ios
   
   # Android
   bun expo run:android
   ```

5. **Verification checklist:**
   - [ ] App launches without crashes on iOS
   - [ ] App launches without crashes on Android
   - [ ] All epic features work on both platforms
   - [ ] No console errors during runtime
   - [ ] Camera/permissions work (if applicable)
   - [ ] Navigation works properly
   - [ ] Screenshots taken of working app

### Build Issues Resolution
If any build issues are encountered:
1. Create a fix-build sprint immediately
2. Document all errors and resolutions
3. Update dependencies if needed
4. Re-run the entire verification process

**NO EPIC CAN BE MARKED COMPLETE WITHOUT SUCCESSFUL BUILDS ON BOTH PLATFORMS**

## Epic Completion Checklist

- [ ] All planned sprints completed and approved
- [ ] User stories for this epic fully addressed
- [ ] Code refactored and cleaned up
- [ ] Documentation updated
- [ ] No critical bugs remaining
- [ ] Performance acceptable
- [ ] Integration with other epics tested
- [ ] Epic summary added to project tracker

## Epic Summary for Project Tracker

**[To be completed at epic end]**

**Delivered Features**:
- [Feature 1 with brief description]
- [Feature 2 with brief description]

**Key Architectural Decisions**:
- [Decision 1 - impact on future development]

**Critical Learnings**:
- [Learning that affects future epics]

**Technical Debt Created**:
- [Any shortcuts taken that need future attention]

---

*Epic Started: [Date]*  
*Epic Completed: [Date]*  
*Total Duration: [X days/weeks]*