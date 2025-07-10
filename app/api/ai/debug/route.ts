import { NextResponse } from 'next/server'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'

export async function GET() {
  try {
    // Initialize adapters
    await autoDiscoverAdapters()
    
    // Get all adapters
    const adapters = adapterRegistry.getAll()
    
    // Get specific exposure adapter
    const exposureAdapter = adapterRegistry.get('adjustExposure')
    
    // Get AI tools
    const aiTools = adapterRegistry.getAITools()
    
    return NextResponse.json({
      success: true,
      totalAdapters: adapters.length,
      adapters: adapters.map(adapter => ({
        aiName: adapter.aiName,
        description: adapter.description,
        hasExecute: typeof adapter.execute === 'function',
        hasCanExecute: typeof adapter.canExecute === 'function',
        toolName: adapter.tool?.name || 'unknown'
      })),
      exposureAdapter: exposureAdapter ? {
        aiName: exposureAdapter.aiName,
        description: exposureAdapter.description,
        hasExecute: typeof exposureAdapter.execute === 'function',
        hasCanExecute: typeof exposureAdapter.canExecute === 'function',
        toolName: exposureAdapter.tool?.name || 'unknown'
      } : null,
      aiTools: Object.keys(aiTools),
      hasAdjustExposure: 'adjustExposure' in aiTools
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 