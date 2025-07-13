// AI Adapter exports
export type { AdapterMetadata } from './types/AdapterMetadata'
export type { AdapterDependencies } from './types/AdapterDependencies'
export type { AdapterBehavior } from './types/AdapterBehavior'

// Base adapter
export { UnifiedToolAdapter } from './base/UnifiedToolAdapter'

// Tool adapters
export { ImageGenerationAdapter } from './tools/ImageGenerationAdapter'
export { MoveAdapter } from './tools/MoveAdapter'
export { CropAdapter } from './tools/CropAdapter'

// Adapter registry
export { AdapterRegistry } from './registry'
