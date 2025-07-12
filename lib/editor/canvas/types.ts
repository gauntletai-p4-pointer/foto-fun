// STUB: Canvas types disabled during refactor
export interface ToolEvent {
  x: number;
  y: number;
  button?: number;
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
}

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
  objects: any[];
  selectedObjectIds: string[];
  camera: { x: number; y: number; zoom: number };
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
