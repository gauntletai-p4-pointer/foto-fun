import type { AgentStep, AgentContext, StepResult } from '../types'
import { adapterRegistry } from '@/lib/ai/adapters/registry'

export interface ToolStepConfig {
  id: string
  tool: string
  params: Record<string, unknown>
  description: string
}

export class ToolStep implements AgentStep {
  id: string
  type = 'tool' as const
  description: string
  private toolName: string
  private params: Record<string, unknown>
  
  constructor(config: ToolStepConfig) {
    this.id = config.id
    this.toolName = config.tool
    this.params = config.params
    this.description = config.description
  }
  
  async execute(context: AgentContext): Promise<StepResult> {
    // Context is available but not needed for this implementation
    // since we're returning tool info for client-side execution
    void context; // Acknowledge the parameter
    
    try {
      // Get the tool adapter to validate it exists
      const adapter = adapterRegistry.get(this.toolName)
      if (!adapter) {
        throw new Error(`Tool not found: ${this.toolName}`)
      }
      
      // Instead of executing, return the tool information for client-side execution
      return {
        success: true,
        data: {
          toolName: this.toolName,
          params: this.params,
          description: this.description
        },
        confidence: 0.8, // Default confidence
        alternatives: [] // No alternatives for now
      }
    } catch (error) {
      console.error(`Error preparing tool ${this.toolName}:`, error)
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        confidence: 0
      }
    }
  }
  
  canRevert = true
  
  requiresApproval(result: StepResult): boolean {
    // Require approval for low confidence operations
    return result.confidence < 0.7
  }
} 