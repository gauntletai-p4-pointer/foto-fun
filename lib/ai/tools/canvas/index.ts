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
    
    const { targetingMode, inferenceMetadata } = context
    const totalImages = context.canvas.getObjects().filter(obj => obj.type === 'image').length
    
    return {
      needsClarification: totalImages > 1 && targetingMode === 'all-images' && !inferenceMetadata?.userHadSelection,
      totalImages,
      targetingMode,
      hasSelection: inferenceMetadata?.userHadSelection || false,
      autoTargeting: inferenceMetadata?.autoTargeted || false,
      message: totalImages > 1 && targetingMode === 'all-images' ? 
        `Multiple images found (${totalImages}) with no selection. Clarification recommended.` :
        'No clarification needed - clear targeting available.'
    }
  }
} 