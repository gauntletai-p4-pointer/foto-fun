import { NextResponse } from 'next/server'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'
import type { Canvas } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

export async function GET() {
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
    
    // Create a proper CanvasContext for the adapter
    const canvasContext: CanvasContext = {
      canvas: mockCanvas as unknown as Canvas,
      targetImages: [], // No images in mock canvas
      targetingMode: 'selection',
      dimensions: {
        width: 800,
        height: 600
      }
    }
    
    const result = await exposureAdapter.execute(testParams, canvasContext)
    
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