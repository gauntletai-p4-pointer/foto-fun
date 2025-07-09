import type * as PIXI from 'pixi.js'
import type { Canvas, TPointerEventInfo, TPointerEvent, FabricObject } from 'fabric'
import type { PixelSelection } from '@/lib/editor/selection/SelectionManager'

// Canvas types
export interface CanvasState {
  fabricCanvas: Canvas | null
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

// Layer types
export type LayerType = 'image' | 'text' | 'shape' | 'adjustment' | 'group'

export type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

export interface Layer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  opacity: number // 0-100
  blendMode: BlendMode
  locked: boolean
  parentId?: string // for groups
  childIds?: string[] // for groups
  objectIds?: string[] // IDs of fabric objects in this layer
  thumbnail?: string // Base64 thumbnail for UI
  position: number // Layer stack position (0 = bottom)
}

export interface LayerGroup extends Layer {
  type: 'group'
  childIds: string[]
  expanded: boolean
}

// Tool event type - properly typed Fabric.js event
export type ToolEvent = TPointerEventInfo<TPointerEvent> & {
  target: Canvas
}

// Tool types
export interface Tool {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  cursor: string
  group?: string
  shortcut?: string
  isImplemented: boolean
  onActivate?: (canvas: Canvas) => void
  onDeactivate?: (canvas: Canvas) => void
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

// Custom properties we add to Fabric objects
export interface CustomFabricObjectProps {
  layerId?: string
  id?: string
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

// Object-aware selection types
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ObjectRegistry {
  pixelToObject: Map<string, string>
  objectBounds: Map<string, BoundingBox>
  renderOrder: string[]
}

export interface LayerAwareSelectionManager {
  // From base SelectionManager
  canvas: Canvas
  selection: PixelSelection | null
  
  // New properties
  objectSelections: Map<string, PixelSelection>
  activeObjectId: string | null
  mode: SelectionMode
  
  // Methods (interface only)
  createObjectSelection: (objectId: string, mask: ImageData) => void
  getObjectSelection: (objectId: string) => PixelSelection | null
  applySelectionToObject: (objectId: string, operation: any) => void
  setActiveObject: (objectId: string | null) => void
}

export interface ObjectPixelCache {
  cache: Map<string, {
    imageData: ImageData
    bounds: BoundingBox
    timestamp: number
  }>
}

export type SelectionMode = 'global' | 'object' | 'layer'

// Re-export selection types
export type { PixelSelection } 