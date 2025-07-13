/**
 * Drawing and Selection Tool Events
 * These extend the core EventRegistry for Agent 2 tools
 */

import type { SelectionMask, SelectionMode as MaskMode } from '@/lib/editor/selection/SelectionMask';
import type { Rect, SelectionMode } from '@/types';

declare module '../core/TypedEventBus' {
  interface EventRegistry {
    // Erasing events
    'erasing.started': {
      toolId: string;
      canvasId: string;
      position: { x: number; y: number };
      mode: 'alpha' | 'background';
    };
    'erasing.updated': {
      toolId: string;
      canvasId: string;
      position: { x: number; y: number };
    };
    'erasing.completed': {
      toolId: string;
      canvasId: string;
      result: {
        strokeId: string;
        pointCount: number;
        mode: 'alpha' | 'background';
      };
    };
    
    // Selection interaction events
    'selection.interaction.started': {
      toolId: string;
      point: { x: number; y: number };
      mode: SelectionMode;
      timestamp: number;
    };
    'selection.interaction.ended': {
      toolId: string;
      bounds: Rect;
      mode: SelectionMode;
      timestamp: number;
    };
    
    // Selection mask events (new event type)
    'selection.mask.created': {
      canvasId: string;
      mask: SelectionMask;
      mode: MaskMode;
      bounds: Rect;
      timestamp: number;
    };
    
    // Keyboard events
    'keyboard.keydown': {
      key: string;
      code: string;
      shiftKey: boolean;
      altKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
      timestamp: number;
    };
    'keyboard.keyup': {
      key: string;
      code: string;
      shiftKey: boolean;
      altKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
      timestamp: number;
    };
    
    // Transform handles events
    'transform.handles.update': {
      toolId: string;
      handles: Record<string, unknown>;
      timestamp: number;
    };
    
    // Canvas object selection events
    'canvas.object.selected': {
      canvasId: string;
      objectId: string;
      object: import('@/lib/editor/objects/types').CanvasObject;
      timestamp: number;
    };
  }
}