/**
 * Canvas dimension helpers
 * Provides consistent access to canvas dimensions across the codebase
 */

/**
 * Get viewport dimensions (the actual canvas container size)
 */
export function getViewportDimensions(container: HTMLElement): { width: number; height: number } {
  return {
    width: container.offsetWidth || 800, // Default fallback
    height: container.offsetHeight || 600
  }
}

/**
 * Calculate scale to fit objects in viewport
 */
export function calculateFitToScreenScale(
  objectBounds: { x: number; y: number; width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 40
): { scale: number; panX: number; panY: number } {
  const scaleX = (viewportWidth - padding * 2) / objectBounds.width
  const scaleY = (viewportHeight - padding * 2) / objectBounds.height
  const scale = Math.min(scaleX, scaleY, 1) // Don't zoom in beyond 100%
  
  // Calculate pan to center the objects
  const scaledWidth = objectBounds.width * scale
  const scaledHeight = objectBounds.height * scale
  const panX = (viewportWidth - scaledWidth) / 2 - objectBounds.x * scale
  const panY = (viewportHeight - scaledHeight) / 2 - objectBounds.y * scale
  
  return { scale, panX, panY }
} 