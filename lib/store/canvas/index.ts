// Export specific items to avoid conflicts
export { CanvasStore, getCanvasStore as getCanvasStoreInstance } from './CanvasStore'
export { TypedCanvasStore, type CanvasStoreState } from './TypedCanvasStore'

// React Hook - Re-export from TypedCanvasStore which already has the proper hook
export { useCanvasStore } from './TypedCanvasStore'

// Non-React access
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import { TypedCanvasStore } from './TypedCanvasStore'

/**
 * Get canvas store instance for non-React contexts
 * Should be used in classes, commands, etc.
 */
export function getCanvasStore(): TypedCanvasStore {
  return ServiceContainer.getInstance().getSync<TypedCanvasStore>('CanvasStore')
} 