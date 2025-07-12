// Export only the CanvasStore class - singleton pattern eliminated
export { CanvasStore } from './CanvasStore'
export type { CanvasState } from './CanvasStore'

// React Hook - Re-export from TypedCanvasStore which already has the proper hook
export { useCanvasStore } from './TypedCanvasStore'

// Note: getCanvasStore() function removed - all classes should receive 
// TypedCanvasStore through constructor injection instead of using singleton access 