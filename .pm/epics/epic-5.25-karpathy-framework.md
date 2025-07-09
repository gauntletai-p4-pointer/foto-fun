# Epic 5.25: Karpathy Agent Design Framework Integration

## Overview

This epic implements Andrej Karpathy's agent design framework principles into FotoFun, building upon the existing foundation from Epics 1, 2, and 5. We'll create a production-ready AI photo editing system using AI SDK v5's agent patterns, emphasizing human-AI collaboration through intelligent context management, generation with verification, and adjustable autonomy.

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

## Current State Assessment

### What We Have (from Epics 1, 2, and 5)

#### ✅ Completed Components
1. **Foundation (Epic 1)**
   - BaseTool architecture with lifecycle management
   - Command pattern for undo/redo
   - Layer system with full integration
   - Selection system with pixel-based masks
   - 12 working canvas tools

2. **AI Integration (Epic 5)**
   - Tool adapter pattern for AI compatibility
   - Client-server execution separation
   - Natural language parameter resolution
   - 9+ AI-compatible tools working
   - Canvas context passing with messages
   - Tool execution visualization in chat

3. **Text Tools (Epic 2 - Partial)**
   - BaseTextTool class structure
   - Font management system planning
   - Text command infrastructure

### What We're Missing for Agent Patterns
1. **No Multi-Step Coordination**: Tools run independently
2. **No Quality Evaluation**: No automatic quality checking
3. **No Workflow Orchestration**: Can't break down complex requests
4. **No Learning/Optimization**: Doesn't improve from user feedback
5. **Basic Sequential Flow**: User request → Tool execution → Result

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

### RAG/Vector-Based Learning System

The learning system uses embeddings to understand semantic similarity between workflows, user preferences, and parameter choices. This enables the agent to learn from past interactions and improve over time.

#### Vector Store Architecture

```typescript
// lib/ai/agents/learning/vector-store.ts
import { openai } from '@/lib/ai/providers'
import { embed } from 'ai'

interface VectorDocument {
  id: string
  embedding: number[]
  metadata: {
    type: 'workflow' | 'preference' | 'decision' | 'parameter'
    timestamp: number
    userId?: string
    success: boolean
    context: any
  }
  content: string
}

export class AgentVectorStore {
  private documents: Map<string, VectorDocument> = new Map()
  private indexedDb: IDBDatabase | null = null
  
  async initialize() {
    // Initialize IndexedDB for persistent storage
    this.indexedDb = await this.openIndexedDb()
    await this.loadDocuments()
  }
  
  async addWorkflow(workflow: ExecutedWorkflow) {
    const content = this.serializeWorkflow(workflow)
    const embedding = await this.generateEmbedding(content)
    
    const doc: VectorDocument = {
      id: `workflow-${Date.now()}`,
      embedding,
      metadata: {
        type: 'workflow',
        timestamp: Date.now(),
        success: workflow.outcome === 'success',
        context: {
          request: workflow.request,
          toolsUsed: workflow.steps.map(s => s.tool),
          parameters: workflow.steps.map(s => s.params),
          confidence: workflow.averageConfidence
        }
      },
      content
    }
    
    await this.storeDocument(doc)
  }
  
  async findSimilarWorkflows(request: string, k: number = 5): Promise<SimilarWorkflow[]> {
    const queryEmbedding = await this.generateEmbedding(request)
    const workflows = Array.from(this.documents.values())
      .filter(doc => doc.metadata.type === 'workflow')
    
    // Calculate cosine similarity
    const similarities = workflows.map(doc => ({
      doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    
    // Sort by similarity and take top k
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(({ doc, similarity }) => ({
        id: doc.id,
        workflow: this.deserializeWorkflow(doc.content),
        similarity,
        metadata: doc.metadata
      }))
  }
  
  async learnFromDecision(decision: UserDecision, context: AgentContext) {
    // Store parameter preferences
    if (decision.action === 'approve') {
      const paramDoc: VectorDocument = {
        id: `param-${Date.now()}`,
        embedding: await this.generateEmbedding(
          JSON.stringify({ operation: decision.operation, params: decision.params })
        ),
        metadata: {
          type: 'parameter',
          timestamp: Date.now(),
          success: true,
          context: {
            operation: decision.operation,
            params: decision.params,
            canvasState: context.canvasAnalysis
          }
        },
        content: JSON.stringify(decision)
      }
      
      await this.storeDocument(paramDoc)
    }
  }
  
  async suggestParameters(operation: string, context: AgentContext): Promise<ParameterSuggestion[]> {
    const query = `${operation} ${JSON.stringify(context.canvasAnalysis)}`
    const queryEmbedding = await this.generateEmbedding(query)
    
    const paramDocs = Array.from(this.documents.values())
      .filter(doc => 
        doc.metadata.type === 'parameter' && 
        doc.metadata.context.operation === operation
      )
    
    const suggestions = paramDocs
      .map(doc => ({
        params: doc.metadata.context.params,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
        successRate: doc.metadata.success ? 1 : 0
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
    
    return suggestions
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: openai('text-embedding-3-small'),
      value: text
    })
    return embedding
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }
}
```

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
  
  private learner: AgentLearner
  
  constructor() {
    super()
    this.learner = new AgentLearner()
  }
  
  async initialize() {
    await this.learner.initialize()
  }
  
  protected async plan(request: string): Promise<AgentStep[]> {
    return [{
      id: 'route-analysis',
      type: 'route',
      description: 'Analyze request and determine execution strategy',
      execute: async (context) => {
        // Analyze the request using AI
        const analysis = await this.analyzeRequest(request, context)
        
        // Check for similar past workflows
        const suggestion = await this.learner.suggestWorkflow(request, context)
        
        // Route to appropriate handler
        const result = await this.routeRequest(
          request,
          analysis,
          context,
          suggestion
        )
        
        // Learn from the execution
        if (result.completed) {
          await this.learner.learnFromWorkflow(
            result.workflow,
            { userSatisfaction: result.confidence }
          )
        }
        
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

## Implementation Plan

### Phase 1: Agent Foundation (2 days)
1. **Core Agent System**
   - BaseAgent abstract class
   - AgentContext and AgentStep interfaces
   - WorkflowMemory implementation
   - Basic SequentialEditingAgent

2. **Enhanced Tool Adapters**
   - Add confidence calculation
   - Add alternative generation
   - Enhanced preview system
   - Quality evaluation methods

### Phase 2: Visual Approval System & Step-by-Step Mode (2.5 days)
1. **Approval Dialog Components**
   - AgentApprovalDialog with tabs
   - ComparisonView with multiple modes
   - AlternativeGrid for options
   - ConfidenceIndicator component

2. **Step-by-Step Execution**
   - StepByStepExecution component
   - WorkflowTimeline visualization
   - Tool education system
   - Parameter display and editing
   - Step status tracking

3. **Comparison Modes**
   - Slider comparison
   - Side-by-side view
   - Overlay with opacity
   - Difference visualization

4. **Settings Integration**
   - Step-by-step mode preferences
   - Per-tool approval policies
   - Educational content toggles

### Phase 3: RAG/Vector Learning System (2 days)
1. **Vector Store Infrastructure**
   - AgentVectorStore with IndexedDB persistence
   - Embedding generation using OpenAI
   - Similarity search implementation
   - Document management system

2. **Learning Components**
   - AgentLearner for pattern recognition
   - Workflow adaptation system
   - Parameter suggestion engine
   - User preference modeling

### Phase 4: Master Routing Agent (2 days)
1. **Routing Implementation**
   - MasterRoutingAgent with route analysis
   - Request type classification using generateObject
   - Strategy selection logic
   - Hybrid approach handling

2. **Integration Points**
   - API route updates for master agent
   - Client-side agent hooks
   - Approval flow coordination
   - Learning system integration

### Phase 5: Advanced Agents (1.5 days)
1. **Agent Implementations**
   - EvaluatorOptimizerAgent with quality loops
   - OrchestratorAgent for parallel execution
   - WorkerAgent pattern for specialized tasks

2. **Agent Coordination**
   - Inter-agent communication
   - Result aggregation
   - Error handling and recovery

### Phase 6: Autonomy & Controls (1 day)
1. **Autonomy Controller**
   - Multi-factor decision making
   - Operation policies
   - Trust level management
   - Adaptive thresholds

2. **User Controls**
   - Autonomy sliders UI
   - Per-operation settings
   - Learning toggle
   - History viewer

### Phase 7: Integration & Polish (1.5 days)
1. **System Integration**
   - Wire up all agents
   - Update existing tools
   - Add agent selection UI
   - Performance optimization

2. **Testing & Documentation**
   - Unit tests for agents
   - Integration tests
   - User documentation
   - Performance benchmarks

## Benefits of Agent-First Architecture

### Immediate Benefits
1. **Extensibility**: Easy to add new agent patterns
2. **Consistency**: All operations follow same flow
3. **Control**: Users have granular control
4. **Learning**: System improves over time
5. **Transparency**: Clear workflow visualization
6. **Education**: Step-by-step mode helps users learn manual tools
7. **Trust Building**: Users see exactly what AI is doing before it happens
8. **Professional Workflow**: Photographers understand the editing process

### Future Possibilities
1. **Complex Workflows**: Multi-agent collaboration
2. **Quality Assurance**: Automatic quality optimization
3. **Batch Processing**: Parallel agent execution
4. **Custom Agents**: User-defined workflows
5. **Agent Marketplace**: Share agent configurations

## Success Metrics

1. **Agent Execution**: All operations use agent system
2. **Approval Flow**: 100% of operations can show preview
3. **Confidence Display**: Users see confidence for every step
4. **Autonomy Control**: Users can adjust automation level
5. **Learning System**: Approval patterns improve suggestions
6. **Extensibility**: New agent patterns can be added easily
7. **Step Transparency**: Every multi-step workflow shows tool usage
8. **Educational Impact**: Users report learning manual tools through AI
9. **Trust Metrics**: Higher approval rates with step-by-step mode enabled
10. **Professional Adoption**: Photography professionals use and trust the system

## Technical Considerations

### Performance
- Lazy load agent implementations
- Cache preview generations
- Optimize confidence calculations
- Stream results when possible

### Error Handling
- Graceful degradation to simple mode
- Clear error messages
- Rollback capabilities
- Recovery suggestions

### Testing Strategy
- Unit tests for each agent
- Integration tests for workflows
- E2E tests for approval flows
- Performance benchmarks

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