# Product Requirements Document (PRD) Template

## Project Planning Process

### Phase 1: Uncover Your Spiky POV

Before diving into features or technical details, we need to identify what makes this project worth building. Start by exploring:

1. **What does everyone believe that's wrong?**
   - What assumption does your industry take for granted?
   - What "best practice" is actually broken?
   - What do users say they want vs. what they actually need?

2. **What would you NOT build?**
   - What features do all competitors have that you'll intentionally skip?
   - What conventional patterns will you reject?
   - What module would a typical app have that yours won't?

3. **What's your non-consensus truth?**
   - Complete this: "Everyone thinks X, but actually Y"
   - What behavioral insight do you have that others miss?
   - What makes your approach feel "wrong" to traditional thinking?

### Phase 2: Let Your Spiky POV Drive Architecture

Your non-consensus belief should fundamentally shape what you build:

**Example Transformations**:
- Todo App: "Tasks are a symptom, not the problem" → Build `energy-management` not `task-list`
- Social App: "Followers are vanity metrics" → Build `meaningful-connections` not `follow-system`
- Note App: "Organization is procrastination" → Build `idea-capture` not `folder-system`

### Phase 3: Collaborative Refinement

1. **Start a new chat** in Claude.ai browser with this template attached
2. **Share your spiky POV first** - This is the foundation everything builds on
3. **Describe your idea** through the lens of your non-consensus belief
4. **Collaborative refinement** - Claude will:
   - Challenge whether your POV is truly spiky enough
   - Help identify which conventional modules to AVOID
   - Suggest unique modules that embody your worldview
   - Map user stories that only make sense with your POV
   - Ensure technical choices reinforce your core belief
   - Design module boundaries that enforce your opinion

5. **Architecture-First Planning** - We'll establish:
   - Modules that embody your spiky POV
   - What modules we're intentionally NOT building
   - How module design enforces your worldview
   - Data models that track what matters (and ignore what doesn't)

6. **Epic Planning** follows this pattern:
   - Epic 1: Foundation (setup + core opinionated infrastructure)
   - Epic 2: Core Differentiating Module (what makes you special)
   - Epic 3+: Supporting modules that reinforce your POV

### Key Discussion Points to Cover

- **Spiky POV**: What's your non-consensus truth?
- **Anti-Features**: What are you intentionally NOT building?
- **Core Problem**: What problem does your POV reveal?
- **Target Users**: Who desperately needs your worldview?
- **Differentiating User Stories**: What journeys only exist with your POV?
- **Module Identification**: Which modules embody your belief?
- **Module Anti-Patterns**: What modules would dilute your vision?
- **Success Metrics**: How do you measure what others ignore?

---

## [Project Name] PRD

### Spiky Point of View

**Our Non-Consensus Truth**: [State your contrarian belief]

**What Everyone Believes**: [Common assumption you're challenging]

**Why They're Wrong**: [Evidence or insight supporting your POV]

**What We're NOT Building**: 
- [Conventional feature/module we're skipping]
- [Standard pattern we're rejecting]
- [Common approach we're avoiding]

### Project Overview

**Vision**: [One sentence describing what this project will achieve - through your spiky lens]

**Problem Statement**: [2-3 sentences describing the REAL problem your POV reveals]

**Success Criteria**: [Metrics that matter with your worldview - not vanity metrics]

### User Stories

*Note: These should be stories that only make sense with your spiky POV*

#### Story 1: [Story Name]
**As a** [type of user who gets your POV]  
**I want to** [action that aligns with your worldview]  
**So that** [benefit that traditional apps don't provide]

#### Story 2: [Story Name]
**As a** [type of user]  
**I want to** [action/goal]  
**So that** [benefit/value]

[Continue with 4-7 stories total that embody your non-consensus approach]

### Architecture Pattern

**Selected Pattern**: Feature-Based Module Architecture

**POV-Driven Adaptations**:
- [How your spiky POV modifies the standard pattern]
- [Which conventional modules we're eliminating]
- [Which unique modules only we would build]

**Core Principles**:
1. Modules embody our spiky POV, not fight it
2. Architecture makes the "wrong" thing hard to build
3. Data models track what we believe matters
4. Missing features are features (intentional constraints)
5. Every module reinforces our worldview

### Module Architecture

#### Identified Modules

Based on our spiky POV and user stories:

| Module | Purpose | Why This Exists (POV) | What We're NOT Building |
|--------|---------|----------------------|-------------------------|
| `[core-differentiator]` | [Main unique functionality] | [How it embodies POV] | [What others would build] |
| `[unique-module-2]` | [Secondary unique feature] | [POV connection] | [Convention we're skipping] |
| `authentication` | User identity | Simplified to support POV | Complex profiles/preferences |
| `shared` | Common UI components | Opinionated, enforces constraints | Flexible/generic components |

#### Modules We're Intentionally NOT Building
- **`[common-module]`**: [Why this doesn't align with our POV]
- **`[expected-feature]`**: [How this would dilute our vision]
- **`[standard-pattern]`**: [Why we're taking a different approach]

#### Module Structure Template
```
modules/
  [module-name]/
    components/          # UI components that embody our POV
    screens/            # Opinionated user flows
    hooks/              # Custom hooks enforcing our patterns
    services/           # API calls aligned with our model
    store/              # State that tracks what matters
    server/             # Backend logic supporting POV
    types/              # Types that make wrong things impossible
    utils/              # Utilities that reinforce opinions
    __tests__/          # Tests that verify POV is maintained
    index.ts            # Public API with clear constraints
```

### Technical Architecture

#### High-Level Architecture
[Architecture diagram that shows how technical choices reinforce your POV]

#### Technology Stack
*Note: Tech choices should align with and reinforce your spiky POV*

- **Frontend**: [Choice + why it supports your POV]
- **State Management**: [How state design embodies your belief]
- **Database**: [What data you track/ignore based on POV]
- **Authentication**: [Simplified/enhanced based on worldview]
- **Key Omissions**: [Standard tech you're NOT using and why]

### Epic Breakdown

#### Epic 1: Foundation & Opinionated Infrastructure
**Duration**: 1 sprint  
**Goal**: Establish foundation that makes our POV the path of least resistance

**Deliverables**:
1. **Repository Setup**
   - Module structure enforcing our worldview
   - Linting rules preventing anti-patterns
   - Types that make "wrong" implementations impossible

2. **Core Constraints**
   - [Technical constraints that enforce POV]
   - [Architectural decisions that prevent drift]
   - [Data models that only track what matters]

3. **Opinionated Shell**
   - UI that embodies our design philosophy
   - Navigation that reinforces our user model
   - Constraints that guide users to success

#### Epic 2: [Core Differentiating Module]
**Duration**: 2-3 sprints  
**Goal**: Build the module that most embodies our spiky POV
**Module**: `[core-differentiator]`

**Why This First**: This module is our biggest differentiator and validates our POV

**Sprint Breakdown**:
- Sprint 1: Core POV mechanics
- Sprint 2: Reinforcing constraints
- Sprint 3: Polish that emphasizes our difference

#### Epic 3: [Supporting Unique Module]
**Duration**: 1-2 sprints  
**Goal**: Enhance core POV with supporting functionality
**Module**: `[unique-module-2]`

[Continue with modules that reinforce your worldview]

### Data Models

#### What We Track (And What We Don't)

**Core Differentiator Models**:
```prisma
model [UniqueEntity] {
  id        String   @id
  // Fields that matter in our worldview
  // NOT including standard fields we reject
}
```

**What We Intentionally DON'T Store**:
- [Data that reinforces wrong behavior]
- [Metrics that don't align with our POV]
- [Attributes that enable anti-patterns]

### Features to Include (MVP)

#### By Module (POV-Aligned):

**[Core Differentiator] Module**:
- [Feature that embodies spiky POV]
- [Constraint that prevents misuse]
- [Unique capability only we offer]

**What Makes These Features Different**:
- [How they challenge conventions]
- [What they prevent users from doing]
- [How they guide toward our worldview]

### Features to Exclude (Forever)

#### Anti-Features (Things That Would Destroy Our Vision):
- [Common feature that goes against POV]
- [Expected capability we'll never add]
- [Pattern that would dilute our thesis]

#### Why These Are Excluded:
- [How they would undermine core belief]
- [What behavior they would enable]
- [How they'd turn us into another generic app]

### Success Metrics

**Metrics That Matter** (Based on Our POV):
- [Unique metric that only we would track]
- [Behavior change that proves our thesis]
- [Quality indicator others ignore]

**Vanity Metrics We Ignore**:
- [Common metric that doesn't align with POV]
- [Standard KPI that reinforces wrong behavior]

### Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users expect [conventional feature] | High | Education + strong onboarding showing why our way is better |
| POV is too radical | Medium | Start with early adopters who get it |
| Team drifts toward convention | High | Architecture makes conventional approach harder |

### Competitive Moat

**Why This Can't Be Copied**:
1. **Architectural Lock-in**: Our modules make conventional features hard to add
2. **User Mindset**: We attract users who reject the status quo
3. **Anti-Network Effects**: What works for others would break our model

---

*This PRD embodies our spiky POV. Every decision reinforces our non-consensus truth. Features we DON'T build are as important as those we do.*