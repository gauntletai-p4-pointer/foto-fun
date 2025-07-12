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
}

export interface CanvasState {
  viewport: {
    width: number;
    height: number;
  };
  camera: { x: number; y: number; zoom: number };
  objects: any[];
  objectOrder: string[];
  selectedObjectIds: string[];
  pixelSelection?: Selection;
  backgroundColor: string;
  isLoading: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export interface CanvasManager {
  getAllObjects(): any[];
  getSelectedObjects(): any[];
  stage: any;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
}

export interface Filter {
  id: string;
  name: string;
  type: string;
}

export interface FilterStack {
  filters: Filter[];
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

// Helper function stubs
export function getMetadataValue(obj: any, key: string): any {
  console.warn('getMetadataValue disabled during refactor');
  return null;
}
