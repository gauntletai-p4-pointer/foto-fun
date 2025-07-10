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
    
    const { targetingMode } = context
    const totalImages = context.canvas.getObjects().filter(obj => obj.type === 'image').length
    
    return {
      needsClarification: false, // We no longer check for 'all-images' mode
      reason: totalImages > 1 ? 'Multiple images require selection' : 'Single image or no images',
      selectionCount: context.selection?.length || 0,
      totalImages,
      targetingMode,
      message: totalImages > 1 && !context.selection?.length ? 
        'Multiple images on canvas - selection required' : 
        'Ready to proceed'
    }
  }
} 