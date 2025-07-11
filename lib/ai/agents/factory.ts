import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { UIMessage } from 'ai'
import type { AgentContext, UserPreferences } from './types'
import { WorkflowMemory } from './WorkflowMemory'
import { MasterRoutingAgent } from './MasterRoutingAgent'
import { ImageImprovementAgent } from './specialized/ImageImprovementAgent'
// NOT LIVE YET - Part of Epic 5.3 Phase 3
// import { BatchProcessingAgent } from './specialized/BatchProcessingAgent'
// import { CreativeEnhancementAgent } from './specialized/CreativeEnhancementAgent'

// Default user preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  autoApprovalThreshold: 0.8,
  maxAutonomousSteps: 5,
  preferredComparisonMode: 'side-by-side',
  historicalChoices: []
}

export type AgentType = 
  | 'master-routing' 
  | 'image-improvement'
  // NOT LIVE YET - Part of Epic 5.3 Phase 3
  // | 'batch-processing'
  // | 'creative-enhancement'

interface CreateAgentOptions {
  type: AgentType
  canvas: CanvasManager
  conversation: UIMessage[]
  preferences?: Partial<UserPreferences>
  maxSteps?: number
}

export class AgentFactory {
  /**
   * Create an agent with the specified type and context
   */
  static createAgent(options: CreateAgentOptions) {
    const { type, canvas, conversation, preferences = {} } = options
    
    // Create workflow memory
    const workflowMemory = new WorkflowMemory(canvas)
    
    // Analyze canvas using object-based API
    const objects = canvas.getAllObjects()
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
      case 'master-routing':
        return new MasterRoutingAgent(context)
        
      case 'image-improvement':
        // ImageImprovementAgent doesn't need context in constructor
        // It receives context in the execute method
        return new ImageImprovementAgent()
        
      // NOT LIVE YET - Part of Epic 5.3 Phase 3
      // case 'batch-processing':
      //   return new BatchProcessingAgent()
      //   
      // case 'creative-enhancement':
      //   return new CreativeEnhancementAgent()
        
      default:
        throw new Error(`Unknown agent type: ${type}`)
    }
  }

  static getAvailableAgents(): AgentType[] {
    return [
      'master-routing',
      'image-improvement'
      // NOT LIVE YET - Part of Epic 5.3 Phase 3
      // 'batch-processing',
      // 'creative-enhancement'
    ]
  }

  static getAgentInfo(type: AgentType): { name: string; description: string } {
    switch (type) {
      case 'master-routing':
        return {
          name: 'Master Routing Agent',
          description: 'Routes requests to appropriate handlers'
        }
      case 'image-improvement':
        return {
          name: 'Image Improvement Agent',
          description: 'Iteratively improves image quality using AI analysis'
        }
      // NOT LIVE YET - Part of Epic 5.3 Phase 3
      // case 'batch-processing':
      //   return {
      //     name: 'Batch Processing Agent',
      //     description: 'Processes multiple images with consistent parameters'
      //   }
      // case 'creative-enhancement':
      //   return {
      //     name: 'Creative Enhancement Agent',
      //     description: 'Applies artistic and creative enhancements to images'
      //   }
      default:
        return {
          name: type,
          description: 'No description available'
        }
    }
  }
} 