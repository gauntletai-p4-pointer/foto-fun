import type Konva from 'konva'

/**
 * Core canvas types for the new Konva-based architecture
 */

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

export interface Transform {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skewX: number
  skewY: number
}

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

export interface CanvasObject {
  id: string
  type: 'image' | 'text' | 'shape' | 'path' | 'group'
  name?: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  transform: Transform
  node: any // Konva.Node - using any to avoid circular dependency
  layerId: string
  // Additional data based on type
  data?: any // HTMLImageElement for images, string for text, etc.
  filters?: Filter[]
  style?: Record<string, any>
  metadata?: Record<string, any>
}

export interface Layer {
  id: string
  name: string
  type: 'raster' | 'vector' | 'adjustment' | 'text' | 'group'
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  
  // Konva layer reference
  konvaLayer: Konva.Layer
  
  // Objects in this layer
  objects: CanvasObject[]
  
  // Parent layer for groups
  parentId?: string
  
  // Mask (if any)
  mask?: {
    type: 'alpha' | 'vector'
    data: ImageData | Konva.Shape
  }
}

export type Selection = 
  | { type: 'rectangle'; bounds: Rect; feather: number; antiAlias: boolean }
  | { type: 'ellipse'; bounds: Rect; feather: number; antiAlias: boolean }
  | { type: 'polygon'; points: Point[]; feather: number; antiAlias: boolean }
  | { type: 'freeform'; path: string; feather: number; antiAlias: boolean }
  | { type: 'pixel'; bounds: Rect; mask: ImageData }
  | { type: 'objects'; objectIds: string[] } // Add object-based selection

export interface CanvasState {
  width: number
  height: number
  zoom: number
  pan: Point
  layers: Layer[]
  selection: Selection | null
  activeLayerId: string | null
  backgroundColor: string
  isLoading: boolean
  canUndo: boolean
  canRedo: boolean
}

export interface Tool {
  id: string
  name: string
  icon: React.ComponentType
  cursor: string
  shortcut?: string
  
  // Tool lifecycle
  onActivate(canvas: CanvasManager): void
  onDeactivate(canvas: CanvasManager): void
  
  // Event handlers
  onMouseDown?(event: ToolEvent): void
  onMouseMove?(event: ToolEvent): void
  onMouseUp?(event: ToolEvent): void
  onKeyDown?(event: KeyboardEvent): void
  onKeyUp?(event: KeyboardEvent): void
}

export interface ToolEvent {
  point: Point // Canvas coordinates
  screenPoint: Point // Screen coordinates
  pressure: number
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
  button: number
}

export interface Filter {
  id?: string
  name?: string
  type: 'brightness' | 'contrast' | 'blur' | 'grayscale' | 'sepia' | 'invert' | 
        'hue' | 'saturation' | 'pixelate' | 'noise' | 'emboss' | 'enhance' | 
        'sharpen' | 'custom'
  params: Record<string, any>
  apply?: (imageData: ImageData, params: Record<string, unknown>) => ImageData
}

export interface CanvasManager {
  // State
  state: CanvasState
  
  // Konva access
  konvaStage: Konva.Stage
  
  // Layer operations
  addLayer(layer: Partial<Layer>): Layer
  removeLayer(layerId: string): void
  setActiveLayer(layerId: string): void
  getActiveLayer(): Layer | null
  reorderLayers(fromIndex: number, toIndex: number): void
  
  // Object operations - now async for event emission
  addObject(object: Partial<CanvasObject>, layerId?: string): Promise<CanvasObject>
  removeObject(objectId: string): Promise<void>
  updateObject(objectId: string, updates: Partial<CanvasObject>): Promise<void>
  
  // Selection operations
  setSelection(selection: Selection | null): void
  selectAll(): void
  deselectAll(): void
  
  // Pixel operations
  getImageData(rect?: Rect): ImageData
  putImageData(imageData: ImageData, point: Point): void
  applyFilter(filter: Filter, target?: CanvasObject | CanvasObject[]): Promise<void>
  
  // Transform operations
  resize(width: number, height: number): Promise<void>
  crop(rect: Rect): Promise<void>
  rotate(angle: number, target?: CanvasObject | CanvasObject[]): Promise<void>
  flip(direction: 'horizontal' | 'vertical', target?: CanvasObject | CanvasObject[]): Promise<void>
  
  // View operations
  setZoom(zoom: number): void
  setPan(pan: Point): void
  fitToScreen(): void
  
  // Object finding
  getObjectAtPoint(point: Point): CanvasObject | null
  
  // Export/Import
  exportImage(format: 'png' | 'jpeg' | 'webp'): Promise<Blob>
  loadImage(src: string): Promise<CanvasObject>
  
  // Lifecycle
  destroy(): void
} 