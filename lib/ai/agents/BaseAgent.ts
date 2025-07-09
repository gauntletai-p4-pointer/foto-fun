import type { AgentContext, AgentStep, StepResult, AgentResult, Alternative } from './types'

export abstract class BaseAgent {
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
      if (step.requiresApproval && step.requiresApproval(result)) {
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
      }
      
      return result
    } catch (error) {
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
    // This will be implemented to show the approval dialog
    // For now, auto-approve based on confidence threshold
    const threshold = this.context.userPreferences.autoApprovalThreshold
    
    if (result.confidence >= threshold) {
      return { action: 'approve' }
    }
    
    // In real implementation, this would show the approval dialog
    // For now, we'll auto-approve with lower confidence
    return { action: 'approve' }
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