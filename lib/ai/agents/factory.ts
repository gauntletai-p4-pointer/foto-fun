import type { Canvas } from 'fabric'
import type { UIMessage } from 'ai'
import type { AgentContext, UserPreferences } from './types'
import { WorkflowMemory } from './WorkflowMemory'
import { SequentialEditingAgent } from './SequentialEditingAgent'
import { MasterRoutingAgent } from './MasterRoutingAgent'
import { BaseExecutionAgent } from './BaseExecutionAgent'

// Default user preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  autoApprovalThreshold: 0.8,
  maxAutonomousSteps: 5,
  preferredComparisonMode: 'side-by-side',
  historicalChoices: []
}

export type AgentType = 'sequential' | 'evaluator-optimizer' | 'orchestrator' | 'routing'

interface CreateAgentOptions {
  type: AgentType
  canvas: Canvas
  conversation: UIMessage[]
  preferences?: Partial<UserPreferences>
  maxSteps?: number
}

/**
 * Factory for creating agents with proper context
 */
export class AgentFactory {
  /**
   * Create an agent with the specified type and context
   */
  static createAgent(options: CreateAgentOptions): BaseExecutionAgent | MasterRoutingAgent {
    const { type, canvas, conversation, preferences = {}, maxSteps = 10 } = options
    
    // Create workflow memory
    const workflowMemory = new WorkflowMemory(canvas)
    
    // Analyze canvas
    const objects = canvas.getObjects()
    const canvasAnalysis = {
      dimensions: {
        width: canvas.getWidth(),
        height: canvas.getHeight()
      },
      hasContent: objects.length > 0,
      objectCount: objects.length,
      lastAnalyzedAt: Date.now()
    }
    
    // Build context
    const context: AgentContext = {
      canvas,
      conversation,
      workflowMemory,
      userPreferences: { ...DEFAULT_PREFERENCES, ...preferences },
      canvasAnalysis
    }
    
    // Create agent based on type
    switch (type) {
      case 'sequential':
        return new SequentialEditingAgent(context, maxSteps)
        
      case 'evaluator-optimizer':
        // TODO: Implement EvaluatorOptimizerAgent
        console.warn('EvaluatorOptimizerAgent not yet implemented, falling back to sequential')
        return new SequentialEditingAgent(context, maxSteps)
        
      case 'orchestrator':
        // TODO: Implement OrchestratorAgent
        console.warn('OrchestratorAgent not yet implemented, falling back to sequential')
        return new SequentialEditingAgent(context, maxSteps)
        
      case 'routing':
        return new MasterRoutingAgent(context)
        
      default:
        throw new Error(`Unknown agent type: ${type}`)
    }
  }
  
  /**
   * Get available agent types
   */
  static getAvailableTypes(): AgentType[] {
    return ['sequential', 'evaluator-optimizer', 'orchestrator', 'routing']
  }
  
  /**
   * Get description for an agent type
   */
  static getTypeDescription(type: AgentType): string {
    switch (type) {
      case 'sequential':
        return 'Executes editing steps one after another in a planned sequence'
      case 'evaluator-optimizer':
        return 'Evaluates results and optimizes parameters for better outcomes'
      case 'orchestrator':
        return 'Coordinates multiple specialized agents for complex tasks'
      case 'routing':
        return 'Routes requests to the most appropriate specialized agent'
      default:
        return 'Unknown agent type'
    }
  }
} 