import { NextRequest, NextResponse } from 'next/server'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'
import { generateObject } from 'ai'
import { z } from 'zod'
import { openai } from '@/lib/ai/providers'
import type { Canvas } from 'fabric'

// Route analysis schema (copied from MasterRoutingAgent)
const routeAnalysisSchema = z.object({
  requestType: z.enum([
    'text-only',
    'simple-tool',
    'sequential-workflow',
    'evaluator-optimizer',
    'orchestrator-worker'
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  complexity: z.enum(['trivial', 'simple', 'moderate', 'complex']),
  suggestedTool: z.string().optional(),
  textResponse: z.string().optional(),
  estimatedSteps: z.number().optional()
})

async function handleDebugSaturation(request: string) {
  try {
    console.log('=== DEBUG SATURATION FLOW ===')
    console.log('Request:', request)
      
    // Step 1: Initialize adapters
    await autoDiscoverAdapters()
    console.log('✅ Adapters initialized')
    
    // Step 2: Check adapter registration
    const saturationAdapter = adapterRegistry.get('adjustSaturation')
    console.log('✅ Saturation adapter found:', !!saturationAdapter)
    
    if (!saturationAdapter) {
      return NextResponse.json({
        success: false,
        error: 'Saturation adapter not found',
        step: 'adapter-registration'
      })
    }
    
    // Step 3: Check AI tools
    const aiTools = adapterRegistry.getAITools()
    const hasSaturationTool = 'adjustSaturation' in aiTools
    console.log('✅ Saturation in AI tools:', hasSaturationTool)
    
    // Step 4: Test route analysis (like MasterRoutingAgent does)
    const availableTools = Array.from(adapterRegistry.getAll()).map(a => a.aiName)
    console.log('✅ Available tools:', availableTools)
    
    const { object: analysis } = await generateObject({
      model: openai('gpt-4o'),
      schema: routeAnalysisSchema,
      messages: [{
        role: 'user',
        content: `Analyze this photo editing request and determine the best execution strategy:

"${request}"

Available tools: ${availableTools.join(', ')}

ROUTING RULES:
1. **text-only**: Questions, help requests, or informational queries
2. **simple-tool**: Single, straightforward tool operations
   - Examples: "make it brighter", "crop to square", "rotate 90 degrees"  
   - Color adjustments: "increase saturation by 25%", "make colors more vibrant", "reduce saturation"
   - Should be high confidence (>0.8) for auto-approval
   - Suggest the specific tool to use
3. **sequential-workflow**: Multi-step operations requiring planning

Analyze the request and provide:
- requestType: the type of request (simple-tool for saturation adjustments)
- confidence: confidence level (0-1)
- reasoning: clear reasoning for the decision
- complexity: complexity level (simple for basic adjustments)
- suggestedTool: the specific tool name (adjustSaturation for saturation requests)
- textResponse: leave empty for tool requests
- estimatedSteps: leave empty for simple tools`
      }]
    })
    
    console.log('✅ Route analysis:', analysis)
    
    // Step 5: Test parameter inference
    if (analysis.suggestedTool === 'adjustSaturation') {
      const { object: params } = await generateObject({
        model: openai('gpt-4o'),
        schema: z.object({
          adjustment: z.number().min(-100).max(100).describe('Saturation adjustment from -100 to 100')
        }),
        messages: [{
          role: 'user',
          content: `Infer parameters for the adjustSaturation tool based on this request: "${request}"

Tool description: ${saturationAdapter.description}

Provide the adjustment parameter as a number between -100 and 100.
For "increase saturation by 25%" you should return: {"adjustment": 25}
For "make colors more vibrant" you should return: {"adjustment": 30}
Be precise with percentage values when specified.`
        }]
      })
      
      console.log('✅ Inferred parameters:', params)
      
      // Step 6: Test direct execution
      try {
        const mockCanvas = {
          getObjects: () => [{
            type: 'image',
            filters: [],
            applyFilters: () => console.log('Mock applyFilters called')
          }],
          renderAll: () => console.log('Mock renderAll called')
        }
        
        // Create a proper CanvasContext for the adapter
        const canvasContext = {
          canvas: mockCanvas as unknown as Canvas,
          targetImages: [], // No images in mock canvas
          targetingMode: 'all-images' as const,
          dimensions: {
            width: 800,
            height: 600
          }
        }
        
        const executionResult = await saturationAdapter.execute(params, canvasContext)
        console.log('✅ Direct execution result:', executionResult)
        
        return NextResponse.json({
          success: true,
          steps: {
            adapterFound: true,
            aiToolsAvailable: hasSaturationTool,
            routeAnalysis: analysis,
            inferredParams: params,
            executionResult
          }
        })
      } catch (execError) {
        console.log('❌ Direct execution failed:', execError)
        return NextResponse.json({
          success: false,
          error: 'Direct execution failed',
          details: execError instanceof Error ? execError.message : 'Unknown error',
          steps: {
            adapterFound: true,
            aiToolsAvailable: hasSaturationTool,
            routeAnalysis: analysis,
            inferredParams: params
          }
        })
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Wrong tool suggested',
        expected: 'adjustSaturation',
        actual: analysis.suggestedTool,
        steps: {
          adapterFound: true,
          aiToolsAvailable: hasSaturationTool,
          routeAnalysis: analysis
                 }
       })
     }
     
   } catch (error) {
     console.error('Debug saturation error:', error)
     return NextResponse.json({
       success: false,
       error: error instanceof Error ? error.message : 'Unknown error',
       stack: error instanceof Error ? error.stack : undefined
     }, { status: 500 })
   }
}

export async function GET() {
  try {
    return handleDebugSaturation("Increase the saturation by 25% to make colors more vibrant")
  } catch (error) {
    console.error('❌ Error in debug-saturation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug saturation', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Handle empty request body
    let requestBody: { request?: string } = {}
    try {
      requestBody = await req.json()
    } catch (error) {
      console.error('[Debug] Error processing request:', error)
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      )
    }
    
    const { request = "Increase the saturation by 25% to make colors more vibrant" } = requestBody
    return handleDebugSaturation(request)
  } catch (error) {
    console.error('POST debug saturation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 