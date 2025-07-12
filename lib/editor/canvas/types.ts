// STUB: Canvas types disabled during refactor
// ToolEvent has been moved to lib/events/canvas/ToolEvents.ts

// STUB: Additional canvas types
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface Selection {
  type: 'objects' | 'pixels';
  objectIds?: string[];
  bounds?: Rect;
  mask?: ImageData;
}

// Filter interface moved to types/index.ts for consistency

export interface CanvasState {
  viewport: {
    width: number;
    height: number;
  };
  camera: { x: number; y: number; zoom: number };
  objects: unknown[];
  objectOrder: string[];
  selectedObjectIds: string[];
  pixelSelection?: Selection;
  backgroundColor: string;
  isLoading: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export interface CanvasManager {
  getAllObjects(): unknown[];
  getSelectedObjects(): unknown[];
  addObject(objectData: Partial<unknown>): Promise<string>;
  getObject(objectId: string): unknown | null;
  stage: unknown;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  konvaLayer: import('konva/lib/Layer').Layer;
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

// Helper function stubs
export function getMetadataValue(obj: unknown, key: string): unknown {
  console.warn('getMetadataValue disabled during refactor');
  if (obj && typeof obj === 'object' && 'metadata' in obj) {
    const metadata = (obj as { metadata?: Record<string, unknown> }).metadata;
    return metadata?.[key];
  }
  return null;
}
