// Canvas state checking tools

// Simple selection state checker for AI to determine if clarification is needed
export const checkSelectionState = {
  name: 'checkSelectionState',
  description: 'Check current canvas selection state to determine if clarification is needed',
  execute: async () => {
    const { CanvasToolBridge } = await import('@/lib/ai/tools/canvas-bridge')
    const context = CanvasToolBridge.getCanvasContext()
    
    if (!context) {
      return {
        needsClarification: false,
        reason: 'No canvas context available'
      }
    }
    
    const { targetingMode, selection } = context
    const totalImages = context.canvas.getObjects().filter(obj => obj.type === 'image').length
    
    // Calculate selection count based on selection type
    let selectionCount = 0
    if (selection) {
      if (selection.type === 'objects') {
        selectionCount = selection.objectIds.length
      } else {
        // For pixel, rectangle, ellipse selections, count as 1
        selectionCount = 1
      }
    }
    
    return {
      needsClarification: false, // We no longer check for 'all-images' mode
      reason: totalImages > 1 ? 'Multiple images require selection' : 'Single image or no images',
      selectionCount,
      totalImages,
      targetingMode,
      message: totalImages > 1 && selectionCount === 0 ? 
        'Multiple images on canvas - selection required' : 
        'Ready to proceed'
    }
  }
} 