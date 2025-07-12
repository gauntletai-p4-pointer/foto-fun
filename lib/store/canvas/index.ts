// Export specific items to avoid conflicts
export { CanvasStore, getCanvasStore as getCanvasStoreInstance } from './CanvasStore'
export { TypedCanvasStore, type CanvasStoreState } from './TypedCanvasStore'

// React Hook - Re-export from TypedCanvasStore which already has the proper hook
export { useCanvasStore } from './TypedCanvasStore'

// Note: getCanvasStore() function removed - all classes should receive 
// TypedCanvasStore through constructor injection instead of using singleton access 