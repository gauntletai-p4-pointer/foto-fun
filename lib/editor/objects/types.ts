import type { BlendMode } from '@/lib/editor/canvas/types'
import type { Filter } from '@/types'
import type Konva from 'konva'

export interface Adjustment {
  id: string
  type: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'curves' | 'levels' | 'exposure'
  params: Record<string, number | string | boolean>
  enabled: boolean
}

export interface CanvasObject {
  id: string
  type: 'image' | 'text' | 'shape' | 'group' | 'verticalText' | 'frame'
  name: string
  
  // Position & Transform
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  
  // Optional combined transform for compatibility
  transform?: import('@/lib/editor/canvas/types').Transform
  
  // Stacking
  zIndex: number
  
  // Visual Properties
  opacity: number
  blendMode: BlendMode
  visible: boolean
  locked: boolean
  
  // Effects
  filters: Filter[]
  adjustments: Adjustment[]
  
  // Group-specific
  children?: string[] // Object IDs
  parent?: string // Parent object ID (for hierarchical objects)
  
  // Type-specific data
  data: ImageData | TextData | ShapeData | GroupData | FrameData
  
  // Konva node reference (managed by CanvasManager)
  node?: Konva.Node
  
  // Metadata for selections, effects, etc
  metadata?: {
    isEffectGroup?: boolean
    selection?: {
      type: 'lasso' | 'rectangle' | 'ellipse'
      mask?: ImageData
      bounds?: { x: number; y: number; width: number; height: number }
    }
    // Frame-specific metadata
    isAutoFrame?: boolean
    [key: string]: unknown
  }
}

export interface ImageData {
  src?: string
  naturalWidth: number
  naturalHeight: number
  element: HTMLImageElement | HTMLCanvasElement
}

export interface TextData {
  content: string
  font: string
  fontSize: number
  color: string
  align: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
  // For vertical text
  direction?: 'horizontal' | 'vertical'
  // For text warp effects
  isWarped?: boolean
  warpStyle?: string | null
  bendAmount?: number
}

export interface ShapeData {
  type: 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'path'
  fill?: string
  stroke?: string
  strokeWidth?: number
  points?: Array<{ x: number; y: number }> // For polygon/path
  radius?: number // For rounded rectangles
  path?: string // SVG path string for path shapes
}

export interface GroupData {
  type: 'group'
  children?: string[] // Object IDs in the group
}

/**
 * Frame-specific data interface
 * Frames are visual boundaries that define export regions
 */
export interface FrameData {
  type: 'frame'
  
  // Frame preset information
  preset?: string // 'instagram-post', 'business-card', 'a4-portrait', etc.
  exportName?: string // Custom name for exports
  
  // Visual styling
  style: {
    fill: string | 'transparent'
    stroke: {
      color: string
      width: number
      style: 'solid' | 'dashed'
    }
    background?: {
      color: string
      opacity: number
    }
  }
  
  // Export configuration
  export: {
    format: 'png' | 'jpeg' | 'webp'
    quality: number
    dpi: number
  }
  
  // Frame behavior settings
  clipping: {
    enabled: boolean // Whether frame clips content
    showOverflow: boolean // Show content outside frame on canvas
    exportClipped: boolean // Export only clipped content
  }
}

/**
 * Frame preset definition
 */
export interface FramePreset {
  id: string
  name: string
  width: number
  height: number
  category: 'social' | 'print' | 'web' | 'document'
  dpi?: number
  description?: string
}

/**
 * Frame object type - extends CanvasObject with frame-specific properties
 */
export interface FrameObject extends CanvasObject {
  type: 'frame'
  data: FrameData
}

// Helper type for effect groups
export interface EffectGroup extends CanvasObject {
  type: 'group'
  metadata: {
    isEffectGroup: true
    originalObjectId: string
    effects: Array<{
      type: string
      objectId: string
    }>
  }
}

// Type guards
export function isImageObject(obj: CanvasObject): obj is CanvasObject & { data: ImageData } {
  return obj.type === 'image'
}

export function isTextObject(obj: CanvasObject): obj is CanvasObject & { data: TextData } {
  return obj.type === 'text'
}

export function isShapeObject(obj: CanvasObject): obj is CanvasObject & { data: ShapeData } {
  return obj.type === 'shape'
}

export function isGroupObject(obj: CanvasObject): obj is CanvasObject & { type: 'group' } {
  return obj.type === 'group'
}

export function isFrameObject(obj: CanvasObject): obj is FrameObject {
  return obj.type === 'frame'
}

export function isEffectGroup(obj: CanvasObject): obj is EffectGroup {
  return obj.type === 'group' && obj.metadata?.isEffectGroup === true
} 