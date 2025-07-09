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
    try {
      // Get the tool adapter
      const adapter = adapterRegistry.get(this.toolName)
      if (!adapter) {
        throw new Error(`Tool not found: ${this.toolName}`)
      }
      
      // Execute the tool
      const result = await adapter.execute(this.params, { canvas: context.canvas })
      
      // Generate preview if available
      let preview
      if (adapter.generatePreview) {
        const previewData = await adapter.generatePreview(this.params, context.canvas)
        preview = {
          before: previewData.before,
          after: previewData.after
        }
      }
      
      return {
        success: true,
        data: result,
        confidence: 0.8, // Default confidence
        preview,
        alternatives: [] // No alternatives for now
      }
    } catch (error) {
      console.error(`Error executing tool ${this.toolName}:`, error)
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