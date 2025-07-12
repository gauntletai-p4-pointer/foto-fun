import type { CanvasObject } from '@/lib/editor/objects/types';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';

/**
 * Canvas context provided to AI adapters for execution
 * Contains complete canvas state and targeting information
 */
export interface CanvasContext {
  // Canvas management
  canvas: CanvasManager;
  
  // Object targeting
  targetObjects: CanvasObject[];
  targetingMode: 'selected' | 'all' | 'visible';
  
  // Canvas state
  dimensions: { width: number; height: number };
  hasContent: boolean;
  objectCount: number;
  
  // Optional context
  pixelSelection?: Selection;
  screenshot?: string;
  
  // Workflow context
  workflowId?: string;
  stepIndex?: number;
}

/**
 * Selection interface for pixel-level selections
 */
export interface Selection {
  objectId: string;
  mask: ImageData;
  bounds: { x: number; y: number; width: number; height: number };
} 