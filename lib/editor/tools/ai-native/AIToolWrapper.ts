import type { ComponentType } from 'react'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import type { BaseAITool } from '@/lib/ai/tools/base'
import { getCanvasStore } from '@/lib/store/canvas'
import { getToolStore } from '@/lib/store/tools'
import { TOOL_IDS } from '@/constants'

// Define tool state
type AIToolWrapperState = {
  isActive: boolean
  isProcessing: boolean
}

/**
 * AIToolWrapper - Wraps AI-Native Tools to make them available in the tool palette
 * 
 * This wrapper creates Canvas Tool instances from AI-Native Tools,
 * allowing them to appear in the UI tool palette while maintaining
 * their AI chat compatibility through adapters.
 */
export class AIToolWrapper extends BaseTool {
  // Required Tool interface properties
  id: string
  name: string
  icon: ComponentType
  cursor = 'default'
  shortcut?: string
  
  // The wrapped AI-Native tool
  private aiTool: BaseAITool
  
  // Tool state
  private state = createToolState<AIToolWrapperState>({
    isActive: false,
    isProcessing: false
  })
  
  constructor(
    toolId: string,
    aiTool: BaseAITool,
    icon: ComponentType,
    shortcut?: string
  ) {
    super()
    this.id = toolId
    this.aiTool = aiTool
    this.name = aiTool.name
    this.icon = icon
    this.shortcut = shortcut
  }
  
  /**
   * Setup tool - trigger UI based on tool's activation type
   */
  protected setupTool(): void {
    if (!this.aiTool.supportsUIActivation) {
      console.warn(`AI tool ${this.aiTool.name} does not support UI activation`)
      return
    }
    
    // AI tools are managed through the regular tool system
    // The UI components can check the active tool from the tool store
    this.state.set('isActive', true)
    
    // For immediate activation tools, we might execute right away
    if (this.aiTool.uiActivationType === 'immediate') {
      this.executeImmediate()
    }
  }
  
  /**
   * Cleanup when tool is deactivated
   */
  protected cleanup(): void {
    this.state.reset()
    // AI tools are deactivated through the regular tool system
  }
  
  /**
   * Required abstract method from BaseTool
   */
  protected cleanupTool(): void {
    this.cleanup()
  }
  
  /**
   * Execute immediate AI tools (no UI needed)
   */
  private async executeImmediate(): Promise<void> {
    // This would be for tools that don't need user input
    // Currently, most AI tools need parameters, so this is rarely used
    console.log('Immediate execution not implemented for', this.aiTool.name)
  }
  
  /**
   * Handle completion from UI dialog/panel
   * This is called by the UI component after successful execution
   */
  public onComplete(): void {
    // Switch back to move tool after completion
    const toolStore = getToolStore()
    toolStore.activateTool(TOOL_IDS.MOVE)
  }
}

/**
 * Factory function to create Canvas Tool wrappers for AI-Native Tools
 */
export function createAIToolWrapper(
  toolId: string,
  aiTool: BaseAITool,
  icon: ComponentType,
  shortcut?: string
): AIToolWrapper {
  return new AIToolWrapper(toolId, aiTool, icon, shortcut)
} 