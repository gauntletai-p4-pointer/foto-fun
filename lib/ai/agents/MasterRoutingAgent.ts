import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { ImageImprovementAgent } from './specialized/ImageImprovementAgent'
import type { AgentContext, AgentResult } from './types'

// Route analysis schema - simplified to only handle agent routing
const routeAnalysisSchema = z.object({
  agentType: z.enum([
    'image-improvement',  // For enhance/improve requests
    'batch-processing',   // For batch operations (future)
    'creative-enhancement', // For creative edits (future)
    'none'               // No agent needed
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  estimatedSteps: z.number().optional()
})

export class MasterRoutingAgent {
  name = 'master-router'
  description = 'Routes complex requests to specialized agents'
  
  private context: AgentContext
  private statusUpdates: Array<{
    type: string
    message: string
    details?: string
    timestamp: string
  }> = []
  
  constructor(context: AgentContext) {
    this.context = context
  }

  async execute(request: string): Promise<AgentResult> {
    console.log('[MasterRoutingAgent] Starting execution for:', request)
    
    try {
      // Check if we have valid canvas context
      if (!this.context.canvasAnalysis) {
        console.log('[MasterRoutingAgent] No canvas analysis available')
        return {
          completed: false,
          results: [{
            success: false,
            data: { 
              error: 'No canvas context available',
              statusUpdates: this.statusUpdates
            },
            confidence: 0
          }],
          reason: 'No canvas context available'
        }
      }
      
      console.log('[MasterRoutingAgent] Canvas analysis:', {
        dimensions: this.context.canvasAnalysis.dimensions,
        hasContent: this.context.canvasAnalysis.hasContent,
        objectCount: this.context.canvasAnalysis.objectCount
      })
      
      // Analyze which agent to use
      const analysis = await this.analyzeAgentRoute(request)
      
      this.addStatusUpdate('routing-decision', 'Agent routing decision made', 
        `Agent: ${analysis.agentType} (confidence: ${Math.round(analysis.confidence * 100)}%)\nReasoning: ${analysis.reasoning}`)
      
      // Route to appropriate agent
      let result: AgentResult
      
      switch (analysis.agentType) {
        case 'image-improvement':
          result = await this.delegateToImageImprovementAgent(request)
          break
          
        case 'batch-processing':
          // Future: BatchProcessingAgent
          this.addStatusUpdate('routing-decision', 'Batch processing not yet implemented', 
            'This feature is coming soon')
          result = {
            completed: false,
            results: [{
              success: false,
              data: { 
                error: 'Batch processing agent not yet implemented',
                statusUpdates: this.statusUpdates
              },
              confidence: 0
            }],
            reason: 'Feature not implemented'
          }
          break
          
        case 'creative-enhancement':
          // Future: CreativeEnhancementAgent
          this.addStatusUpdate('routing-decision', 'Creative enhancement not yet implemented', 
            'This feature is coming soon')
          result = {
            completed: false,
            results: [{
              success: false,
              data: { 
                error: 'Creative enhancement agent not yet implemented',
                statusUpdates: this.statusUpdates
              },
              confidence: 0
            }],
            reason: 'Feature not implemented'
          }
          break
          
        case 'none':
        default:
          // This shouldn't happen - chat route should handle non-agent requests
          this.addStatusUpdate('routing-decision', 'No agent needed', 
            'This request should have been handled by the chat route')
          result = {
            completed: false,
            results: [{
              success: false,
              data: { 
                error: 'Request does not require an agent',
                statusUpdates: this.statusUpdates
              },
              confidence: 0
            }],
            reason: 'No agent needed'
          }
      }
      
      // Attach status updates to the first result
      if (result.results.length > 0) {
        const firstResult = result.results[0]
        const existingStatusUpdates = (firstResult.data as { statusUpdates?: Array<{
          type: string
          message: string
          details?: string
          timestamp: string
        }> })?.statusUpdates || []
        
        firstResult.data = {
          ...(firstResult.data as Record<string, unknown>),
          statusUpdates: [...this.statusUpdates, ...existingStatusUpdates]
        }
      }
      
      this.addStatusUpdate('generating-response', 'Workflow complete', 
        `Completed with ${result.results.length} results`)
      
      return result
    } catch (error) {
      this.addStatusUpdate('generating-response', 'Error in execution', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      console.error('[MasterRoutingAgent] Error in execute:', error)
      return {
        completed: false,
        results: [{
          success: false,
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            statusUpdates: this.statusUpdates
          },
          confidence: 0
        }],
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Helper method to add status updates with timestamps
  private addStatusUpdate(type: string, message: string, details?: string): void {
    this.statusUpdates.push({
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    })
    console.log(`[MasterRoutingAgent] ${type}: ${message}${details ? ` - ${details}` : ''}`)
  }

  // Analyze request to determine which agent to use
  private async analyzeAgentRoute(request: string): Promise<z.infer<typeof routeAnalysisSchema>> {
    console.log('[MasterRoutingAgent] === ANALYZING AGENT ROUTE ===')
    console.log('[MasterRoutingAgent] Request:', request)
    console.log('[MasterRoutingAgent] Canvas has content:', this.context.canvasAnalysis.hasContent)
    
    const { object: analysis } = await generateObject({
      model: openai('gpt-4o'),
      schema: routeAnalysisSchema,
      prompt: `Analyze this request and determine which specialized agent should handle it:

"${request}"

Canvas context:
- Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
- Has content: ${this.context.canvasAnalysis.hasContent}
- Object count: ${this.context.canvasAnalysis.objectCount}

AGENT TYPES:
1. **image-improvement**: For subjective quality improvements
   - Examples: "improve this photo", "enhance the image", "make it look professional"
   - Requests that need AI vision analysis and iterative improvement
   - Uses computer vision to analyze and plan improvements
   - ONLY for existing images (canvas must have content)

2. **batch-processing** (future): For applying operations to multiple images
   - Examples: "apply this to all images", "batch resize", "process folder"
   
3. **creative-enhancement** (future): For artistic transformations
   - Examples: "make it artistic", "create a painting effect", "stylize"

4. **none**: Request doesn't need a specialized agent
   - Simple tool operations handled by chat route
   - Text responses
   - Single tool executions

IMPORTANT:
- Only route to image-improvement if canvas has content
- This router ONLY handles complex agent workflows
- Simple operations are handled by the chat route directly

Analyze and provide the appropriate agent type.`
    })
    
    console.log('[MasterRoutingAgent] === AGENT ROUTE ANALYSIS RESULT ===')
    console.log('[MasterRoutingAgent] Agent type:', analysis.agentType)
    console.log('[MasterRoutingAgent] Confidence:', analysis.confidence)
    console.log('[MasterRoutingAgent] Reasoning:', analysis.reasoning)
    
    return analysis
  }

  // Delegate to ImageImprovementAgent
  private async delegateToImageImprovementAgent(request: string): Promise<AgentResult> {
    this.addStatusUpdate('planning-steps', 'Delegating to Image Improvement Agent', 
      'Using AI-powered computer vision for iterative image improvement')
    
    const imageAgent = new ImageImprovementAgent()
    const result = await imageAgent.execute(request, this.context)
    
    // Merge status updates from image agent
    if (result.results.length > 0) {
      const firstResult = result.results[0]
      const agentStatusUpdates = (firstResult.data as { statusUpdates?: Array<{
        type: string
        message: string
        details?: string
        timestamp: string
      }> })?.statusUpdates || []
      
      // Combine our routing updates with agent updates
      firstResult.data = {
        ...(firstResult.data as Record<string, unknown>),
        statusUpdates: [...this.statusUpdates, ...agentStatusUpdates]
      }
    }
    
    return result
  }
} 