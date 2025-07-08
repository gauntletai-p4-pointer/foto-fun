# init-epic-end.md - Epic Completion Process

## Usage
```
init epic end {epic-number}
```

## You are R (Reviewer) - Epic Final Review

All sprints for Epic {epic-number} are approved. Now you must perform comprehensive quality assurance and platform verification before marking the epic complete.

## Process Steps

### 1. Comprehensive Quality Review

#### Final Code Quality Checks
```bash
# These MUST pass with zero issues
bun run lint      # MUST be 0 errors, 0 warnings
bun run typecheck # MUST be 0 errors
```

#### Full Codebase Review
- Review all code added during epic
- Check for consistency across sprints
- Identify any technical debt
- Look for refactoring opportunities
- Verify no "TODO" or "FIXME" comments remain

### 2. Platform Build Verification (MANDATORY)

#### Clean Environment
```bash
# Remove all cached builds
rm -rf .expo node_modules/.cache .tamagui ios/build android/build
```

#### Prebuild Both Platforms
```bash
# Must succeed for both platforms
bun expo prebuild --platform ios --clean
bun expo prebuild --platform android --clean
```

#### Run on Both Platforms
```bash
# Test iOS
bun expo run:ios

# Test Android  
bun expo run:android
```

#### Verification Requirements
Document results for each platform:
- [ ] iOS app launches without crashes
- [ ] Android app launches without crashes
- [ ] All epic features functional on iOS
- [ ] All epic features functional on Android
- [ ] No runtime errors in console
- [ ] Native features work (camera, permissions, etc.)
- [ ] Performance acceptable on both platforms
- [ ] UI renders correctly on various screen sizes

Take screenshots as proof of working builds.

### 3. Feature Verification

#### Functional Testing
For each major feature in the epic:
- Test happy path
- Test error cases
- Test edge cases
- Verify data persistence
- Check offline behavior
- Test permissions/access

#### Integration Testing
- All API calls working
- State management correct
- Navigation flows smooth
- Side effects handled
- No memory leaks

#### UI/UX Testing
- All screens render correctly
- Animations smooth (60fps)
- Touch targets appropriate
- Loading states present
- Error states handled
- Theme consistency throughout
- Responsive on all screen sizes

### 4. Database Verification

Use Supabase MCP to verify:
- All migrations applied correctly
- Schema matches implementation
- RLS policies working as intended
- No orphaned data
- Indexes appropriate
- Generated types accurate

### 5. Refactoring Assessment

Identify opportunities for:
- Code deduplication
- Component extraction
- Type consolidation
- Performance optimization
- Pattern standardization

Create list of recommended refactoring tasks (can be post-MVP).

### 6. Epic Completion Documentation

Update epic tracker with comprehensive summary:

```markdown
# Epic {epic-number} Completion Report

## Summary
**Status**: COMPLETED
**Completion Date**: [Date]
**Total Sprints**: X
**Development Time**: [Actual hours]

## Features Delivered
1. [Major feature with description]
2. [Next feature]
3. [Etc.]

## Platform Verification
### iOS Build
- Build Date: [Date]
- Build Success: ✅
- Features Tested: ✅
- Screenshot: [Reference]

### Android Build  
- Build Date: [Date]
- Build Success: ✅
- Features Tested: ✅
- Screenshot: [Reference]

## Quality Metrics
- TypeScript Errors: 0
- Lint Warnings: 0
- Code Coverage: [If applicable]
- Performance: [Notes]

## Technical Achievements
- [Key architectural decision/implementation]
- [Pattern established]
- [Performance optimization]

## Database Changes
- Tables Added: [List]
- Tables Modified: [List]
- RLS Policies: [Count]

## Refactoring Opportunities (Post-MVP)
1. [Opportunity with impact]
2. [Next opportunity]

## Lessons Learned
- [What went well]
- [What could improve]
- [Key learning]

## Technical Debt (if any)
- [Item with priority]
- [Mitigation plan]
```

### 7. Update Project Tracker

Update the main project tracker:
- Mark epic as COMPLETED
- Update feature completion percentage
- Note any risks or blockers discovered
- Update timeline if affected
- Add key technical decisions to project notes

### 8. Handle Build Failures

If platform builds fail:
1. Document specific errors
2. Create immediate fix-build sprint
3. Do NOT mark epic complete
4. Re-run full verification after fixes

## Epic Completion Checklist

Before marking complete, verify:
- [ ] All sprints approved
- [ ] Zero lint/type errors
- [ ] iOS build successful
- [ ] Android build successful
- [ ] All features working on both platforms
- [ ] Database schema correct
- [ ] Epic tracker updated
- [ ] Project tracker updated
- [ ] Screenshots captured
- [ ] No critical bugs

## Remember
Epic completion is a major milestone. Be thorough - this is the last gate before features reach users. But also celebrate the achievement with the team!