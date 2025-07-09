import { NextRequest, NextResponse } from 'next/server'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'

export async function POST(req: NextRequest) {
  try {
    console.log('=== TEST SATURATION ENDPOINT ===')
    
    // Initialize adapters
    await autoDiscoverAdapters()
    console.log('Adapters initialized')
    
    // Check if saturation adapter exists
    const saturationAdapter = adapterRegistry.get('adjustSaturation')
    console.log('Saturation adapter found:', !!saturationAdapter)
    
    if (!saturationAdapter) {
      return NextResponse.json({
        success: false,
        error: 'Saturation adapter not found'
      })
    }
    
    // Simulate the exact parameters that should be sent for "Increase the saturation by 25%"
    const testParams = { adjustment: 25 }
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
    
    console.log('Executing saturation adapter with mock canvas...')
    
    // Execute the adapter
    const result = await saturationAdapter.execute(testParams, { canvas: mockCanvas as any })
    
    console.log('Saturation adapter result:', result)
    
    return NextResponse.json({
      success: true,
      adapterFound: true,
      testParams,
      result,
      description: saturationAdapter.description
    })
  } catch (error) {
    console.error('Test saturation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 