import type * as PIXI from 'pixi.js'
import type { Canvas, TPointerEventInfo, TPointerEvent } from 'fabric'

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
export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: string
  type: 'image' | 'adjustment' | 'text' | 'shape' | 'group'
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

// Export types
export type ExportFormat = 'png' | 'jpeg' | 'webp'

export interface ExportOptions {
  format: ExportFormat
  quality?: number
  width?: number
  height?: number
  includeMetadata?: boolean
} 