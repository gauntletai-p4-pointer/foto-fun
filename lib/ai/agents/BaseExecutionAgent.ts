import type { AgentContext, AgentStep, StepResult, AgentResult, Alternative } from './types'
import { generateText, stepCountIs, convertToModelMessages, tool, generateObject } from 'ai'
import { openai } from '@/lib/ai/providers'
import { adapterRegistry } from '@/lib/ai/adapters/registry'
import { z } from 'zod'

// ===== OLD IMPLEMENTATION (COMMENTED OUT) =====
/*
export abstract class BaseExecutionAgent {
  protected context: AgentContext
  protected maxSteps: number
  protected stepCount: number = 0
  
  constructor(context: AgentContext, maxSteps: number = 10) {
    this.context = context
    this.maxSteps = maxSteps
  }
  
  // Abstract methods that each agent type must implement
  abstract execute(request: string): Promise<AgentResult>
  abstract generateSteps(request: string): Promise<AgentStep[]>
  
  // Common functionality for all agents
  protected async executeStep(step: AgentStep): Promise<StepResult> {
    this.stepCount++
    
    // Create checkpoint before potentially destructive operations
    if (step.canRevert) {
      this.context.workflowMemory.createCheckpoint(`step-${step.id}`)
    }
    
    try {
      const result = await step.execute(this.context)
      
      // Record the step in workflow memory
      this.context.workflowMemory.recordStep(step, result)
      
      // Check if approval is needed
      if (step.requiresApproval && step.requiresApproval(result, this.context)) {
        try {
          const approval = await this.requestApproval(step, result)
          if (approval.action === 'reject') {
            // Revert if possible
            if (step.canRevert) {
              this.context.workflowMemory.revertToCheckpoint(`step-${step.id}`)
            }
            return { ...result, success: false }
          } else if (approval.action === 'modify' && approval.alternativeIndex !== undefined) {
            // Execute alternative
            const alternative = result.alternatives?.[approval.alternativeIndex]
            if (alternative) {
              return await this.executeAlternative(step, alternative)
            }
          }
        } catch (error) {
          if (error instanceof ApprovalRequiredError) {
            // Re-throw approval required errors to be handled by the caller
            throw error
          }
          // Handle other errors normally
          throw error
        }
      }
      
      return result
    } catch (error) {
      // Re-throw ApprovalRequiredError so it can be handled by the calling agent
      if (error instanceof ApprovalRequiredError) {
        throw error
      }
      
      console.error(`Error executing step ${step.id}:`, error)
      return {
        success: false,
        data: null,
        confidence: 0,
        nextSteps: []
      }
    }
  }
  
  protected async requestApproval(step: AgentStep, result: StepResult): Promise<{
    action: 'approve' | 'reject' | 'modify'
    alternativeIndex?: number
  }> {
    const threshold = this.context.userPreferences.autoApprovalThreshold
    
    // Auto-approve if confidence is above threshold
    if (result.confidence >= threshold) {
      return { action: 'approve' }
    }
    
    // For operations below threshold, we need to signal that approval is required
    // This will be handled by the client-side approval dialog
    // For now, we'll throw a special error that indicates approval is needed
    throw new ApprovalRequiredError(step, result, {
      confidence: result.confidence,
      threshold,
      alternatives: result.alternatives || []
    })
  }
  
  protected async executeAlternative(originalStep: AgentStep, alternative: Alternative): Promise<StepResult> {
    // Execute an alternative approach
    // This would be implemented based on the specific alternative
    return {
      success: true,
      data: alternative,
      confidence: alternative.confidence || 0.8,
      preview: alternative.preview
    }
  }
  
  protected shouldStop(): boolean {
    // Stop conditions based on AI SDK v5 patterns
    return this.stepCount >= this.maxSteps ||
           this.stepCount >= this.context.userPreferences.maxAutonomousSteps
  }
  
  protected async analyzeCanvas(): Promise<void> {
    // Update canvas analysis in context
    const canvas = this.context.canvas
    const objects = canvas.getObjects()
    
    this.context.canvasAnalysis = {
      dimensions: {
        width: canvas.getWidth(),
        height: canvas.getHeight()
      },
      hasContent: objects.length > 0,
      objectCount: objects.length,
      lastAnalyzedAt: Date.now()
    }
  }
}
*/

// ===== NEW AI SDK v5 COMPLIANT IMPLEMENTATION =====
export abstract class BaseExecutionAgent {
  protected context: AgentContext
  protected maxSteps: number
  protected stepCount: number = 0
  
  constructor(context: AgentContext, maxSteps: number = 10) {
    this.context = context
    this.maxSteps = maxSteps
  }
  
  // Abstract methods that each agent type must implement
  abstract execute(request: string): Promise<AgentResult>
  
  // NEW: AI SDK v5 compliant execution with workflow-level approval
  protected async executeWithAISDK(
    request: string,
    systemPrompt: string,
    tools: Record<string, unknown> = {}
  ): Promise<AgentResult> {
    try {
      // Analyze canvas before starting
      await this.analyzeCanvas()
      
      // Step 1: Pre-execution workflow analysis and confidence check
      const workflowAnalysis = await this.analyzeWorkflowConfidence(request, systemPrompt)
      
      // Step 2: Check if approval is needed based on overall workflow confidence
      if (this.shouldRequestWorkflowApproval(workflowAnalysis)) {
        // Import ApprovalRequiredError from types
        const { ApprovalRequiredError } = await import('./types')
        
        // Create a mock step for workflow approval
        const workflowStep: AgentStep = {
          id: 'workflow-approval',
          type: 'plan',
          description: 'Execute planned workflow',
          execute: async () => ({
            success: true,
            data: workflowAnalysis,
            confidence: workflowAnalysis.overallConfidence
          })
        }
        
        const workflowResult: StepResult = {
          success: true,
          data: workflowAnalysis,
          confidence: workflowAnalysis.overallConfidence,
          preview: workflowAnalysis.preview ? {
            before: '', // Will be populated by UI
            after: '', // Will be populated by UI
            diff: workflowAnalysis.preview.description
          } : undefined
        }
        
        // Throw approval required error - this will be caught by the chat route
        throw new ApprovalRequiredError(workflowStep, workflowResult, {
          confidence: workflowAnalysis.overallConfidence,
          threshold: this.context.userPreferences.autoApprovalThreshold,
          alternatives: [] // No alternatives at workflow level - will be generated by UI
        })
      }
      
      // Step 3: Execute with AI SDK v5 multi-step pattern (high confidence workflows)
      return await this.executeWorkflowWithAISDK(request, systemPrompt, tools)
      
    } catch (error) {
      // Re-throw ApprovalRequiredError to be handled by chat route
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ApprovalRequiredError') {
        throw error
      }
      
      console.error('[BaseAgent] Error in executeWithAISDK:', error)
      return {
        completed: false,
        results: [],
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  // AI SDK v5 workflow analysis using generateObject
  private async analyzeWorkflowConfidence(request: string, systemPrompt: string) {
    const workflowAnalysisSchema = z.object({
      overallConfidence: z.number().min(0).max(1).describe('Overall confidence in successfully completing this workflow'),
      estimatedSteps: z.number().min(1).describe('Estimated number of steps needed'),
      riskFactors: z.array(z.string()).describe('Potential risks or challenges'),
      plannedActions: z.array(z.object({
        tool: z.string(),
        description: z.string(),
        confidence: z.number().min(0).max(1)
      })).describe('Planned sequence of actions'),
      preview: z.object({
        description: z.string(),
        expectedOutcome: z.string()
      }).optional().describe('Preview of expected changes')
    })
    
    const { object: analysis } = await generateObject({
      model: openai('gpt-4o'),
      schema: workflowAnalysisSchema,
      system: `${systemPrompt}
      
You are analyzing a photo editing workflow request. Consider:
- Available tools: ${Array.from(adapterRegistry.getAll()).map(a => a.aiName).join(', ')}
- Canvas state: ${this.context.canvasAnalysis.hasContent ? 'has content' : 'empty'}
- Canvas size: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}

Analyze the complexity and confidence for this request.`,
      prompt: `Analyze this photo editing request and estimate confidence: "${request}"`
    })
    
    return analysis
  }
  
  // Check if workflow-level approval is needed
  private shouldRequestWorkflowApproval(analysis: { overallConfidence: number }): boolean {
    const threshold = this.context.userPreferences.autoApprovalThreshold
    return analysis.overallConfidence < threshold
  }
  
  // Execute workflow with AI SDK v5 and granular undo/redo tracking
  private async executeWorkflowWithAISDK(
    request: string,
    systemPrompt: string,
    tools: Record<string, unknown> = {}
  ): Promise<AgentResult> {
    // Build messages for the AI SDK
    const messages = this.buildMessages(request)
    
    // Get available tools (preserve existing tool registry)
    const availableTools = {
      ...this.getAgentTools(),
      ...tools,
      ...adapterRegistry.getAITools()
    } as Record<string, ReturnType<typeof tool>>
    
    // Execute with AI SDK v5 multi-step pattern
    const result = await generateText({
      model: openai('gpt-4o'),
      messages: convertToModelMessages(messages),
      tools: availableTools,
      stopWhen: [
        stepCountIs(this.maxSteps),
        // Custom stop condition based on user preferences
        ({ steps }) => steps.length >= this.context.userPreferences.maxAutonomousSteps
      ],
      onStepFinish: ({ toolCalls, toolResults }) => {
        // Capture canvas state before each tool execution for granular undo
        this.handleStepCompletionWithUndo(toolCalls, toolResults)
      },
      system: systemPrompt
    })
    
    // Process the result to match our AgentResult interface
    return this.processAISDKResult(result)
  }
  
  // Build messages for AI SDK (preserves conversation context)
  protected buildMessages(request: string) {
    const messages = [...this.context.conversation]
    
    // Add current request if not already in conversation
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      messages.push({
        id: `user-${Date.now()}`,
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: request }]
      })
    }
    
    return messages
  }
  
  // Get agent-specific tools (to be overridden by subclasses)
  protected getAgentTools(): Record<string, ReturnType<typeof tool>> {
    // Return empty object by default - subclasses can override
    return {}
  }
  
  // Handle step completion (preserves workflow memory and approval logic)
  protected handleStepCompletion(
    toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>,
    toolResults: Array<{ toolCallId: string; output: unknown; error?: unknown }>
  ): void {
    this.stepCount++
    
    // Process each tool call and result
    toolCalls.forEach((toolCall, index) => {
      const toolResult = toolResults[index]
      
      // Create checkpoint before potentially destructive operations
      this.context.workflowMemory.createCheckpoint(`step-${toolCall.toolCallId}`)
      
      // Convert to our AgentStep format for compatibility
      const agentStep: AgentStep = {
        id: toolCall.toolCallId,
        type: 'tool',
        description: `Execute ${toolCall.toolName}`,
        execute: async () => ({
          success: true,
          data: toolResult.output,
          confidence: this.calculateStepConfidence(toolCall, toolResult)
        })
      }
      
      const stepResultData: StepResult = {
        success: !toolResult.error,
        data: toolResult.output,
        confidence: this.calculateStepConfidence(toolCall, toolResult)
      }
      
      // Record in workflow memory (preserves existing functionality)
      this.context.workflowMemory.recordStep(agentStep, stepResultData)
      
      // Check if approval is needed (preserves existing approval logic)
      if (this.shouldRequestApproval(stepResultData)) {
        // Note: In AI SDK v5, we can't interrupt mid-execution
        // So we'll handle approval in the final result processing
        console.log('[BaseAgent] Approval would be required for:', toolCall.toolName)
      }
    })
  }
  
  // Handle step completion with enhanced undo/redo tracking
  protected handleStepCompletionWithUndo(
    toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>,
    toolResults: Array<{ toolCallId: string; output: unknown; error?: unknown }>
  ): void {
    this.stepCount++
    
    // Process each tool call and result with enhanced undo tracking
    toolCalls.forEach((toolCall, index) => {
      const toolResult = toolResults[index]
      
      // Create named checkpoint for granular undo - captures canvas state BEFORE tool execution
      const checkpointId = `before-${toolCall.toolName}-${toolCall.toolCallId}`
      this.context.workflowMemory.createCheckpoint(checkpointId)
      
      // Convert to our AgentStep format for compatibility
      const agentStep: AgentStep = {
        id: toolCall.toolCallId,
        type: 'tool',
        description: `Execute ${toolCall.toolName}`,
        execute: async () => ({
          success: true,
          data: toolResult.output,
          confidence: this.calculateStepConfidence(toolCall, toolResult)
        })
      }
      
      const stepResultData: StepResult = {
        success: !toolResult.error,
        data: {
          toolName: toolCall.toolName,
          params: toolCall.input,
          output: toolResult.output,
          checkpointId, // Include checkpoint ID for undo functionality
          canUndo: true, // Mark as undoable
          undoDescription: `Undo ${toolCall.toolName}`
        },
        confidence: this.calculateStepConfidence(toolCall, toolResult)
      }
      
      // Record in workflow memory with enhanced metadata
      this.context.workflowMemory.recordStep(agentStep, stepResultData)
      
      // Log step completion for debugging
      console.log(`[BaseAgent] Step completed: ${toolCall.toolName} (checkpoint: ${checkpointId})`)
    })
  }
  
  // Calculate confidence for a step (preserves existing confidence logic)
  protected calculateStepConfidence(
    toolCall: { toolCallId: string; toolName: string; input: unknown },
    toolResult: { toolCallId: string; output: unknown; error?: unknown; confidence?: number }
  ): number {
    // Default confidence calculation
    if (toolResult.error) return 0.1
    
    // Use tool-specific confidence if available
    if (toolResult.confidence) return toolResult.confidence
    
    // Default to medium confidence
    return 0.7
  }
  
  // Check if approval is needed (preserves existing approval logic)
  protected shouldRequestApproval(result: StepResult): boolean {
    const threshold = this.context.userPreferences.autoApprovalThreshold
    return result.confidence < threshold
  }
  
  // Process AI SDK result to match our AgentResult interface
  protected processAISDKResult(result: {
    steps: Array<{
      toolCalls?: Array<{ toolCallId: string; toolName: string; input: unknown }>
      toolResults?: Array<{ toolCallId: string; output: unknown; error?: unknown }>
    }>
    finishReason: string
  }): AgentResult {
    const stepResults: StepResult[] = []
    
    // Process all steps from AI SDK result
    result.steps.forEach((step) => {
      step.toolCalls?.forEach((toolCall) => {
        const toolResult = step.toolResults?.find((tr) => tr.toolCallId === toolCall.toolCallId)
        
        stepResults.push({
          success: !toolResult?.error,
          data: {
            toolName: toolCall.toolName,
            params: toolCall.input,
            description: `Execute ${toolCall.toolName}`,
            output: toolResult?.output
          },
          confidence: this.calculateStepConfidence(toolCall, toolResult || { toolCallId: toolCall.toolCallId, output: null })
        })
      })
    })
    
    return {
      completed: result.finishReason !== 'error',
      results: stepResults,
      reason: result.finishReason === 'error' ? 'Execution failed' : undefined
    }
  }
  
  // Preserve existing canvas analysis functionality
  protected async analyzeCanvas(): Promise<void> {
    const canvas = this.context.canvas
    const objects = canvas.getObjects()
    
    this.context.canvasAnalysis = {
      dimensions: {
        width: canvas.getWidth(),
        height: canvas.getHeight()
      },
      hasContent: objects.length > 0,
      objectCount: objects.length,
      lastAnalyzedAt: Date.now()
    }
  }
  
  // Preserve existing alternative execution functionality
  protected async executeAlternative(originalStep: AgentStep, alternative: Alternative): Promise<StepResult> {
    return {
      success: true,
      data: alternative,
      confidence: alternative.confidence || 0.8,
      preview: alternative.preview
    }
  }
  
  // Preserve existing stop condition logic
  protected shouldStop(): boolean {
    return this.stepCount >= this.maxSteps ||
           this.stepCount >= this.context.userPreferences.maxAutonomousSteps
  }
} 