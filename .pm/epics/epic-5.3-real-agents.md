# Epic 5.3: Real Agents - AI SDK v5 Pattern Implementation

## Overview

This epic focuses on refactoring our agent system to follow AI SDK v5 best practices, removing technical debt, and implementing specialized agents for complex operations while keeping simple multi-step operations fast on the client side.

## Background

Current issues:
- Mixed implementation patterns between client and server
- Unused agent code creating confusion
- Mock canvas on server causing problems
- Inconsistent confidence calculation
- No real implementation of specialized agents

## Goals

1. **Clean Architecture**: Remove technical debt and establish clear patterns
2. **Performance**: Keep simple operations fast (client-side)
3. **Intelligence**: Add specialized agents for complex tasks using AI SDK v5 patterns
4. **Consistency**: Unified interfaces and execution patterns
5. **Observability**: Built-in progress tracking and metrics

## Technical Approach

Following AI SDK v5 patterns from the documentation:
- **Sequential Processing** for step-by-step workflows
- **Evaluator-Optimizer** for quality improvement loops
- **Multi-Step Tool Usage** with `stopWhen` for complex tasks
- **Orchestrator-Worker** for batch processing
- **Structured Answers** for consistent agent outputs

## Phase 1: Technical Debt Cleanup (Week 1)

### 1.1 Remove Unused Code
**Files to Delete:**
```
- lib/ai/agents/EvaluatorOptimizerAgent.ts (stub)
- lib/ai/agents/OrchestratorAgent.ts (stub)
- Any unused step-by-step UI components
```

**Files to Clean:**
```typescript
// lib/ai/agents/MasterRoutingAgent.ts
// Remove references to non-existent agents
// Simplify routing to only handle:
// - text-only (conversational)
// - simple-tool (direct execution)
// - complex-agent (new specialized agents)
```

### 1.2 Fix Canvas Context Issues
**Problem**: Mock canvas on server doesn't match client canvas

**Solution**: Create a proper abstraction
```typescript
// lib/ai/canvas/CanvasContext.ts
export interface CanvasContext {
  dimensions: { width: number; height: number }
  hasContent: boolean
  objectCount: number
  screenshot?: string // Base64 for server-side analysis
}

// lib/ai/canvas/CanvasContextProvider.ts
export class CanvasContextProvider {
  static fromClient(canvas: Canvas): CanvasContext {
    return {
      dimensions: { width: canvas.getWidth(), height: canvas.getHeight() },
      hasContent: canvas.getObjects().length > 0,
      objectCount: canvas.getObjects().length,
      screenshot: canvas.toDataURL() // Only when needed
    }
  }
  
  static empty(): CanvasContext {
    return {
      dimensions: { width: 800, height: 600 },
      hasContent: false,
      objectCount: 0
    }
  }
}
```

### 1.3 Standardize Tool Result Format
```typescript
// lib/ai/tools/types.ts
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: ToolError
  preview?: {
    before?: string
    after?: string
  }
  metadata?: {
    duration: number
    confidence?: number
    toolName: string
  }
}
```

## Phase 2: Core Agent Framework (Week 2)

### 2.1 Base Agent Pattern (AI SDK v5 Style)
```typescript
// lib/ai/agents/core/BaseAgent.ts
import { generateText, generateObject, tool } from 'ai'
import { z } from 'zod'

export abstract class BaseAgent {
  abstract readonly name: string
  abstract readonly description: string
  
  // Define tools available to this agent
  protected abstract getTools(): Record<string, ReturnType<typeof tool>>
  
  // Define the system prompt
  protected abstract getSystemPrompt(): string
  
  // Execute the agent with AI SDK v5 patterns
  async execute(request: string, context: AgentContext): Promise<AgentResult> {
    const result = await generateText({
      model: this.getModel(),
      system: this.getSystemPrompt(),
      prompt: request,
      tools: this.getTools(),
      stopWhen: this.getStopCondition(),
      onStepFinish: ({ step, toolCalls, toolResults }) => {
        this.handleStepComplete(step, toolCalls, toolResults)
      }
    })
    
    return this.processResult(result)
  }
  
  protected abstract getModel(): any
  protected abstract getStopCondition(): any
  protected abstract handleStepComplete(step: any, toolCalls: any, toolResults: any): void
  protected abstract processResult(result: any): AgentResult
}
```

### 2.2 Tool Definitions Following AI SDK v5
```typescript
// lib/ai/agents/tools/agent-tools.ts
import { tool } from 'ai'
import { z } from 'zod'

export const agentTools = {
  // Analysis tool for image improvement
  analyzeImage: tool({
    description: 'Analyze an image to identify areas for improvement',
    inputSchema: z.object({
      intent: z.string().describe('What the user wants to improve'),
      includeScreenshot: z.boolean().default(true)
    }),
    execute: async ({ intent, includeScreenshot }) => {
      const canvasContext = await CanvasContextProvider.fromClient()
      
      if (!canvasContext.hasContent) {
        return { error: 'No image to analyze' }
      }
      
      return {
        context: canvasContext,
        screenshot: includeScreenshot ? canvasContext.screenshot : undefined
      }
    }
  }),
  
  // Planning tool
  planImprovements: tool({
    description: 'Create a plan for improving the image',
    inputSchema: z.object({
      analysis: z.any(),
      constraints: z.object({
        maxSteps: z.number().optional(),
        preserveAspects: z.array(z.string()).optional()
      }).optional()
    }),
    execute: async ({ analysis, constraints }) => {
      // This would normally use AI to generate a plan
      // For now, return a structured plan
      return {
        steps: [
          { tool: 'adjustBrightness', params: { value: 10 } },
          { tool: 'adjustContrast', params: { value: 5 } }
        ],
        estimatedDuration: 2000,
        confidence: 0.85
      }
    }
  }),
  
  // Execution tool
  executeStep: tool({
    description: 'Execute a single improvement step',
    inputSchema: z.object({
      tool: z.string(),
      params: z.any()
    }),
    execute: async ({ tool, params }) => {
      // Bridge to existing tool system
      const adapter = adapterRegistry.get(tool)
      if (!adapter) {
        return { error: `Tool ${tool} not found` }
      }
      
      const result = await adapter.execute(params)
      return result
    }
  }),
  
  // Evaluation tool
  evaluateResult: tool({
    description: 'Evaluate the quality of changes',
    inputSchema: z.object({
      before: z.string().describe('Screenshot before changes'),
      after: z.string().describe('Screenshot after changes'),
      criteria: z.array(z.string()).optional()
    }),
    execute: async ({ before, after, criteria }) => {
      // This would use AI vision to evaluate
      // For now, return mock evaluation
      return {
        score: 0.75,
        improvements: ['Better exposure', 'Improved contrast'],
        issues: ['Slight color shift'],
        recommendation: 'accept'
      }
    }
  }),
  
  // Final answer tool (no execute function)
  provideResult: tool({
    description: 'Provide the final result of image improvement',
    inputSchema: z.object({
      summary: z.string(),
      stepsExecuted: z.array(z.object({
        tool: z.string(),
        params: z.any(),
        result: z.string()
      })),
      finalScore: z.number(),
      recommendations: z.array(z.string()).optional()
    })
    // No execute function - terminates the agent
  })
}
```

## Phase 3: Specialized Agent Implementation (Week 3)

### 3.1 Image Improvement Agent (Evaluator-Optimizer Pattern)
```typescript
// lib/ai/agents/specialized/ImageImprovementAgent.ts
import { openai } from '@ai-sdk/openai'
import { generateText, stepCountIs } from 'ai'
import { BaseAgent } from '../core/BaseAgent'
import { agentTools } from '../tools/agent-tools'

export class ImageImprovementAgent extends BaseAgent {
  name = 'image-improvement'
  description = 'Iteratively improves image quality based on user intent'
  
  private iterationCount = 0
  private maxIterations = 5
  
  protected getTools() {
    return {
      analyzeImage: agentTools.analyzeImage,
      planImprovements: agentTools.planImprovements,
      executeStep: agentTools.executeStep,
      evaluateResult: agentTools.evaluateResult,
      provideResult: agentTools.provideResult
    }
  }
  
  protected getSystemPrompt() {
    return `You are an expert photo editor tasked with improving images.
    
    Your workflow:
    1. Analyze the current image and user intent
    2. Create an improvement plan
    3. Execute improvements step by step
    4. Evaluate the results
    5. If quality is not satisfactory, iterate with adjustments
    6. Provide final result when satisfied or max iterations reached
    
    Focus on:
    - Understanding user intent
    - Making subtle, professional adjustments
    - Preserving important image characteristics
    - Achieving high quality results`
  }
  
  protected getModel() {
    return openai('gpt-4o')
  }
  
  protected getStopCondition() {
    // Stop when provideResult is called or max steps reached
    return stepCountIs(20)
  }
  
  protected handleStepComplete(step: number, toolCalls: any[], toolResults: any[]) {
    // Track iterations
    const evaluationCalls = toolCalls.filter(tc => tc.toolName === 'evaluateResult')
    if (evaluationCalls.length > 0) {
      this.iterationCount++
    }
    
    // Log progress
    console.log(`[ImageImprovementAgent] Step ${step} completed`)
    toolCalls.forEach(tc => {
      console.log(`  Tool: ${tc.toolName}`)
    })
  }
  
  protected processResult(result: any): AgentResult {
    // Extract the final result from provideResult tool call
    const finalToolCall = result.toolCalls?.find(
      tc => tc.toolName === 'provideResult'
    )
    
    if (finalToolCall) {
      return {
        success: true,
        data: finalToolCall.args,
        metadata: {
          iterations: this.iterationCount,
          steps: result.steps.length
        }
      }
    }
    
    // Fallback if no final result
    return {
      success: false,
      error: 'Agent did not provide final result',
      metadata: {
        iterations: this.iterationCount,
        steps: result.steps.length
      }
    }
  }
}
```

### 3.2 Batch Processing Agent (Orchestrator-Worker Pattern)
```typescript
// lib/ai/agents/specialized/BatchProcessingAgent.ts
import { openai } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'

export class BatchProcessingAgent extends BaseAgent {
  name = 'batch-processing'
  description = 'Processes multiple images with consistent parameters'
  
  async execute(request: string, context: BatchContext): Promise<BatchResult> {
    // Step 1: Orchestrator analyzes the batch
    const { object: batchPlan } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        commonCharacteristics: z.array(z.string()),
        suggestedWorkflow: z.array(z.object({
          tool: z.string(),
          params: z.any(),
          applyToAll: z.boolean()
        })),
        processingStrategy: z.enum(['parallel', 'sequential']),
        estimatedTimePerImage: z.number()
      }),
      system: 'You are analyzing a batch of images to determine optimal processing',
      prompt: `Analyze these ${context.images.length} images and create a processing plan: ${request}`
    })
    
    // Step 2: Process images using workers
    const results = await this.processImages(
      context.images,
      batchPlan,
      context.options
    )
    
    return {
      success: true,
      plan: batchPlan,
      results,
      summary: await this.generateSummary(results)
    }
  }
  
  private async processImages(
    images: BatchImage[],
    plan: any,
    options: BatchOptions
  ): Promise<ImageResult[]> {
    const { processingStrategy } = plan
    
    if (processingStrategy === 'parallel' && options.allowParallel) {
      // Process in parallel chunks
      const chunkSize = options.parallelLimit || 5
      const chunks = this.chunkArray(images, chunkSize)
      
      const results: ImageResult[] = []
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(img => this.processImage(img, plan.suggestedWorkflow))
        )
        results.push(...chunkResults)
        
        // Update progress
        this.updateProgress(results.length, images.length)
      }
      
      return results
    } else {
      // Sequential processing
      const results: ImageResult[] = []
      for (const [index, image] of images.entries()) {
        const result = await this.processImage(image, plan.suggestedWorkflow)
        results.push(result)
        
        // Update progress
        this.updateProgress(index + 1, images.length)
      }
      
      return results
    }
  }
}
```

### 3.3 Creative Enhancement Agent (Multi-Step Tool Usage)
```typescript
// lib/ai/agents/specialized/CreativeEnhancementAgent.ts
export class CreativeEnhancementAgent extends BaseAgent {
  name = 'creative-enhancement'
  description = 'Applies creative and artistic enhancements to images'
  
  protected getTools() {
    return {
      ...agentTools,
      // Additional creative tools
      applyStyle: tool({
        description: 'Apply an artistic style to the image',
        inputSchema: z.object({
          style: z.enum(['vintage', 'modern', 'dramatic', 'soft', 'vibrant']),
          intensity: z.number().min(0).max(1)
        }),
        execute: async ({ style, intensity }) => {
          // Map to existing tools based on style
          const styleMap = {
            vintage: [
              { tool: 'sepia', params: { intensity: intensity * 30 } },
              { tool: 'brightness', params: { value: -10 * intensity } }
            ],
            // ... other styles
          }
          
          const steps = styleMap[style] || []
          for (const step of steps) {
            await adapterRegistry.get(step.tool)?.execute(step.params)
          }
          
          return { applied: style, intensity }
        }
      }),
      
      generateVariations: tool({
        description: 'Generate multiple creative variations',
        inputSchema: z.object({
          count: z.number().min(1).max(5),
          diversity: z.number().min(0).max(1)
        }),
        execute: async ({ count, diversity }) => {
          // Generate variations with different parameters
          const variations = []
          for (let i = 0; i < count; i++) {
            // Apply random adjustments based on diversity
            variations.push({
              id: `var-${i}`,
              adjustments: this.generateRandomAdjustments(diversity)
            })
          }
          return variations
        }
      })
    }
  }
}
```

## Phase 4: Integration & UI (Week 4)

### 4.1 Updated Chat Route
```typescript
// app/api/ai/chat/route.ts
export async function POST(req: Request) {
  const { messages, canvasContext, agentMode } = await req.json()
  
  // Determine routing
  const lastMessage = messages[messages.length - 1]
  const routing = await determineRouting(lastMessage.content, canvasContext)
  
  switch (routing.type) {
    case 'conversational':
      // Direct response, no tools
      return streamText({
        model: openai('gpt-4o-mini'),
        messages,
        system: 'You are a helpful photo editing assistant'
      })
      
    case 'simple-tools':
      // Client-side tool execution (current behavior)
      return streamText({
        model: openai('gpt-4o-mini'),
        messages,
        tools: adapterRegistry.getAITools(),
        system: SIMPLE_TOOLS_PROMPT
      })
      
    case 'complex-agent':
      // Use specialized agent
      const agent = AgentFactory.create(routing.agentType)
      const result = await agent.execute(lastMessage.content, {
        canvasContext,
        messages,
        userPreferences: await getUserPreferences()
      })
      
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      })
  }
}
```

### 4.2 React Hook for Agents
```typescript
// hooks/useAgent.ts
export function useAgent(agentType: string) {
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [result, setResult] = useState<AgentResult | null>(null)
  const [progress, setProgress] = useState<AgentProgress | null>(null)
  
  const execute = useCallback(async (request: string) => {
    setStatus('running')
    setProgress({ phase: 'analyzing', percentage: 0 })
    
    try {
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType,
          request,
          canvasContext: getCanvasContext()
        })
      })
      
      // Handle streaming progress updates
      const reader = response.body?.getReader()
      if (reader) {
        await handleStreamingUpdates(reader, setProgress, setResult)
      }
      
      setStatus('completed')
    } catch (error) {
      setStatus('error')
      console.error('Agent execution failed:', error)
    }
  }, [agentType])
  
  return { execute, status, result, progress }
}
```

### 4.3 UI Components
```typescript
// components/editor/Agents/AgentPanel.tsx
export function AgentPanel() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const { execute, status, progress, result } = useAgent(selectedAgent || '')
  
  return (
    <div className="p-4 space-y-4">
      {/* Agent Selection */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={selectedAgent === 'image-improvement' ? 'default' : 'outline'}
          onClick={() => setSelectedAgent('image-improvement')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Improve Image
        </Button>
        
        <Button
          variant={selectedAgent === 'batch-processing' ? 'default' : 'outline'}
          onClick={() => setSelectedAgent('batch-processing')}
        >
          <Layers className="w-4 h-4 mr-2" />
          Batch Process
        </Button>
      </div>
      
      {/* Progress Display */}
      {status === 'running' && progress && (
        <AgentProgress progress={progress} />
      )}
      
      {/* Result Display */}
      {result && (
        <AgentResult result={result} onApply={handleApplyResult} />
      )}
    </div>
  )
}
```

## Phase 5: Testing & Optimization (Week 5)

### 5.1 Agent Testing Framework
```typescript
// lib/ai/agents/testing/AgentTestFramework.ts
export class AgentTestFramework {
  async testAgent(agent: BaseAgent, testCases: TestCase[]): Promise<TestReport> {
    const results = []
    
    for (const testCase of testCases) {
      // Setup test environment
      const context = this.createTestContext(testCase)
      
      // Execute agent
      const startTime = Date.now()
      const result = await agent.execute(testCase.request, context)
      const duration = Date.now() - startTime
      
      // Validate result
      const validation = await this.validateResult(result, testCase.expected)
      
      results.push({
        testCase: testCase.name,
        success: validation.passed,
        duration,
        errors: validation.errors,
        metrics: this.extractMetrics(result)
      })
    }
    
    return {
      agent: agent.name,
      results,
      summary: this.generateSummary(results)
    }
  }
}
```

### 5.2 Performance Monitoring
```typescript
// lib/ai/agents/monitoring/AgentMonitor.ts
export class AgentMonitor {
  private metrics: Map<string, AgentMetrics> = new Map()
  
  recordExecution(agentName: string, execution: ExecutionRecord) {
    const metrics = this.metrics.get(agentName) || this.createMetrics()
    
    metrics.executions++
    metrics.totalDuration += execution.duration
    metrics.averageDuration = metrics.totalDuration / metrics.executions
    
    if (execution.success) {
      metrics.successCount++
    } else {
      metrics.errorCount++
    }
    
    metrics.toolUsage.push(...execution.toolsUsed)
    
    this.metrics.set(agentName, metrics)
  }
  
  getReport(): MonitoringReport {
    return {
      agents: Array.from(this.metrics.entries()).map(([name, metrics]) => ({
        name,
        metrics,
        successRate: metrics.successCount / metrics.executions,
        averageSteps: metrics.toolUsage.length / metrics.executions
      }))
    }
  }
}
```

## Migration Strategy

### Step 1: Deploy Phase 1 (Technical Debt)
- Clean up unused code
- Fix canvas context issues
- No user-facing changes

### Step 2: Deploy Phase 2 (Core Framework)
- Add new agent framework
- Maintain backward compatibility
- Feature flag new agents

### Step 3: Deploy Phase 3 (Specialized Agents)
- Roll out one agent at a time
- Monitor performance and errors
- Gather user feedback

### Step 4: Full Migration
- Remove old agent code
- Update documentation
- Training/onboarding

## Success Metrics

1. **Performance**
   - Simple operations remain <100ms
   - Complex agent operations complete in <10s
   - Batch processing handles 50+ images

2. **Quality**
   - Image improvement agent achieves 80%+ user satisfaction
   - Batch processing maintains consistency across images
   - Error rate <5%

3. **Adoption**
   - 50% of power users use agents weekly
   - Positive feedback on complex operations
   - Reduced support tickets for complex edits

## Risks & Mitigations

1. **Risk**: AI costs for complex operations
   - **Mitigation**: Implement usage limits and cost estimation

2. **Risk**: Breaking existing workflows
   - **Mitigation**: Maintain backward compatibility, gradual rollout

3. **Risk**: Poor agent performance
   - **Mitigation**: Extensive testing, feedback loops, ability to disable

## Conclusion

This architecture provides:
- Clean separation between simple and complex operations
- Fast client-side execution for common tasks
- Intelligent agents for complex workflows
- Extensible framework for future agents
- Following AI SDK v5 best practices throughout

The implementation focuses on user value while maintaining code quality and performance. 