import { NextRequest, NextResponse } from 'next/server'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'

export async function POST(req: NextRequest) {
  try {
    console.log('=== TEST EXPOSURE ENDPOINT ===')
    
    // Initialize adapters
    await autoDiscoverAdapters()
    console.log('Adapters initialized')
    
    // Check if exposure adapter exists
    const exposureAdapter = adapterRegistry.get('adjustExposure')
    console.log('Exposure adapter found:', !!exposureAdapter)
    
    if (!exposureAdapter) {
      return NextResponse.json({
        success: false,
        error: 'Exposure adapter not found'
      })
    }
    
    // Simulate the exact parameters that should be sent
    const testParams = { adjustment: -10 }
    console.log('Test params:', testParams)
    
    // Create a mock canvas context
    const mockCanvas = {
      getObjects: () => [{
        type: 'image',
        filters: [],
        applyFilters: () => console.log('Mock applyFilters called')
      }],
      renderAll: () => console.log('Mock renderAll called')
    }
    
    console.log('Executing exposure adapter with mock canvas...')
    
    // Execute the adapter
    const result = await exposureAdapter.execute(testParams, { canvas: mockCanvas as any })
    
    console.log('Exposure adapter result:', result)
    
    return NextResponse.json({
      success: true,
      adapterFound: true,
      testParams,
      result
    })
  } catch (error) {
    console.error('Test exposure error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 