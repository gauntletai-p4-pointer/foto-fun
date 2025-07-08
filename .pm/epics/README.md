# FotoFun Epic Development Guide

## Overview
This directory contains 4 major development epics for the FotoFun photo editor. Each epic is designed to be worked on by a separate developer in parallel.

## Epic Assignments
1. **Epic 1: Foundation & Current Tools** - Core infrastructure and tool improvements
2. **Epic 2: Text & Type Tools** - All text-related functionality  
3. **Epic 3: Shape & Vector Tools** - Vector drawing and path tools
4. **Epic 4: Paint & Clone Tools** - Painting, cloning, and enhancement tools

## GitHub Workflow

### Branch Strategy
Each developer should:
1. Create a feature branch from `main` named after their epic:
   - `epic-1-foundation-tools`
   - `epic-2-text-type-tools`
   - `epic-3-shape-vector-tools`
   - `epic-4-paint-clone-tools`

2. Work exclusively on their branch
3. Create a single PR when the epic is complete (or at major milestones)

### Development Process

#### 1. Initial Setup
```bash
git checkout main
git pull origin main
git checkout -b epic-X-[name]
bun install
```

#### 2. Daily Workflow
- Pull latest `main` to stay updated: `git pull origin main`
- Work only on files specified in your epic
- Run `bun lint && bun typecheck` frequently
- Commit with conventional commits:
  - `feat: add rectangle tool`
  - `fix: path selection bug`
  - `refactor: extract base shape class`

#### 3. Testing Requirements
- Test all tools/features you implement
- Test in both light and dark themes
- Test keyboard shortcuts
- Test undo/redo integration
- Document test scenarios

#### 4. Pre-PR Checklist
- [ ] All tools in epic implemented to MVP level
- [ ] `bun lint && bun typecheck` passes with 0 errors in your files
- [ ] All features manually tested
- [ ] Epic document updated with completed items
- [ ] No ESLint suppressions or TypeScript ignores

### Coordination Guidelines

#### Shared Dependencies
- **BaseTool class** (Epic 1) - Required by all other epics
- **Layer System** (Epic 1) - Required by Epic 2, 3, 4
- **Command Pattern** (Epic 1) - Required for undo/redo in all epics

#### Communication Channels
- `#dev-canvas` - General canvas/tool discussions
- `#dev-text` - Text rendering issues
- `#dev-vector` - Path/bezier algorithms
- `#dev-paint` - Painting/cloning algorithms

#### Handling Conflicts
1. If you need changes in shared files (types, constants):
   - Discuss in team channel first
   - Coordinate who makes the change
   - Consider if it belongs in Epic 1

2. If blocked by another epic:
   - Create mock/stub temporarily
   - Note dependency in PR
   - Coordinate merge order

### Merge Strategy

#### Order of Merging
1. **Epic 1** should merge first (provides foundation)
2. **Epics 2, 3, 4** can merge in any order after Epic 1
3. Each PR should be reviewed by at least one other developer

#### Integration Testing
After each epic merges:
1. All developers pull latest `main`
2. Test integration with existing features
3. Fix any conflicts or issues
4. Update epic documents if needed

## Code Quality Standards

### Required for All Code
- TypeScript strict mode compliance
- No `any` types without explicit justification
- No ESLint disable comments
- No `@ts-ignore` or `@ts-expect-error`
- Proper error handling
- Comments for complex algorithms

### Performance Considerations
- Test with large images (4K+)
- Profile memory usage
- Optimize hot paths
- Use Web Workers for heavy computation
- Implement progressive rendering

## Tool Implementation Pattern

All tools should follow this pattern:

```typescript
class MyTool extends BaseTool {
  name = 'My Tool'
  icon = 'my-icon'
  cursor = 'crosshair'
  
  onActivate() {
    // Setup tool state
  }
  
  onDeactivate() {
    // Cleanup
  }
  
  onMouseDown(e: MouseEvent) {
    // Start operation
  }
  
  onMouseMove(e: MouseEvent) {
    // Update operation
  }
  
  onMouseUp(e: MouseEvent) {
    // Complete operation
    // Add to history
  }
}
```

## Questions?
If you have questions about:
- Tool implementation → Check Epic 1's BaseTool
- Text rendering → Check Epic 2's text engine
- Path math → Check Epic 3's bezier utilities
- Image processing → Check Epic 4's algorithms

Good luck and happy coding! 🎨 