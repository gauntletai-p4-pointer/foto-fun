import { NextResponse } from 'next/server'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'
import type { Canvas } from 'fabric'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

export async function GET() {
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
      renderAll: () => console.log('Mock renderAll called'),
      getWidth: () => 800,
      getHeight: () => 600
    }
    
    console.log('Executing saturation adapter with mock canvas...')
    
    // Create a proper CanvasContext for the adapter
    const canvasContext: CanvasContext = {
      canvas: mockCanvas as unknown as Canvas,
      targetImages: [],
      targetingMode: 'selection',
      dimensions: {
        width: 800,
        height: 600
      }
    }
    
    const result = await saturationAdapter.execute(testParams, canvasContext)
    
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