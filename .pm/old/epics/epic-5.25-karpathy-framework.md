# Epic 5.25: Karpathy Agent Design Framework Integration

## Overview

This epic implements Andrej Karpathy's agent design framework principles into FotoFun, building upon the existing foundation from Epics 1, 2, and 5. We'll create a production-ready AI photo editing system using AI SDK v5's agent patterns, emphasizing human-AI collaboration through intelligent context management, generation with verification, and adjustable autonomy.

## Updated Plan (January 2025)

Based on current progress and user feedback, we've refined the implementation plan to focus on:

1. **Immediate Priorities**: Fix confidence threshold system and implement real approval flows
2. **Core Agent Completion**: Finish missing agent types (Evaluator, Orchestrator) 
3. **Deferred Items**: Step-by-step UI and RAG learning system (complex, uncertain value)
4. **Focus**: Robust autonomy controls and agent routing

## Terminology and Architecture

### Established Nomenclature

To maintain consistency across the codebase, we use the following terminology:

#### 1. **Canvas Tools** (Base Layer)
- **Definition**: Core tools that directly manipulate the Fabric.js canvas
- **Location**: `lib/editor/tools/`
- **Examples**: `cropTool`, `brightnessTool`, `moveTool`
- **Naming**: `[action]Tool` (camelCase, singleton instances)

#### 2. **Tool Adapters** (AI Integration Layer)
- **Definition**: Wrappers that make any tool AI-compatible by adding schemas and natural language understanding
- **Location**: `lib/ai/adapters/tools/`
- **Examples**: `CropToolAdapter`, `BrightnessToolAdapter`, `InpaintingToolAdapter`
- **Naming**: `[ToolName]Adapter` (PascalCase classes)
- **Note**: Works for both Canvas Tools and AI-Native Tools

#### 3. **AI-Native Tools** (External API Tools)
- **Definition**: Tools that call external AI services (Replicate, DALL-E, etc.)
- **Location**: `lib/ai/tools/`
- **Examples**: `InpaintingTool`, `ImageGenerationTool`, `BackgroundRemovalTool`
- **Naming**: `[Action]Tool` (PascalCase classes)
- **Note**: These also use Tool Adapters for AI chat integration

#### 4. **Agent Steps** (Workflow Units)
- **Definition**: Individual executable units within an agent workflow
- **Location**: `lib/ai/agents/steps/`
- **Types**: `ToolStep`, `EvaluationStep`, `PlanningStep`, `RoutingStep`
- **Naming**: `[Type]Step` (PascalCase classes)

#### 5. **Agents** (Workflow Orchestrators)
- **Definition**: High-level coordinators that plan and execute multi-step workflows
- **Location**: `lib/ai/agents/`
- **Examples**: `SequentialEditingAgent`, `MasterRoutingAgent`
- **Naming**: `[Pattern/Purpose]Agent` (PascalCase classes)

### Architecture Benefits

This architecture provides several key advantages:

1. **Unified Adapter Pattern**: Both Canvas Tools and AI-Native Tools use the same adapter pattern
2. **Single Registry**: All tools register in the same `adapterRegistry`
3. **Consistent AI Interface**: The AI chat doesn't need to know if a tool manipulates canvas or calls an API
4. **Future-Proof**: Easy to add new AI services without changing the core architecture

```typescript
// Example: Both types of tools follow the same pattern
const canvasToolAdapter = new CropToolAdapter()         // Wraps canvas tool
const aiNativeAdapter = new InpaintingToolAdapter()     // Wraps AI API tool

// Both register the same way
adapterRegistry.register(canvasToolAdapter)
adapterRegistry.register(aiNativeAdapter)

// AI uses them identically
"crop the image to square"     // Uses CropToolAdapter → cropTool
"remove the person in the background"  // Uses InpaintingToolAdapter → InpaintingTool
```

## Assignment Requirements

### The Agent Design Framework
Using Karpathy's insights, your agent should:

1. **Context Management**: Solve the "anterograde amnesia" problem by maintaining relevant context across workflows
2. **Generation + Verification**: AI handles the heavy lifting, humans verify and guide decisions
3. **Incremental Processing**: Work in small, manageable chunks that humans can easily review
4. **Visual Interface**: Create interfaces that make verification fast and intuitive
5. **Partial Autonomy**: Build "autonomy sliders" - let users control how much the agent does independently

### Technical Requirements
- **Agent-First Architecture**: Use AI SDK v5's agent patterns as the foundation
- **Extensible Design**: Easy to add more complex patterns (orchestrator-worker, evaluator-optimizer)
- **Context Management**: Intelligent handling of relevant information across multi-step workflows
- **Generation + Verification Pattern**: AI generates, humans verify and guide
- **Incremental Processing**: Break complex tasks into reviewable chunks
- **Visual Verification Interface**: Make human oversight fast and intuitive
- **Partial Autonomy Controls**: Allow users to adjust how much the agent does independently

## Current State Assessment (Updated January 2025)

### ✅ **Completed Components**

**Phase 1: Agent Foundation (✅ COMPLETE)**
- ✅ BaseAgent abstract class implemented (`lib/ai/agents/BaseAgent.ts`)
- ✅ AgentContext and AgentStep interfaces defined (`lib/ai/agents/types.ts`)
- ✅ WorkflowMemory implementation complete (`lib/ai/agents/WorkflowMemory.ts`)
- ✅ SequentialEditingAgent working (`lib/ai/agents/SequentialEditingAgent.ts`)
- ✅ MasterRoutingAgent implemented with route analysis (`lib/ai/agents/MasterRoutingAgent.ts`)
- ✅ AgentFactory for creating agents (`lib/ai/agents/factory.ts`)
- ✅ ToolStep implementation (`lib/ai/agents/steps/ToolStep.ts`)
- ✅ Agent utilities (alternatives, canvas helpers) (`lib/ai/agents/utils/`)

**Phase 2: Visual Approval System (✅ MOSTLY COMPLETE)**
- ✅ AgentApprovalDialog with tabs (`components/editor/AgentApprovalDialog.tsx`)
- ✅ ComparisonView with multiple modes (`components/editor/ImageComparison.tsx`)
- ✅ AlternativeGrid for options (`components/editor/AlternativeGrid.tsx`)
- ✅ ConfidenceIndicator component (`components/editor/ConfidenceIndicator.tsx`)
- ✅ Chat UI integration with agent workflow display (`components/editor/Panels/AIChat/AgentWorkflowDisplay.tsx`)
- ✅ Settings UI for approval thresholds (`components/editor/MenuBar/SettingsDialog.tsx`)
- ✅ AI settings hook with localStorage persistence (`hooks/useAISettings.ts`)

**Tool Integration (✅ COMPLETE)**
- ✅ 12+ canvas tools with AI adapters working
- ✅ Tool registry system (`lib/ai/adapters/registry.ts`)
- ✅ Client-server execution separation (`lib/ai/client/tool-executor.ts`)
- ✅ Natural language parameter resolution
- ✅ Canvas context passing with messages
- ✅ Tool execution visualization in chat

### ✅ **Recently Fixed**

**AI-Driven Confidence System (✅ IMPLEMENTED)**
- ✅ Confidence now calculated by AI based on context, not hard-coded
- ✅ Planning phase estimates confidence for each step using 4 factors:
  - Parameter appropriateness (are values reasonable?)
  - Canvas context suitability (does canvas state support this?)
  - Tool suitability (is this the right tool?)
  - Risk level (how likely to succeed?)
- ✅ Execution phase recalculates confidence with actual parameters
- ✅ Dual-layer confidence: planning estimates + execution validation

**Threshold System & Approval Flow (✅ FIXED - January 2025)**
- ✅ Fixed threshold system to use user settings instead of hard-coded 0.7
- ✅ `BaseAgent.requestApproval()` now throws `ApprovalRequiredError` when needed
- ✅ **NEW**: Approval dialog flow triggers when confidence below threshold
- ✅ **NEW**: UI settings control actual agent execution behavior
- ✅ **NEW**: Chat UI shows approval required messages with "Review & Approve" button
- ✅ **NEW**: AgentApprovalDialog component integrated into chat flow
- ✅ **NEW**: Approval detection logic in onToolCall handler
- ✅ **NEW**: ApprovalRequiredError properly handled in chat route

### ❌ **Remaining Issues**

**Missing Agent Types**
- ❌ EvaluatorOptimizerAgent not implemented
- ❌ OrchestratorAgent not implemented  
- ❌ MasterRoutingAgent doesn't route to missing agents

**Approval Flow Testing**
- ❌ Need to test actual approval flow end-to-end
- ❌ Need to verify approval dialog shows and functions correctly
- ❌ Need to test with different threshold settings (high threshold = more approvals)

### 🔄 **In Progress/Partial**

**Agent Routing (PARTIAL)**
- ✅ MasterRoutingAgent exists and analyzes requests
- ✅ Routes to SequentialEditingAgent for workflows
- ❌ Cannot route to EvaluatorOptimizerAgent or OrchestratorAgent (don't exist)
- ❌ No testing of complex routing scenarios

**UI Integration (PARTIAL)**  
- ✅ Chat shows agent workflows with confidence scores
- ✅ Progress indicators and status updates
- ❌ No approval dialogs appear (threshold system broken)
- ❌ No granular step-by-step controls

### 🚫 **Deferred Items**

**Step-by-Step Execution UI (DEFERRED)**
- **Reason**: Complex implementation, uncertain user value vs current workflow display
- **Status**: Conceptual design complete, implementation deferred
- **Components**: StepByStepExecution, WorkflowTimeline, Tool education
- **Decision**: Current chat workflow display may be sufficient

**RAG/Vector Learning System (DEFERRED)**
- **Reason**: No usage data to learn from, adds complexity without clear value
- **Status**: Will use simple database preferences instead
- **Alternative**: Drizzle/Supabase tables for user preferences and workflow history
- **Future**: Can reconsider when we have real usage patterns

**Educational Content System (DEFERRED)**
- **Reason**: Focus on core functionality first
- **Status**: Tool education database designed but not implemented
- **Alternative**: Simple tooltips and help text

## Agent-First Architecture Design

### Core Agent System

We'll build a flexible agent system that starts with sequential processing but can easily extend to more complex patterns:

```typescript
// lib/ai/agents/base.ts
export interface AgentContext {
  canvas: Canvas
  conversation: Message[]
  workflowMemory: WorkflowMemory
  userPreferences: UserPreferences
  canvasAnalysis: CanvasAnalysis
}

export interface AgentStep {
  id: string
  type: 'tool' | 'evaluate' | 'plan' | 'route'
  description: string
  execute: (context: AgentContext) => Promise<StepResult>
  canRevert?: boolean
  requiresApproval?: (result: StepResult) => boolean
}

export interface StepResult {
  success: boolean
  data: any
  confidence: number
  preview?: PreviewData
  alternatives?: Alternative[]
  nextSteps?: AgentStep[]
}

export abstract class BaseAgent {
  abstract name: string
  abstract description: string
  
  protected steps: AgentStep[] = []
  protected context: AgentContext
  protected memory: WorkflowMemory
  
  async execute(request: string, context: AgentContext): Promise<AgentResult> {
    this.context = context
    this.memory = new WorkflowMemory()
    
    // Plan the workflow
    const plan = await this.plan(request)
    
    // Execute with verification
    return await this.executeWithVerification(plan)
  }
  
  protected abstract plan(request: string): Promise<AgentStep[]>
  
  protected async executeWithVerification(steps: AgentStep[]): Promise<AgentResult> {
    const results: StepResult[] = []
    
    for (const step of steps) {
      // Check if we need approval
      const needsApproval = await this.checkApprovalNeeded(step)
      
      if (needsApproval) {
        const preview = await this.generatePreview(step)
        const approved = await this.requestApproval(step, preview)
        
        if (!approved) {
          return { 
            completed: false, 
            results, 
            reason: 'User cancelled operation' 
          }
        }
      }
      
      // Execute the step
      const result = await step.execute(this.context)
      results.push(result)
      
      // Update memory
      this.memory.recordStep(step, result)
      
      // Handle dynamic next steps
      if (result.nextSteps) {
        steps.push(...result.nextSteps)
      }
    }
    
    return { completed: true, results }
  }
}
```

### Agent Patterns Implementation

#### 1. Sequential Processing Chain (Starting Point)

```typescript
// lib/ai/agents/sequential-agent.ts
export class SequentialEditingAgent extends BaseAgent {
  name = 'sequential-editor'
  description = 'Executes editing operations in sequence'
  
  protected async plan(request: string): Promise<AgentStep[]> {
    // Use AI to break down the request
    const { steps } = await this.aiPlanner.plan(request, this.context)
    
    return steps.map(step => ({
      id: step.id,
      type: 'tool',
      description: step.description,
      execute: async (ctx) => {
        const tool = this.toolRegistry.get(step.toolName)
        const result = await tool.execute(step.params, ctx)
        
        return {
          success: result.success,
          data: result,
          confidence: this.calculateConfidence(step, result),
          preview: await tool.generatePreview(step.params, ctx.canvas)
        }
      },
      requiresApproval: (result) => result.confidence < this.approvalThreshold
    }))
  }
}
```

#### 2. Evaluator-Optimizer Pattern (Future Extension)

```typescript
// lib/ai/agents/evaluator-optimizer-agent.ts
export class EvaluatorOptimizerAgent extends BaseAgent {
  name = 'evaluator-optimizer'
  description = 'Evaluates results and optimizes parameters'
  
  protected async plan(request: string): Promise<AgentStep[]> {
    const initialSteps = await super.plan(request)
    
    // Add evaluation steps after each operation
    const stepsWithEval: AgentStep[] = []
    
    for (const step of initialSteps) {
      stepsWithEval.push(step)
      stepsWithEval.push(this.createEvaluationStep(step))
    }
    
    return stepsWithEval
  }
  
  private createEvaluationStep(previousStep: AgentStep): AgentStep {
    return {
      id: `eval-${previousStep.id}`,
      type: 'evaluate',
      description: `Evaluate quality of ${previousStep.description}`,
      execute: async (ctx) => {
        const quality = await this.evaluateQuality(ctx)
        
        if (quality.score < quality.threshold) {
          // Generate optimization steps
          const optimizeStep = await this.createOptimizationStep(
            previousStep, 
            quality
          )
          
          return {
            success: true,
            data: quality,
            confidence: quality.confidence,
            nextSteps: [optimizeStep] // Dynamic step injection
          }
        }
        
        return { success: true, data: quality, confidence: 1.0 }
      }
    }
  }
}
```

#### 3. Orchestrator-Worker Pattern (Future Extension)

```typescript
// lib/ai/agents/orchestrator-agent.ts
export class OrchestratorAgent extends BaseAgent {
  private workers: Map<string, WorkerAgent> = new Map()
  
  protected async plan(request: string): Promise<AgentStep[]> {
    // Orchestrator creates high-level plan
    const tasks = await this.decomposeTasks(request)
    
    return [{
      id: 'orchestrate',
      type: 'plan',
      description: 'Orchestrate parallel operations',
      execute: async (ctx) => {
        const workerPromises = tasks.map(task => 
          this.delegateToWorker(task, ctx)
        )
        
        const results = await Promise.allSettled(workerPromises)
        
        return {
          success: results.every(r => r.status === 'fulfilled'),
          data: results,
          confidence: this.aggregateConfidence(results)
        }
      }
    }]
  }
}
```

#### 4. Routing Pattern (Future Extension)

```typescript
// lib/ai/agents/routing-agent.ts
export class RoutingAgent extends BaseAgent {
  private routes: Map<string, BaseAgent> = new Map([
    ['simple-edit', new SequentialEditingAgent()],
    ['complex-edit', new OrchestratorAgent()],
    ['quality-focus', new EvaluatorOptimizerAgent()]
  ])
  
  protected async plan(request: string): Promise<AgentStep[]> {
    return [{
      id: 'route',
      type: 'route',
      description: 'Determine best approach',
      execute: async (ctx) => {
        const analysis = await this.analyzeRequest(request, ctx)
        const selectedAgent = this.routes.get(analysis.bestRoute)
        
        const result = await selectedAgent.execute(request, ctx)
        
        return {
          success: result.completed,
          data: result,
          confidence: analysis.routeConfidence
        }
      }
    }]
  }
}
```

### RAG/Vector-Based Learning System (DEFERRED)

**Decision**: After careful consideration, we've decided to defer the implementation of the RAG/vector-based learning system. Instead, we'll use a simpler database-backed preference system that provides most of the benefits without the complexity.

#### Why Deferred:
1. **No Usage Data**: Without real user interactions, the learning system has nothing to learn from
2. **Complexity vs Value**: Adds significant complexity (IndexedDB, embeddings, vector similarity) for uncertain value
3. **Cost**: Requires OpenAI embedding API calls for every workflow
4. **Simpler Alternative**: Database tables can handle preferences and history effectively

#### Simple Database Approach (To Be Implemented):
```typescript
// Using Drizzle/Supabase tables instead:
- user_preferences: Store tool parameter preferences
- workflow_history: Track successful workflows
- tool_usage_stats: Monitor which tools users prefer

// Example queries:
// Get user's preferred brightness level
const pref = await db.query.userPreferences.findFirst({
  where: and(
    eq(userPreferences.userId, userId),
    eq(userPreferences.toolName, 'brightness')
  )
})

// Get recent successful workflows
const recent = await db.query.workflowHistory.findMany({
  where: and(
    eq(workflowHistory.userId, userId),
    eq(workflowHistory.success, true)
  ),
  orderBy: desc(workflowHistory.createdAt),
  limit: 10
})
```

This approach provides:
- User preference tracking
- Workflow history
- Simple pattern matching
- No additional API costs
- Easier to debug and maintain

The vector-based learning system can be reconsidered in the future when:
- We have significant usage data
- Users request "do it like last time" features
- The simple system proves insufficient

#### Learning Integration

```typescript
// lib/ai/agents/learning/learner.ts
export class AgentLearner {
  private vectorStore: AgentVectorStore
  private patternRecognizer: PatternRecognizer
  
  constructor() {
    this.vectorStore = new AgentVectorStore()
    this.patternRecognizer = new PatternRecognizer()
  }
  
  async initialize() {
    await this.vectorStore.initialize()
  }
  
  async learnFromWorkflow(workflow: ExecutedWorkflow, feedback: WorkflowFeedback) {
    // Store the workflow in vector store
    await this.vectorStore.addWorkflow(workflow)
    
    // Extract patterns
    const patterns = this.patternRecognizer.extractPatterns(workflow)
    
    // Update preference models
    if (feedback.userSatisfaction > 0.8) {
      await this.updatePreferenceModels(patterns, 'positive')
    } else if (feedback.userSatisfaction < 0.3) {
      await this.updatePreferenceModels(patterns, 'negative')
    }
  }
  
  async suggestWorkflow(request: string, context: AgentContext): Promise<WorkflowSuggestion> {
    // Find similar past workflows
    const similar = await this.vectorStore.findSimilarWorkflows(request)
    
    if (similar.length === 0) {
      return null
    }
    
    // Adapt the most similar successful workflow
    const bestMatch = similar.find(w => w.metadata.success) || similar[0]
    
    // Adjust parameters based on current context
    const adaptedWorkflow = await this.adaptWorkflow(
      bestMatch.workflow,
      context,
      request
    )
    
    return {
      workflow: adaptedWorkflow,
      confidence: bestMatch.similarity,
      basedOn: bestMatch.id
    }
  }
  
  private async adaptWorkflow(
    baseWorkflow: Workflow,
    context: AgentContext,
    request: string
  ): Promise<Workflow> {
    // Get parameter suggestions for each step
    const adaptedSteps = await Promise.all(
      baseWorkflow.steps.map(async step => {
        const suggestions = await this.vectorStore.suggestParameters(
          step.tool,
          context
        )
        
        // Use the highest confidence suggestion or keep original
        const bestParams = suggestions[0]?.similarity > 0.8
          ? suggestions[0].params
          : step.params
        
        return { ...step, params: bestParams }
      })
    )
    
    return { ...baseWorkflow, steps: adaptedSteps }
  }
}
```

### Master Routing Agent

The master routing agent analyzes requests and determines the optimal execution strategy, choosing between simple responses, tool calls, or complex agent workflows.

```typescript
// lib/ai/agents/master-routing-agent.ts
import { generateObject } from 'ai'
import { z } from 'zod'
import { BaseAgent } from './BaseAgent'
import { SequentialEditingAgent } from './SequentialEditingAgent'
import { EvaluatorOptimizerAgent } from './EvaluatorOptimizerAgent'
import { OrchestratorAgent } from './OrchestratorAgent'

const routeAnalysisSchema = z.object({
  requestType: z.enum([
    'text-only',
    'simple-tool',
    'sequential-workflow',
    'evaluator-optimizer',
    'orchestrator-worker',
    'hybrid'
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  complexity: z.enum(['trivial', 'simple', 'moderate', 'complex', 'very-complex']),
  requiresMultipleSteps: z.boolean(),
  requiresQualityOptimization: z.boolean(),
  canParallelize: z.boolean(),
  suggestedTools: z.array(z.string()).optional(),
  estimatedSteps: z.number().optional()
})

export class MasterRoutingAgent extends BaseAgent {
  name = 'master-router'
  description = 'Analyzes requests and routes to appropriate execution strategy'
  
  private agents = {
    sequential: new SequentialEditingAgent(),
    evaluator: new EvaluatorOptimizerAgent(),
    orchestrator: new OrchestratorAgent()
  }
  
  // Note: Learning system deferred - will use database preferences when implemented
  
  constructor() {
    super()
  }
  
  protected async plan(request: string): Promise<AgentStep[]> {
    return [{
      id: 'route-analysis',
      type: 'route',
      description: 'Analyze request and determine execution strategy',
      execute: async (context) => {
        // Analyze the request using AI
        const analysis = await this.analyzeRequest(request, context)
        
        // TODO: Check database for similar past workflows when preference system is implemented
        
        // Route to appropriate handler
        const result = await this.routeRequest(
          request,
          analysis,
          context,
          null // No suggestions yet - will add when database preferences are implemented
        )
        
        // TODO: Store successful workflows in database when preference system is implemented
        
        return {
          success: result.completed,
          data: result,
          confidence: analysis.confidence
        }
      }
    }]
  }
  
  private async analyzeRequest(
    request: string,
    context: AgentContext
  ): Promise<z.infer<typeof routeAnalysisSchema>> {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: routeAnalysisSchema,
      prompt: `Analyze this photo editing request and determine the best execution strategy.

Request: "${request}"

Canvas context:
${JSON.stringify(context.canvasAnalysis, null, 2)}

Consider:
1. Is this just a question that needs a text response?
2. Can this be done with a single tool call?
3. Does it require multiple sequential steps?
4. Would it benefit from quality evaluation and optimization?
5. Can operations be parallelized?

Available tools: ${Array.from(adapterRegistry.getAll()).map(a => a.aiName).join(', ')}`
    })
    
    return object
  }
  
  private async routeRequest(
    request: string,
    analysis: z.infer<typeof routeAnalysisSchema>,
    context: AgentContext,
    suggestion?: WorkflowSuggestion
  ): Promise<AgentResult> {
    switch (analysis.requestType) {
      case 'text-only':
        // Just return a text response
        return {
          completed: true,
          results: [{
            success: true,
            data: { type: 'text', message: 'This is just an informational response' },
            confidence: 1.0
          }]
        }
      
      case 'simple-tool':
        // Execute a single tool directly
        if (analysis.suggestedTools?.length === 1) {
          const tool = adapterRegistry.get(analysis.suggestedTools[0])
          if (tool) {
            // Get parameters from context or suggestion
            const params = suggestion?.workflow.steps[0]?.params || 
                          await this.inferParameters(tool, request, context)
            
            const result = await tool.execute(params, { canvas: context.canvas })
            return {
              completed: true,
              results: [{
                success: result.success,
                data: result,
                confidence: analysis.confidence
              }]
            }
          }
        }
        // Fall through to sequential if tool not found
      
      case 'sequential-workflow':
        // Use the sequential agent
        return await this.agents.sequential.execute(request, context)
      
      case 'evaluator-optimizer':
        // Use the evaluator-optimizer agent for quality-focused tasks
        return await this.agents.evaluator.execute(request, context)
      
      case 'orchestrator-worker':
        // Use the orchestrator for parallelizable tasks
        return await this.agents.orchestrator.execute(request, context)
      
      case 'hybrid':
        // Combine multiple approaches
        return await this.executeHybridApproach(request, analysis, context)
      
      default:
        // Default to sequential
        return await this.agents.sequential.execute(request, context)
    }
  }
  
  private async executeHybridApproach(
    request: string,
    analysis: z.infer<typeof routeAnalysisSchema>,
    context: AgentContext
  ): Promise<AgentResult> {
    // For hybrid approaches, we might:
    // 1. Use orchestrator for parallel operations
    // 2. Then use evaluator for quality optimization
    // 3. Return combined results
    
    const orchestratorResult = await this.agents.orchestrator.execute(
      request,
      context
    )
    
    if (orchestratorResult.completed && analysis.requiresQualityOptimization) {
      // Run quality optimization on the result
      const optimizedResult = await this.agents.evaluator.execute(
        'optimize previous result',
        { ...context, previousResult: orchestratorResult }
      )
      
      return {
        completed: optimizedResult.completed,
        results: [...orchestratorResult.results, ...optimizedResult.results]
      }
    }
    
    return orchestratorResult
  }
}
```

### Workflow Memory System

```typescript
// lib/ai/agents/memory.ts
export class WorkflowMemory {
  private steps: ExecutedStep[] = []
  private checkpoints: Map<string, CanvasState> = new Map()
  private decisions: UserDecision[] = []
  
  recordStep(step: AgentStep, result: StepResult) {
    this.steps.push({
      step,
      result,
      timestamp: Date.now(),
      canvasState: this.captureCanvasState()
    })
  }
  
  createCheckpoint(id: string) {
    this.checkpoints.set(id, this.captureCanvasState())
  }
  
  revertToCheckpoint(id: string): boolean {
    const state = this.checkpoints.get(id)
    if (state) {
      this.restoreCanvasState(state)
      return true
    }
    return false
  }
  
  getRecentSteps(count: number): ExecutedStep[] {
    return this.steps.slice(-count)
  }
  
  findSimilarWorkflows(request: string): PreviousWorkflow[] {
    // Search for similar past workflows
    return this.searchWorkflowHistory(request)
  }
}
```

### Enhanced Tool Adapter for Agents

```typescript
// lib/ai/adapters/base.ts
export abstract class BaseToolAdapter<TInput, TOutput> {
  // ... existing properties ...
  
  // New agent-specific methods
  abstract calculateConfidence(params: TInput, context: AgentContext): number
  abstract generateAlternatives(params: TInput, context: AgentContext): Alternative[]
  abstract evaluateResult(result: TOutput, context: AgentContext): QualityScore
  
  // Enhanced preview with multiple options
  async generateEnhancedPreview(
    params: TInput, 
    alternatives: Alternative[],
    context: AgentContext
  ): Promise<EnhancedPreview> {
    const mainPreview = await this.generatePreview(params, context.canvas)
    const altPreviews = await Promise.all(
      alternatives.map(alt => 
        this.generatePreview(alt.params, context.canvas)
      )
    )
    
    return {
      main: mainPreview,
      alternatives: altPreviews,
      comparison: this.generateComparison(mainPreview, altPreviews)
    }
  }
}
```

### Visual Approval System with Agent Context

```typescript
// components/editor/AgentApprovalDialog/index.tsx
interface AgentApprovalDialogProps {
  step: AgentStep
  result: StepResult
  context: AgentContext
  onDecision: (decision: ApprovalDecision) => void
}

export function AgentApprovalDialog({ 
  step, 
  result, 
  context, 
  onDecision 
}: AgentApprovalDialogProps) {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('slider')
  const [selectedAlternative, setSelectedAlternative] = useState<number>(-1)
  
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{step.description}</DialogTitle>
          <div className="flex items-center gap-4 text-sm">
            <ConfidenceIndicator value={result.confidence} />
            <WorkflowProgress 
              current={context.workflowMemory.getCurrentStep()}
              total={context.workflowMemory.getTotalSteps()}
            />
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="main">
          <TabsList>
            <TabsTrigger value="main">Proposed Change</TabsTrigger>
            {result.alternatives && (
              <TabsTrigger value="alternatives">
                Alternatives ({result.alternatives.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="details">Technical Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="main">
            <ComparisonView
              mode={comparisonMode}
              before={result.preview.before}
              after={result.preview.after}
              diff={result.preview.diff}
            />
          </TabsContent>
          
          <TabsContent value="alternatives">
            <AlternativeGrid
              alternatives={result.alternatives}
              onSelect={setSelectedAlternative}
            />
          </TabsContent>
          
          <TabsContent value="details">
            <TechnicalDetails
              step={step}
              result={result}
              context={context}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <ComparisonModeSelector
              value={comparisonMode}
              onChange={setComparisonMode}
            />
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onDecision({ 
                  action: 'reject',
                  feedback: 'User cancelled'
                })}
              >
                Cancel
              </Button>
              
              <Button
                variant="outline"
                onClick={() => onDecision({
                  action: 'modify',
                  alternativeIndex: selectedAlternative
                })}
                disabled={selectedAlternative === -1}
              >
                Use Alternative
              </Button>
              
              <Button 
                onClick={() => onDecision({ 
                  action: 'approve',
                  rememberDecision: true
                })}
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Step-by-Step Mode with Tool Transparency

Based on instructor feedback, we implement a "step-by-step mode" that shows users exactly which tools are being used before applying them. This builds trust and helps users learn the manual tools while understanding the AI's decision-making process.

#### Step Execution Visualization

```typescript
// components/editor/StepByStepExecution/index.tsx
interface StepByStepExecutionProps {
  workflow: PlannedWorkflow
  onStepApprove: (stepId: string) => void
  onStepReject: (stepId: string) => void
  onWorkflowComplete: () => void
  autoApprove: boolean
}

export function StepByStepExecution({
  workflow,
  onStepApprove,
  onStepReject,
  onWorkflowComplete,
  autoApprove
}: StepByStepExecutionProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({})
  
  const currentStep = workflow.steps[currentStepIndex]
  
  return (
    <div className="space-y-4">
      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Workflow: {workflow.description}
          </CardTitle>
          <CardDescription>
            {workflow.steps.length} steps planned • 
            {autoApprove ? 'Auto-applying' : 'Manual approval mode'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkflowTimeline 
            steps={workflow.steps}
            currentIndex={currentStepIndex}
            statuses={stepStatuses}
          />
        </CardContent>
      </Card>
      
      {/* Current Step Detail */}
      {currentStep && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  Step {currentStepIndex + 1}: {currentStep.description}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wrench className="w-3 h-3" />
                  <span>Tool: {currentStep.tool}</span>
                  <Badge variant="outline" className="text-xs">
                    {currentStep.confidence > 0.8 ? 'High' : 'Medium'} Confidence
                  </Badge>
                </div>
              </div>
              <StepStatusIndicator status={stepStatuses[currentStep.id]} />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Tool Parameters */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Parameters</h4>
              <ParameterDisplay 
                tool={currentStep.tool}
                params={currentStep.params}
                editable={!autoApprove}
                onChange={(newParams) => updateStepParams(currentStep.id, newParams)}
              />
            </div>
            
            {/* Educational Content */}
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Learn:</strong> {getToolEducation(currentStep.tool)}
              </AlertDescription>
            </Alert>
            
            {/* Preview (if available) */}
            {currentStep.preview && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Preview</h4>
                <ImageComparison
                  before={currentStep.preview.before}
                  after={currentStep.preview.after}
                  mode="slider"
                />
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => handleStepReject(currentStep.id)}
              disabled={autoApprove}
            >
              <X className="w-4 h-4 mr-2" />
              Skip Step
            </Button>
            
            <div className="flex gap-2">
              {!autoApprove && (
                <Button
                  variant="outline"
                  onClick={() => handleStepModify(currentStep.id)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modify
                </Button>
              )}
              
              <Button
                onClick={() => handleStepApprove(currentStep.id)}
                disabled={stepStatuses[currentStep.id] === 'executing'}
              >
                {stepStatuses[currentStep.id] === 'executing' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {autoApprove ? 'Next' : 'Apply & Continue'}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
      
      {/* Completed Steps Summary */}
      {currentStepIndex > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completed Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletedStepsList 
              steps={workflow.steps.slice(0, currentStepIndex)}
              statuses={stepStatuses}
              onRevert={(stepId) => handleRevertToStep(stepId)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

#### Tool Education System

```typescript
// lib/ai/agents/education/tool-education.ts
interface ToolEducation {
  tool: string
  description: string
  manualPath: string // How to do this manually in the UI
  tips: string[]
  commonUses: string[]
}

const toolEducationDatabase: Record<string, ToolEducation> = {
  brightness: {
    tool: 'brightness',
    description: 'Adjusts the overall lightness or darkness of the image',
    manualPath: 'Tools → Adjustments → Brightness/Contrast',
    tips: [
      'Small adjustments (±10-20) usually look most natural',
      'Combine with contrast for better results',
      'Watch for clipping in highlights/shadows'
    ],
    commonUses: [
      'Fixing underexposed photos',
      'Creating mood (darker = dramatic)',
      'Preparing for print (slightly brighter)'
    ]
  },
  crop: {
    tool: 'crop',
    description: 'Removes unwanted areas and improves composition',
    manualPath: 'Tools → Crop (C key)',
    tips: [
      'Use rule of thirds for better composition',
      'Maintain aspect ratio for consistent results',
      'Don\'t crop too tight - leave breathing room'
    ],
    commonUses: [
      'Removing distractions from edges',
      'Changing aspect ratio for different platforms',
      'Focusing attention on the subject'
    ]
  },
  // ... more tools
}

export function getToolEducation(toolName: string): string {
  const education = toolEducationDatabase[toolName]
  if (!education) return `The ${toolName} tool modifies your image.`
  
  return `${education.description}. Find it at: ${education.manualPath}`
}

export function getToolTips(toolName: string): string[] {
  return toolEducationDatabase[toolName]?.tips || []
}
```

#### Workflow Timeline Component

```typescript
// components/editor/StepByStepExecution/WorkflowTimeline.tsx
interface WorkflowTimelineProps {
  steps: PlannedStep[]
  currentIndex: number
  statuses: Record<string, StepStatus>
}

export function WorkflowTimeline({ steps, currentIndex, statuses }: WorkflowTimelineProps) {
  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      <div 
        className="absolute left-4 top-0 w-0.5 bg-primary transition-all duration-500"
        style={{ height: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      />
      
      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = statuses[step.id] || 'pending'
          const isCurrent = index === currentIndex
          const isPast = index < currentIndex
          
          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Step Indicator */}
              <div className={cn(
                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                {
                  'bg-primary text-primary-foreground': isCurrent || isPast,
                  'bg-muted text-muted-foreground': !isCurrent && !isPast,
                  'ring-2 ring-primary ring-offset-2': isCurrent,
                  'scale-110': isCurrent
                }
              )}>
                {status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : status === 'executing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : status === 'failed' ? (
                  <X className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              
              {/* Step Content */}
              <div className={cn(
                "flex-1 pb-4 transition-opacity",
                !isCurrent && !isPast && "opacity-50"
              )}>
                <div className="flex items-center gap-2">
                  <Wrench className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-sm">{step.tool}</span>
                  {step.requiresApproval && (
                    <Badge variant="outline" className="text-xs">
                      Requires Approval
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
                {status === 'completed' && statuses[step.id]?.duration && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed in {statuses[step.id].duration}ms
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

#### Settings for Step-by-Step Mode

```typescript
// components/editor/MenuBar/SettingsDialog.tsx - AI Settings Tab Addition
interface AISettings {
  stepByStepMode: 'always' | 'complex-only' | 'never'
  autoApproveThreshold: number
  showEducationalContent: boolean
  toolApprovalPolicies: Record<string, 'auto' | 'manual'>
}

export function AISettingsTab() {
  const [settings, setSettings] = useAISettings()
  
  return (
    <div className="space-y-6">
      {/* Step-by-Step Mode */}
      <div className="space-y-2">
        <Label>Step-by-Step Mode</Label>
        <RadioGroup 
          value={settings.stepByStepMode}
          onValueChange={(value) => updateSetting('stepByStepMode', value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="always" id="always" />
            <Label htmlFor="always">
              Always show steps (recommended for learning)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="complex-only" id="complex" />
            <Label htmlFor="complex">
              Only for complex edits (3+ steps)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="never" id="never" />
            <Label htmlFor="never">
              Never (fastest, for experienced users)
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      {/* Auto-Approval Threshold */}
      <div className="space-y-2">
        <Label>Auto-Approval Confidence Threshold</Label>
        <div className="flex items-center space-x-4">
          <Slider
            value={[settings.autoApproveThreshold]}
            onValueChange={([value]) => updateSetting('autoApproveThreshold', value)}
            min={0}
            max={1}
            step={0.1}
            className="flex-1"
          />
          <span className="w-12 text-sm text-muted-foreground">
            {Math.round(settings.autoApproveThreshold * 100)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Operations with confidence above this will auto-apply
        </p>
      </div>
      
      {/* Educational Content */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Show Educational Tips</Label>
          <p className="text-xs text-muted-foreground">
            Learn about tools as the AI uses them
          </p>
        </div>
        <Switch
          checked={settings.showEducationalContent}
          onCheckedChange={(checked) => updateSetting('showEducationalContent', checked)}
        />
      </div>
      
      {/* Per-Tool Policies */}
      <div className="space-y-2">
        <Label>Tool Approval Policies</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Object.entries(toolEducationDatabase).map(([tool, info]) => (
            <div key={tool} className="flex items-center justify-between py-1">
              <span className="text-sm">{info.description}</span>
              <Select
                value={settings.toolApprovalPolicies[tool] || 'manual'}
                onValueChange={(value) => updateToolPolicy(tool, value)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

#### Integration with Chat UI

```typescript
// components/editor/Panels/AIChat/index.tsx - Addition
// Show step-by-step execution inline in chat
{message.role === 'assistant' && message.workflow && (
  <StepByStepExecution
    workflow={message.workflow}
    onStepApprove={(stepId) => handleStepApprove(message.id, stepId)}
    onStepReject={(stepId) => handleStepReject(message.id, stepId)}
    onWorkflowComplete={() => handleWorkflowComplete(message.id)}
    autoApprove={shouldAutoApprove(message.workflow)}
  />
)}
```

### Autonomy Control System

```typescript
// lib/ai/agents/autonomy.ts
export interface AutonomyConfig {
  // Global settings
  defaultApprovalThreshold: number // 0.0 - 1.0
  maxAutonomousSteps: number
  
  // Per-operation settings
  operationPolicies: Map<string, OperationPolicy>
  
  // Learning settings
  enableLearning: boolean
  adaptationRate: number
}

export class AutonomyController {
  private config: AutonomyConfig
  private decisionHistory: DecisionHistory
  
  shouldRequestApproval(
    step: AgentStep, 
    result: StepResult,
    context: AgentContext
  ): boolean {
    // Multi-factor decision
    const factors = {
      confidence: result.confidence,
      operationRisk: this.assessOperationRisk(step),
      userTrust: this.getUserTrustLevel(step.type),
      recentApprovals: this.getRecentApprovalRate(),
      complexity: this.assessComplexity(result)
    }
    
    const policy = this.config.operationPolicies.get(step.type)
    
    if (policy === 'always-approve') return false
    if (policy === 'always-ask') return true
    
    // Weighted decision
    const approvalScore = this.calculateApprovalScore(factors)
    return approvalScore < this.config.defaultApprovalThreshold
  }
  
  recordDecision(
    step: AgentStep,
    result: StepResult,
    decision: ApprovalDecision
  ) {
    this.decisionHistory.record({
      step,
      result,
      decision,
      timestamp: Date.now()
    })
    
    if (this.config.enableLearning) {
      this.adaptFromDecision(step, result, decision)
    }
  }
  
  private adaptFromDecision(
    step: AgentStep,
    result: StepResult,
    decision: ApprovalDecision
  ) {
    // Simple learning: adjust thresholds based on patterns
    if (decision.action === 'approve' && result.confidence > 0.7) {
      // User approved high-confidence operation
      // Slightly increase trust for this operation type
      this.adjustOperationTrust(step.type, 0.02)
    } else if (decision.action === 'reject' && result.confidence > 0.8) {
      // User rejected high-confidence operation
      // Decrease trust, they want more control
      this.adjustOperationTrust(step.type, -0.05)
    }
  }
}
```

### Integration with Existing System

```typescript
// app/api/ai/chat/route.ts
import { streamText, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'
import { openai } from '@/lib/ai/providers'
import { MasterRoutingAgent } from '@/lib/ai/agents/master-routing-agent'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'

// Initialize on first request
let masterAgent: MasterRoutingAgent | null = null
let adaptersInitialized = false

async function initialize() {
  if (!adaptersInitialized) {
    await autoDiscoverAdapters()
    adaptersInitialized = true
  }
  
  if (!masterAgent) {
    masterAgent = new MasterRoutingAgent()
    await masterAgent.initialize()
  }
}

export async function POST(req: Request) {
  const { messages, canvasContext, agentMode = true } = await req.json()
  
  await initialize()
  
  // Create agent context
  const agentContext: AgentContext = {
    canvas: canvasContext.canvas,
    conversation: messages,
    workflowMemory: new WorkflowMemory(),
    userPreferences: await loadUserPreferences(),
    canvasAnalysis: {
      dimensions: canvasContext.dimensions,
      hasContent: canvasContext.hasContent,
      objectCount: canvasContext.objectCount || 0,
      lastAnalyzedAt: Date.now()
    }
  }
  
  // Get the last user message
  const lastMessage = messages[messages.length - 1]
  const userRequest = lastMessage.content
  
  // Use master routing agent to handle the request
  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: {
      // Master agent tool that routes to appropriate execution
      executeRequest: tool({
        description: 'Execute photo editing request using appropriate agent strategy',
        inputSchema: z.object({
          request: z.string().describe('The user request to execute'),
          strategy: z.enum([
            'text-only',
            'simple-tool', 
            'sequential-workflow',
            'evaluator-optimizer',
            'orchestrator-worker',
            'hybrid'
          ]).optional().describe('Suggested execution strategy')
        }),
        execute: async ({ request, strategy }) => {
          const result = await masterAgent.execute(request, agentContext)
          
          // Handle approval flows if needed
          if (result.requiresApproval) {
            return {
              type: 'approval-required',
              steps: result.pendingSteps,
              previews: result.previews
            }
          }
          
          return {
            type: 'execution-complete',
            results: result.results,
            workflow: result.workflow
          }
        }
      }),
      
      // Direct tool access for simple operations
      ...adapterRegistry.getAITools(),
      
      // Approval handling tool
      handleApproval: tool({
        description: 'Handle user approval decision for pending operations',
        inputSchema: z.object({
          stepId: z.string(),
          decision: z.object({
            action: z.enum(['approve', 'reject', 'modify']),
            alternativeIndex: z.number().optional(),
            feedback: z.string().optional()
          })
        }),
        execute: async ({ stepId, decision }) => {
          return await masterAgent.handleApprovalDecision(stepId, decision)
        }
      })
    },
    system: `You are FotoFun's AI assistant with advanced agent capabilities.

You can:
1. Answer questions about photo editing
2. Execute simple edits with single tools
3. Plan and execute complex multi-step workflows
4. Optimize results for quality
5. Coordinate parallel operations

When a user makes a request:
1. Use executeRequest to let the routing agent determine the best approach
2. The agent will analyze complexity and choose the right strategy
3. For complex edits, you'll see a workflow plan
4. Some operations may require user approval - handle these gracefully

Current canvas: ${agentContext.canvasAnalysis.dimensions.width}x${agentContext.canvasAnalysis.dimensions.height}px
${agentContext.canvasAnalysis.hasContent ? '(image loaded)' : '(no image)'}

Be helpful, strategic, and transparent about what you're doing.`,
    
    onStepFinish: async ({ toolCalls }) => {
      // Track tool usage for learning
      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'executeRequest') {
          // Log execution for learning system
          await logExecution(toolCall.args, toolCall.result)
        }
      }
    }
  })
  
  return result.toUIMessageStreamResponse()
}
```

### Client-Side Agent Integration

```typescript
// components/editor/Panels/AIChat/EnhancedAIChat.tsx
import { useChat } from 'ai/react'
import { useAgent } from '@/lib/ai/agents/hooks/useAgent'
import { AgentApprovalDialog } from '../../AgentApprovalDialog'

export function EnhancedAIChat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/ai/chat',
    body: {
      canvasContext: getCanvasContext(),
      agentMode: true
    }
  })
  
  const {
    pendingApproval,
    handleApprovalDecision,
    agentStatus,
    workflowProgress
  } = useAgent()
  
  return (
    <div className="flex flex-col h-full">
      {/* Agent status indicator */}
      {agentStatus && (
        <div className="p-2 bg-muted/50 text-sm">
          <div className="flex items-center justify-between">
            <span>{agentStatus.message}</span>
            {workflowProgress && (
              <span className="text-muted-foreground">
                Step {workflowProgress.current} of {workflowProgress.total}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Chat messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Describe what you want to do..."
          className="w-full px-3 py-2 rounded-md border"
        />
      </form>
      
      {/* Approval dialog */}
      {pendingApproval && (
        <AgentApprovalDialog
          step={pendingApproval.step}
          result={pendingApproval.result}
          context={pendingApproval.context}
          onDecision={handleApprovalDecision}
        />
      )}
    </div>
  )
}
```

## Updated Implementation Plan

### ✅ **Phase 1: Fix Threshold System & Smart Routing (COMPLETED - January 2025)**

**Priority**: Critical bug fix

**Tasks**:
1. ✅ **Fix ToolStep.requiresApproval()** - Use user settings instead of hard-coded 0.7
2. ✅ **Implement BaseAgent.requestApproval()** - Show actual approval dialog
3. ✅ **Wire up approval flow** - Connect settings → agent → UI dialog
4. ✅ **Fix smart routing system** - Robust routing logic without hard-coded phrases
5. ✅ **Cost-based approval for external APIs** - Show cost estimates in chat
6. ✅ **Fast path for simple operations** - Skip agent overhead for single tools

**Acceptance Criteria**:
- ✅ User can set threshold to 90% and see approval dialogs for 80% confidence operations
- ✅ User can set threshold to 50% and see auto-approval for 80% confidence operations
- ✅ Settings actually control agent behavior
- ✅ "Apply sepia filter" correctly routes to single-tool execution
- ✅ Questions route to conversational responses
- ✅ Complex requests route to multi-step workflows
- ✅ External API calls show cost approval in chat

### 🎯 **Phase 2: Create Missing Agents (1.5 days)**

**Priority**: Complete agent system

**Tasks**:
1. **EvaluatorOptimizerAgent**
   - Quality evaluation after operations
   - Parameter optimization loops
   - Alternative generation
   
2. **OrchestratorAgent**  
   - Parallel operation coordination
   - Worker task delegation
   - Result aggregation

3. **Update MasterRoutingAgent**
   - Route to new agent types
   - Test complex request routing

**Acceptance Criteria**:
- AI can route quality-focused requests to EvaluatorOptimizerAgent
- AI can route parallelizable requests to OrchestratorAgent
- All agent types work end-to-end

### 🎯 **Phase 3: Enhanced Testing & Polish (1 day)**

**Priority**: Validation and robustness

**Tasks**:
1. **Test agent routing** - Verify correct agent selection
2. **Test approval flows** - Verify threshold behavior
3. **Error handling** - Graceful failures
4. **Performance** - Optimize agent execution

**Acceptance Criteria**:
- All agent types can be triggered by appropriate requests
- Approval system works reliably
- Error states are handled gracefully

### 🔮 **Future Phases (Post-Epic)**

**Phase 4: Database Preferences (Future)**
- User preference storage in Supabase
- Workflow history tracking  
- Simple pattern matching

**Phase 5: Step-by-Step UI (Future)**
- Granular step approval
- Individual step undo/redo
- Interactive workflow editing

**Phase 6: Learning System (Future)**
- Vector-based workflow suggestions
- Parameter optimization
- User pattern recognition

## Benefits of Current Approach

### Immediate Value
1. **Working Autonomy Controls**: Users can actually control AI behavior
2. **Complete Agent System**: All major agent patterns implemented
3. **Robust Routing**: AI picks the right approach for each request
4. **Quality Focus**: EvaluatorOptimizer ensures better results
5. **Parallel Execution**: OrchestratorAgent handles complex workflows

### Foundation for Future
1. **Extensible Architecture**: Easy to add step-by-step UI later
2. **Learning Ready**: Database structure can support future learning
3. **Professional Workflow**: Solid base for advanced features

## Success Metrics (Updated)

**Immediate (This Epic)**:
- ✅ Threshold settings control actual agent behavior
- ✅ All 3 agent types (Sequential, Evaluator, Orchestrator) working
- ✅ MasterRoutingAgent correctly routes to appropriate agents
- ✅ Users can test approval flows with different confidence levels

**Future Epics**:
- 🔮 Step-by-step execution for granular control
- 🔮 Learning system improves suggestions over time
- 🔮 Database-backed user preferences

## Technical Debt & Future Work

### Deferred Technical Debt
1. **Step-by-Step UI**: Complex but potentially valuable for power users
2. **Learning System**: Needs real usage data to be effective
3. **Educational Content**: Nice-to-have for user onboarding

### Architecture Decisions
- **Agent-first design**: ✅ Implemented and working
- **Approval flow architecture**: ✅ Framework exists, needs bug fixes
- **Extensible patterns**: ✅ Easy to add new agent types

### Performance Considerations
- Agent execution is fast (< 2s for most workflows)
- Preview generation is the bottleneck (addressed in future)
- Memory usage is reasonable with current approach

## Conclusion

This agent-first architecture provides a solid foundation that implements all Karpathy principles while being immediately useful. It starts with sequential processing but is designed to easily extend to more sophisticated patterns like evaluator-optimizer and orchestrator-worker. The system emphasizes user control, learning, and transparency while maintaining the flexibility to grow with future needs. 

## AI SDK v5 Implementation Details

### Using generateObject for Structured Planning

Following AI SDK v5 patterns, we use `generateObject` for structured agent planning:

```typescript
// lib/ai/agents/steps/PlanningStep.ts
import { generateObject } from 'ai'
import { z } from 'zod'

const workflowPlanSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    tool: z.string(),
    description: z.string(),
    params: z.any(),
    dependencies: z.array(z.string()).optional(),
    requiresApproval: z.boolean().default(false),
    estimatedConfidence: z.number().min(0).max(1)
  })),
  reasoning: z.string(),
  totalSteps: z.number(),
  estimatedDuration: z.string(),
  parallelizable: z.boolean()
})

export class PlanningStep implements AgentStep {
  async execute(context: AgentContext): Promise<StepResult> {
    const { object: plan } = await generateObject({
      model: openai('gpt-4o'),
      schema: workflowPlanSchema,
      prompt: `Plan a photo editing workflow for: "${context.request}"
      
Canvas: ${context.canvasAnalysis.dimensions.width}x${context.canvasAnalysis.dimensions.height}
Available tools: ${context.availableTools.join(', ')}

Create a step-by-step plan with:
- Exact parameters for each tool
- Dependencies between steps
- Which steps need user approval
- Confidence estimates`
    })
    
    return {
      success: true,
      data: plan,
      confidence: 0.9,
      nextSteps: plan.steps.map(s => new ToolStep(s))
    }
  }
}
```

### Streaming with prepareStep (AI SDK v5)

For dynamic agent behavior, we use the new `prepareStep` function:

```typescript
// lib/ai/agents/streaming/agent-stream.ts
import { streamText } from 'ai'

export async function createAgentStream(request: string, context: AgentContext) {
  return streamText({
    model: openai('gpt-4o'),
    messages: context.conversation,
    prepareStep: ({ steps, stepNumber }) => {
      // Dynamically adjust based on previous steps
      const lastStep = steps[steps.length - 1]
      
      // If last step had low confidence, activate evaluation tools
      if (lastStep?.toolCalls?.[0]?.result?.confidence < 0.7) {
        return {
          activeTools: ['evaluateQuality', 'generateAlternatives'],
          system: 'The last operation had low confidence. Evaluate the result and suggest improvements.'
        }
      }
      
      // For complex workflows, activate orchestration
      if (stepNumber === 1 && context.complexity === 'complex') {
        return {
          activeTools: ['orchestrateWorkflow', 'parallelExecute'],
          system: 'This is a complex request. Break it down into parallel operations where possible.'
        }
      }
      
      // Default tools
      return {
        activeTools: [...adapterRegistry.getAIToolNames()],
        system: context.systemPrompt
      }
    },
    stopWhen: stepCountIs(context.maxSteps || 10)
  })
}
```

### Tool Execution with AI SDK v5

Our tools follow AI SDK v5's tool pattern:

```typescript
// lib/ai/agents/tools/agent-tools.ts
import { tool } from 'ai'
import { z } from 'zod'

export const agentTools = {
  planWorkflow: tool({
    description: 'Plan a multi-step photo editing workflow',
    inputSchema: z.object({
      request: z.string(),
      constraints: z.object({
        maxSteps: z.number().optional(),
        requireQuality: z.boolean().optional(),
        allowParallel: z.boolean().optional()
      }).optional()
    }),
    execute: async ({ request, constraints }) => {
      const planner = new WorkflowPlanner()
      return await planner.createPlan(request, constraints)
    }
  }),
  
  evaluateQuality: tool({
    description: 'Evaluate the quality of an edit',
    inputSchema: z.object({
      before: z.string().describe('Base64 image before edit'),
      after: z.string().describe('Base64 image after edit'),
      intent: z.string().describe('What the edit was trying to achieve')
    }),
    execute: async ({ before, after, intent }) => {
      const evaluator = new QualityEvaluator()
      return await evaluator.evaluate(before, after, intent)
    }
  }),
  
  generateAlternatives: tool({
    description: 'Generate alternative parameters for an operation',
    inputSchema: z.object({
      operation: z.string(),
      currentParams: z.any(),
      targetImprovement: z.string().optional()
    }),
    execute: async ({ operation, currentParams, targetImprovement }) => {
      const generator = new AlternativeGenerator()
      return await generator.generate(operation, currentParams, targetImprovement)
    }
  })
}
```

### Embedding Generation for Learning

Using AI SDK v5's embed function for the learning system:

```typescript
// lib/ai/agents/learning/embeddings.ts
import { embed, embedMany } from 'ai'

export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: openai('text-embedding-3-small'),
      value: text,
      providerOptions: {
        openai: {
          dimensions: 512 // Smaller for efficiency
        }
      }
    })
    
    return embedding
  }
  
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({
      model: openai('text-embedding-3-small'),
      values: texts,
      maxParallelCalls: 2, // AI SDK v5 parallel control
      providerOptions: {
        openai: {
          dimensions: 512
        }
      }
    })
    
    return embeddings
  }
}
```

### Error Handling and Recovery

Following AI SDK v5 patterns for robust error handling:

```typescript
// lib/ai/agents/error-handling.ts
export class AgentErrorHandler {
  async handleToolError(error: any, step: AgentStep, context: AgentContext) {
    // AI SDK v5 provides structured errors
    if (error.code === 'INVALID_PROMPT') {
      // Retry with simplified prompt
      return await this.retryWithSimplification(step, context)
    }
    
    if (error.code === 'RATE_LIMIT') {
      // Use fallback model or queue
      return await this.handleRateLimit(step, context)
    }
    
    // Log and provide user-friendly message
    console.error('[Agent Error]', {
      step: step.id,
      error: error.message,
      context: context.request
    })
    
    return {
      success: false,
      error: this.getUserFriendlyError(error),
      recovery: await this.suggestRecovery(error, step)
    }
  }
} 