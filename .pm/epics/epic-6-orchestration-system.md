# Epic 6: Intent Recognition & Orchestration System

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-6-orchestration-system`
2. **Base Branch**: Branch off from `main` 
3. **Commits**: Use conventional commits (e.g., `feat: add intent recognizer`, `fix: dependency resolution logic`)
4. **Pull Request**: 
   - Title: "Epic 6: Intent Recognition & Orchestration System"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**: 
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   - Ensure Epic 5 (Core Tools) is merged or coordinate with that developer
   
2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed
   
3. **Testing Requirements**:
   - Test intent recognition accuracy
   - Test multi-step workflow execution
   - Test dependency resolution (no circular dependencies)
   - Test parallel execution performance
   - Test cancellation at various points
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Coordination
- Check #dev-canvas channel in Slack/Discord for updates
- Don't modify files being worked on in other epics
- If you need changes in shared files (e.g., constants, types), coordinate with team

### Epic Start Process

Before implementing orchestration:

1. **Deep Dive Analysis** (Required)
   - Study AI SDK v5 orchestrator-worker patterns
   - Analyze existing tool execution flow
   - Understand current state management
   - Document async operation patterns
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study multi-agent orchestration systems
   - Research dependency resolution algorithms
   - Investigate parallel execution strategies
   - Compare different workflow engines

3. **Gap Identification**
   - Task queue implementation needed
   - Dependency graph algorithms
   - Progress tracking infrastructure
   - Cancellation mechanism design

### Epic End Process

1. **Quality Validation**
   - Complex workflows execute correctly
   - Dependencies properly resolved
   - Parallel execution optimized
   - Cancellation works reliably

2. **Integration Testing**
   - Test with 10+ step workflows
   - Test circular dependency detection
   - Test progress tracking accuracy
   - Verify memory management

3. **Documentation**
   - Orchestration pattern guide
   - Workflow template creation
   - Performance tuning guide

---

## Overview
This epic implements the orchestrator-worker pattern from AI SDK v5 to handle complex multi-step photo editing operations. We'll build an intent recognition system that parses user requests and orchestrates tool execution with proper dependency management.

## References
- [AI SDK v5 Orchestrator-Worker Pattern](https://v5.ai-sdk.dev/docs/foundations/agents#orchestrator-worker)
- [Multi-Step Tool Usage](https://v5.ai-sdk.dev/docs/foundations/agents#multi-step-tool-usage)
- [generateObject for Structured Planning](https://v5.ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)

## Key Implementation Details

### 1. Intent Recognition System

**File to Create**: `lib/ai/intent/recognizer.ts`
```typescript
import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@/lib/ai/providers'

const IntentSchema = z.object({
  primaryIntent: z.enum([
    'adjust-colors',
    'apply-effects',
    'transform-image',
    'enhance-quality',
    'creative-edit',
    'batch-process',
    'complex-workflow'
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.object({
    targets: z.array(z.enum(['whole-image', 'selection', 'layer', 'specific-area'])),
    adjustments: z.array(z.string()),
    parameters: z.record(z.any())
  }),
  suggestedTools: z.array(z.string()),
  complexity: z.enum(['simple', 'moderate', 'complex'])
})

export class IntentRecognizer {
  static async recognize(userRequest: string, context: CanvasContext) {
    const { object: intent } = await generateObject({
      model: openai('gpt-4o'),
      schema: IntentSchema,
      system: 'You are an expert at understanding photo editing requests...',
      prompt: userRequest
    })
    return intent
  }
}
```

### 2. Task Planner

**File to Create**: `lib/ai/orchestration/task-planner.ts`
```typescript
import { z } from 'zod'
import { generateObject } from 'ai'

const TaskPlanSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    toolName: z.string(),
    description: z.string(),
    dependencies: z.array(z.string()),
    params: z.any(),
    optional: z.boolean().default(false),
    estimatedDuration: z.number() // milliseconds
  })),
  totalEstimatedDuration: z.number(),
  requiresUserInput: z.boolean(),
  checkpoints: z.array(z.string()) // step IDs where to create checkpoints
})

export class TaskPlanner {
  static async planWorkflow(
    intent: Intent,
    availableTools: string[],
    context: CanvasContext
  ): Promise<TaskPlan> {
    // Use AI to generate execution plan
  }
}
```

### 3. Main Orchestrator

**File to Create**: `lib/ai/orchestration/orchestrator.ts`
```typescript
export class FotoFunOrchestrator {
  private workers: Map<string, BaseWorker>
  private executionQueue: TaskQueue
  
  async orchestrate(
    userRequest: string,
    context: CanvasContext,
    onProgress?: (step: string, progress: number) => void
  ) {
    // 1. Recognize intent
    const intent = await IntentRecognizer.recognize(userRequest, context)
    
    // 2. Plan workflow
    const plan = await TaskPlanner.planWorkflow(intent, this.getAvailableTools(), context)
    
    // 3. Validate plan
    await this.validatePlan(plan)
    
    // 4. Execute with dependency resolution
    return await this.executePlan(plan, onProgress)
  }
  
  private async executePlan(plan: TaskPlan, onProgress?: Function) {
    const results = new Map<string, any>()
    const completed = new Set<string>()
    
    while (completed.size < plan.steps.length) {
      // Get steps ready to execute (dependencies met)
      const readySteps = this.getReadySteps(plan, completed)
      
      // Execute in parallel where possible
      await Promise.all(readySteps.map(step => 
        this.executeStep(step, results, onProgress)
      ))
      
      // Mark as completed
      readySteps.forEach(step => completed.add(step.id))
    }
    
    return results
  }
}
```

### 4. Base Worker Class

**File to Create**: `lib/ai/workers/base-worker.ts`
```typescript
export abstract class BaseWorker<TInput = any, TOutput = any> {
  abstract name: string
  abstract description: string
  
  protected inputSchema: z.ZodType<TInput>
  protected outputSchema: z.ZodType<TOutput>
  
  async execute(input: unknown): Promise<TOutput> {
    const validatedInput = this.inputSchema.parse(input)
    const result = await this.performWork(validatedInput)
    return this.outputSchema.parse(result)
  }
  
  protected abstract performWork(input: TInput): Promise<TOutput>
}
```

### 5. Specialized Workers

**File to Create**: `lib/ai/workers/filter-chain-worker.ts`
```typescript
export class FilterChainWorker extends BaseWorker {
  name = 'FilterChainWorker'
  description = 'Applies multiple filters in optimal sequence'
  
  protected async performWork(input: FilterChainInput) {
    // Optimize filter order for performance
    const optimizedOrder = this.optimizeFilterOrder(input.filters)
    
    // Apply filters with progress tracking
    for (const filter of optimizedOrder) {
      await this.applyFilter(filter)
    }
  }
}
```

**File to Create**: `lib/ai/workers/batch-adjustment-worker.ts`
```typescript
export class BatchAdjustmentWorker extends BaseWorker {
  // Handles multiple adjustments efficiently
}
```

**File to Create**: `lib/ai/workers/selection-worker.ts`
```typescript
export class SelectionWorker extends BaseWorker {
  // Handles complex selection operations
}
```

### 6. Dependency Resolution

**File to Create**: `lib/ai/orchestration/dependency-resolver.ts`
```typescript
export class DependencyResolver {
  static resolveDependencies(steps: TaskStep[]): TaskStep[][] {
    // Topological sort to determine execution order
    // Returns array of arrays (batches that can run in parallel)
  }
  
  static validateNoCycles(steps: TaskStep[]): boolean {
    // Detect circular dependencies
  }
}
```

### 7. Progress Tracking

**File to Create**: `lib/ai/orchestration/progress-tracker.ts`
```typescript
export class ProgressTracker {
  private steps: Map<string, StepProgress>
  
  updateStepProgress(stepId: string, progress: number) {
    // Update individual step progress
  }
  
  getOverallProgress(): number {
    // Calculate weighted overall progress
  }
  
  getEstimatedTimeRemaining(): number {
    // Based on completed steps and estimates
  }
}
```

### 8. Workflow Templates

**File to Create**: `lib/ai/workflows/templates.ts`
```typescript
export const workflowTemplates = {
  'enhance-portrait': {
    name: 'Portrait Enhancement',
    steps: [
      { tool: 'adjustExposure', params: { auto: true } },
      { tool: 'enhanceSkinTone', params: {} },
      { tool: 'adjustSharpness', params: { amount: 20 } }
    ]
  },
  'vintage-effect': {
    name: 'Vintage Photo Effect',
    steps: [
      { tool: 'adjustSaturation', params: { amount: -30 } },
      { tool: 'applyVintageFilter', params: {} },
      { tool: 'addVignette', params: { strength: 40 } }
    ]
  }
}
```

### 9. Update API Route for Orchestration

**File to Modify**: `app/api/ai/chat/route.ts`
```typescript
import { FotoFunOrchestrator } from '@/lib/ai/orchestration/orchestrator'

const orchestrator = new FotoFunOrchestrator()

// In the API handler
const result = streamText({
  model: openai('gpt-4o'),
  messages: modelMessages,
  tools: {
    ...toolRegistry.toAISDKTools(),
    orchestrate: tool({
      description: 'Orchestrate complex multi-step operations',
      inputSchema: z.object({
        request: z.string(),
        useTemplate: z.string().optional()
      }),
      execute: async ({ request, useTemplate }) => {
        return await orchestrator.orchestrate(request, canvasContext)
      }
    })
  },
  maxSteps: 10, // Allow more steps for complex workflows
  system: orchestrationSystemPrompt,
})
```

### 10. Client-Side Integration

**File to Modify**: `components/editor/Panels/AIChat/index.tsx`
```typescript
// Add orchestration status display
// Show step-by-step progress
// Allow cancellation of long-running operations
```

**File to Create**: `components/editor/Panels/AIChat/OrchestrationProgress.tsx`
```typescript
export function OrchestrationProgress({ 
  steps, 
  currentStep, 
  progress,
  onCancel 
}: OrchestrationProgressProps) {
  // Display multi-step progress
  // Show current operation
  // Estimated time remaining
}
```

## Testing Requirements

**Files to Create**:
- `__tests__/ai/orchestration/orchestrator.test.ts`
- `__tests__/ai/orchestration/dependency-resolver.test.ts`
- `__tests__/ai/workers/filter-chain-worker.test.ts`

## Success Criteria
1. Complex requests correctly broken down into tool sequences
2. Dependencies properly resolved (no circular deps)
3. Parallel execution where possible
4. Progress tracking accurate within 10%
5. Workflow templates execute successfully
6. Cancellation works at any point

## Dependencies
- Epic 5 (Core Tools) must be complete
- AI SDK v5 generateObject
- Task queue implementation

## Estimated Effort
- 1 developer × 6-8 days
- Requires understanding of:
  - Graph algorithms (topological sort)
  - Async/await patterns
  - AI SDK v5 orchestration patterns
  - Worker thread patterns 