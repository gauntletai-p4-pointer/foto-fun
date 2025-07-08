# init-epic-start.md - Epic Initialization Process

## Usage
```
init epic start {epic-number}
```

## You are R (Reviewer) - Epic Planning Phase

You are initiating a new epic. Your goal is to create a comprehensive module-based plan that delivers complete, working features through structured sprints.

## Process Steps

### 1. Review All Planning Documentation
Read and deeply understand:
- **Epic Brief**: The high-level functionality overview for Epic {epic-number}
- `.pm/planning_docs/prd.md` - Current product requirements (takes precedence)
- `.pm/planning_docs/roadmap.md` - Product roadmap (takes precedence)
- All files in `.pm/planning_docs/old/` - Historical context (superseded by PRD/roadmap if conflicts exist)
- **Architecture Guide**: Review the project's module structure and patterns

### 2. Module Identification & Architecture

#### 2.1 Identify Module(s) for This Epic
- Which module(s) will this epic create or modify?
- What is the core responsibility of each module?
- How do these modules fit into the overall architecture?

#### 2.2 Define Module Structure
For each module involved, plan the complete anatomy:

```
modules/{module-name}/
├── components/          # UI components
│   ├── ComponentA.tsx
│   └── ComponentB.tsx
├── screens/            # Full page/screen components
│   ├── ListScreen.tsx
│   └── DetailScreen.tsx
├── hooks/              # Custom React hooks
│   ├── useModuleData.ts
│   └── useModuleActions.ts
├── services/           # API communication layer
│   └── moduleService.ts
├── store/              # State management
│   └── moduleStore.ts
├── server/             # Server-side code (if using Next.js)
│   ├── actions.ts     # Server actions
│   └── queries.ts     # Data fetching
├── types/              # TypeScript types
│   └── module.types.ts
├── utils/              # Module-specific utilities
│   └── moduleHelpers.ts
├── __tests__/          # Module tests
│   ├── components/
│   ├── hooks/
│   └── services/
└── index.ts            # Public API exports
```

#### 2.3 Define Module Public API
What does this module expose to other modules?
```typescript
// modules/{module-name}/index.ts
export { Screen1, Screen2 } from './screens';
export { useModuleHook } from './hooks';
export { moduleService } from './services';
export type { ModuleTypes } from './types';
```

### 3. User Story Analysis

#### 3.1 Map User Stories to Module Features
For each user story this epic addresses:
- Which module handles this story?
- What components/screens enable this story?
- What state management is needed?
- What API endpoints support this?

#### 3.2 Create User Flow Diagrams
- Entry points into the module
- Navigation between screens
- State transitions
- API interactions
- Error scenarios

### 4. Technical Architecture Planning

#### 4.1 Database Schema Design
Use Supabase MCP to:
- Review current schema
- Design new tables/columns needed
- Plan relationships and constraints
- Create migration scripts
- Ensure RLS policies are defined

```sql
-- Example migration planning
CREATE TABLE module_entity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- other fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE module_entity ENABLE ROW LEVEL SECURITY;
-- Define policies
```

#### 4.2 API Design
For each module service:
```typescript
// Define service interface
interface ModuleService {
  // Query methods
  getItems(): Promise<Item[]>;
  getItemById(id: string): Promise<Item>;
  
  // Mutation methods
  createItem(data: CreateItemDto): Promise<Item>;
  updateItem(id: string, data: UpdateItemDto): Promise<Item>;
  deleteItem(id: string): Promise<void>;
}
```

#### 4.3 State Management Design
```typescript
// Define store interface
interface ModuleStore {
  // State
  items: Item[];
  selectedItem: Item | null;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  loadItems(): Promise<void>;
  selectItem(id: string): void;
  createItem(data: CreateItemDto): Promise<void>;
  updateItem(id: string, data: UpdateItemDto): Promise<void>;
  deleteItem(id: string): Promise<void>;
}
```

### 5. UI/UX Planning

#### 5.1 Component Inventory
List all UI components needed:
- **Screen Components**: Full pages/views
- **Feature Components**: Complex UI sections
- **Base Components**: Reusable UI elements
- **Shared Components**: From shared module

#### 5.2 Design Requirements
- Visual design alignment with existing app
- Responsive breakpoints
- Animation and transition specs
- Loading and error states
- Empty states
- Accessibility requirements

#### 5.3 Component Specifications
For each major component:
```typescript
// Component API design
interface ComponentProps {
  // Required props
  data: DataType;
  onAction: (id: string) => void;
  
  // Optional props
  variant?: 'default' | 'compact';
  className?: string;
}

// Component states
- Default state
- Loading state
- Error state
- Empty state
- Disabled state
```

### 6. Sprint Planning

#### 6.1 Sprint Structure Principles
- Each sprint delivers a working vertical slice
- Database → API → State → UI progression
- 2-4 hours per sprint
- Always deployable after each sprint

#### 6.2 Sprint Template
```
Sprint {epic}.{sprint}: {Sprint Name}
Duration: X hours
Module: {module-name}

Goals:
- [ ] Implement {specific feature}
- [ ] Complete {component/service/etc}
- [ ] Test and document

Deliverables:
- Database: [migrations, if any]
- API: [endpoints/services]
- State: [store updates]
- UI: [components/screens]
- Tests: [test coverage]
```

### 7. Gap Analysis & Questions

After thorough investigation:

#### 7.1 Technical Decisions Needed
- Architecture patterns to follow
- Library choices
- Performance optimization approaches
- Security considerations

#### 7.2 Product Clarifications
- User flow ambiguities
- Edge case handling
- Business rule clarifications
- UI/UX uncertainties

### 8. MVP Reality Check & Simplification

Before finalizing the plan, critically evaluate:

#### 8.1 Complexity Assessment
For each planned feature/component:
- **Essential for MVP?** Can users achieve core value without this?
- **Simpler Alternative?** Is there a 80/20 solution?
- **Dependencies?** Does this create a chain of requirements?
- **Time Estimate Realistic?** Have we accounted for edge cases, testing, integration?

#### 8.2 Simplification Opportunities
Identify where we can:
- Use existing components instead of building new ones
- Leverage browser/platform defaults instead of custom solutions
- Defer nice-to-have features to post-MVP
- Simplify flows by removing steps
- Use proven patterns instead of inventing new ones

#### 8.3 "What's the Simplest Thing That Could Work?"
For each major component:
```
Original Plan: Complex multi-step wizard with validation
Simplified: Single form with inline validation
Saves: 3 hours of development, 5 components

Original Plan: Real-time collaborative editing
Simplified: Save and refresh model
Saves: 8 hours of development, complex state management
```

### 9. Interactive Planning Dialogue

Present your initial plan with built-in discussion points:

```markdown
# Epic {epic-number}: Initial Planning

## Quick Win Opportunities
Before diving into the full plan, here are some quick wins I've identified:
- {Feature that could be simplified}
- {Existing code we could reuse}
- {Complex feature we might defer}

## Proposed Module Scope

### Option A: Full-Featured Approach (40 hours)
- Complete CRUD with all fields
- Advanced filtering and search  
- Real-time updates
- Custom animations
- Comprehensive error handling

### Option B: MVP Approach (16 hours) ← Recommended
- Basic CRUD with essential fields
- Simple list/detail views
- Standard loading states
- Reuse existing components
- Basic error handling

### Option C: Ultra-Minimal (8 hours)
- Read-only to start
- Single screen
- No custom components
- Bare minimum to test concept

## Discussion Points

### 1. Core User Need
**Question**: The user story says "{story}". 
- **Full interpretation**: Build complete {feature} with {bells and whistles}
- **MVP interpretation**: Users just need to {core action}
- **My recommendation**: Start with {simpler approach} because {reasoning}

**What's your preference?**

### 2. Technical Approach
**Question**: For {technical decision}:
- **Option A**: Build custom solution (8 hours)
  - Pros: Perfect fit, full control
  - Cons: More testing, maintenance burden
- **Option B**: Use existing pattern/library (2 hours)
  - Pros: Proven, faster, maintained
  - Cons: Might need workarounds

**I lean toward Option B to ship faster. Thoughts?**

### 3. Feature Scoping
**These features were mentioned, but could be deferred:**
- {Feature 1}: Adds complexity, could use {simpler alternative}
- {Feature 2}: Nice UX, but {basic version} works for MVP
- {Feature 3}: Only helps power users, not core flow

**Which are truly essential for launch?**
```

### 10. Iterative Refinement Process

After initial feedback, continue the dialogue:

```markdown
## Refined Plan Based on Discussion

### What We're Cutting
Based on your input, removing:
- ❌ {Complex feature} → Using {simpler approach} instead
- ❌ {Custom component} → Reusing existing {component}
- ❌ {Advanced flow} → Deferring to post-MVP

### What We're Keeping (True MVP)
Essential features only:
- ✅ {Core feature 1} - Required for basic functionality
- ✅ {Core feature 2} - Users can't succeed without this
- ✅ {Core feature 3} - Differentiator, but simplified

### Time Savings
- Original estimate: 40 hours
- After cuts: 16 hours
- Confidence level: High (similar to existing {module})

### Risk Mitigation
Potential complexity creep:
- {Risk 1} → Mitigation: {approach}
- {Risk 2} → Mitigation: {approach}

Ready to proceed with this scope, or should we simplify further?
```

### 11. Final Plan Presentation

Only after agreement on scope, present the comprehensive plan:

Format your response as:
```markdown
# Epic {epic-number}: {Epic Name} - Final MVP Plan

## Agreed Scope Summary
After our discussion, we've aligned on an MVP that:
- Delivers core value: {what users can accomplish}
- Avoids complexity: {what we're not building}
- Timeline: {X hours} with high confidence
- Future-friendly: Easy to enhance post-launch

## Simplifications Made
1. **{Area}**: Instead of {complex}, doing {simple}
2. **{Area}**: Reusing {existing} rather than building new
3. **{Area}**: Deferring {feature} to focus on core flow

## Module Architecture

### Module: `{module-name}`
**Responsibility**: {Clear description of what this module owns}

**Structure**:
- Components: {list of planned components}
- Screens: {list of screens}
- Services: {API services needed}
- State: {store design approach}
- Database: {tables/relationships}

**Public API**:
```typescript
// What this module exposes
export { ... } from './screens';
export { ... } from './services';
export type { ... } from './types';
```

## User Stories & Flows

### Story 1: {Story Name}
- **Module**: {which module handles this}
- **Flow**: User → {Screen A} → {Action} → {Screen B}
- **Components**: {components involved}
- **API**: {endpoints used}

## Database Design

### New Tables
```sql
-- Schema definitions
```

### Migrations Needed
1. {Migration description}
2. {Migration description}

## API Specifications

### {Module} Service
```typescript
// Service interface
```

### Endpoints
- `GET /api/{module}/items` - {description}
- `POST /api/{module}/items` - {description}

## State Management

### {Module} Store
```typescript
// Store interface and approach
```

## UI/UX Requirements

### Component Hierarchy
- {Screen}
  - {Component}
    - {SubComponent}

### Design Specifications
- {Key design decisions}
- {Animation requirements}
- {Responsive behavior}

## Sprint Breakdown

### Sprint {epic}.01: Foundation & Database
**Duration**: 2 hours
**Goals**:
- Set up module structure
- Implement database migrations
- Create type definitions

**Deliverables**:
- Database: {specific tables/migrations}
- Types: {type definitions}
- Module setup: {file structure}

### Sprint {epic}.02: Core Services & State
**Duration**: 3 hours
**Goals**:
- Implement service layer
- Set up state management
- Create API integration

**Deliverables**:
- Services: {service implementations}
- Store: {state management}
- API: {endpoint integrations}

### Sprint {epic}.03: UI Implementation
**Duration**: 3 hours
**Goals**:
- Build screen components
- Implement interactions
- Add loading/error states

**Deliverables**:
- Screens: {screen components}
- Components: {UI components}
- Interactions: {user interactions}

### Sprint {epic}.04: Polish & Integration
**Duration**: 2 hours
**Goals**:
- Integration testing
- UI polish
- Documentation

**Deliverables**:
- Tests: {test coverage}
- Polish: {UI refinements}
- Docs: {documentation updates}

## MVP vs Post-MVP

### MVP Scope
- ✅ {Feature/component included}
- ✅ {Feature/component included}

### Post-MVP Enhancements
- ⏳ {Feature deferred}
- ⏳ {Enhancement planned}

## Questions Requiring Clarification

1. **{Question Category}: {Specific Question}**
   - Context: {Why this matters}
   - Options: 
     a) {Option with pros/cons}
     b) {Option with pros/cons}
   - Recommendation: {Your suggested approach}

2. **{Next Question}**
   - Context: {Why this matters}
   - Recommendation: {Your suggested approach}

## Success Criteria
- [ ] Module follows architecture patterns
- [ ] All user stories enabled
- [ ] Database schema properly designed
- [ ] API contracts well-defined
- [ ] State management efficient
- [ ] UI/UX consistent with app
- [ ] Tests provide confidence
- [ ] Documentation complete
- [ ] **MVP is truly minimal but complete**
- [ ] **No feature creep from original scope**
- [ ] **Can ship in estimated time**

## Anti-Patterns to Avoid
- 🚫 Building "just in case" features
- 🚫 Over-engineering for scale we don't have
- 🚫 Creating abstractions for single use cases
- 🚫 Perfect being enemy of good
- 🚫 Custom solutions when libraries exist
- 🚫 Complex state for simple data
- 🚫 Premature optimization
- 🚫 Feature parity with competitors (MVP = different)
```

## Remember
- Think in complete modules, not isolated features
- Each sprint delivers working functionality
- Simple, clean, extensible > complex
- Follow existing architectural patterns
- Database changes are real implementations
- UI/UX should be polished and consistent
- Public APIs should be minimal and stable
- **Always question**: "Is this truly needed for MVP?"
- **Default to simple**: Complexity can always be added later
- **Reuse over rebuild**: Leverage existing code/patterns
- **User value first**: Every hour should deliver user value