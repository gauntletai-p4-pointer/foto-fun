import type * as PIXI from 'pixi.js'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { Point } from '@/lib/editor/canvas/types'
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents'

// Re-export canvas types from the new location
export type { 
  Layer,
  Selection,
  BlendMode,
  Point,
  Size,
  Rect,
  Transform
} from '@/lib/editor/canvas/types'

// Re-export CanvasObject from objects/types
export type { 
  CanvasObject,
  ImageData,
  TextData,
  ShapeData,
  EffectGroup
} from '@/lib/editor/objects/types'

// Re-export ToolEvent from the canonical location
export type { ToolEvent } from '@/lib/events/canvas/ToolEvents'

// Selection types for pixel-based selections
export type SelectionMode = 'replace' | 'add' | 'subtract' | 'intersect'

export interface PixelSelection {
  type: 'pixels'
  mask: ImageData // Alpha channel represents selection (0-255)
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface SelectionState {
  selection: PixelSelection | null
  quickMaskMode: boolean
  quickMaskColor: string
  quickMaskOpacity: number
}

// Canvas state using new architecture
export interface CanvasState {
  canvasManager: CanvasManager | null
  pixiApp: PIXI.Application | null
  zoom: number
  rotation: number
  width: number
  height: number
}

// Document types
export interface Document {
  id: string
  name: string
  width: number
  height: number
  resolution: number
  colorMode: 'RGB' | 'CMYK' | 'Grayscale'
  created: Date
  modified: Date
}

// Layer types - using the new system
export type LayerType = 'raster' | 'vector' | 'text' | 'adjustment' | 'group'

// Tool types - updated for Konva architecture
export interface Tool {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  cursor: string
  group?: string
  shortcut?: string
  isImplemented: boolean
  onActivate?: (canvas: CanvasManager) => void
  onDeactivate?: (canvas: CanvasManager) => void
  onMouseDown?: (e: ToolEvent) => void
  onMouseMove?: (e: ToolEvent) => void
  onMouseUp?: (e: ToolEvent) => void
}

// History types
export interface HistoryEntry {
  id: string
  action: string
  timestamp: number
  thumbnail?: string
  data?: any
}

// Export types
export type ExportFormat = 'png' | 'jpeg' | 'webp'

export interface ExportOptions {
  format: ExportFormat
  quality?: number
  width?: number
  height?: number
  includeMetadata?: boolean
}

// Unified Filter interfaces
export interface Filter {
  id: string
  name: string
  type: string
  params: Record<string, string | number | boolean>
  // Add index signature to make it compatible with Record<string, unknown>
  [key: string]: unknown
}

export interface FilterStack {
  filters: Filter[]
  enabled?: boolean
  opacity?: number
  blendMode?: string
  isDirty?: boolean
}