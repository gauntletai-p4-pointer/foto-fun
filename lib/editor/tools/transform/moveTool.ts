import React from 'react';
import { TransformTool, type TransformData } from '../base/TransformTool';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { CanvasObject } from '@/lib/editor/objects/types';
import type { ToolMetadata } from '../base/ToolRegistry';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolDependencies } from '../base/BaseTool';

/**
 * Move Tool - Object positioning and dragging
 * Handles object selection, movement, duplication, and constrained movement
 */
export class MoveTool extends TransformTool {
  id = 'move';
  name = 'Move Tool';
  cursor = 'move';
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  /**
   * Required by BaseTool - called when tool is activated
   */
  async onActivate(canvas: CanvasManager): Promise<void> {
    console.log('MoveTool: Activating move tool...');
    this.cursor = 'move';
    
    // Setup tool resources
    await this.setupTool();
  }
  
  /**
   * Required by BaseTool - called when tool is deactivated
   */
  async onDeactivate(canvas: CanvasManager): Promise<void> {
    console.log('MoveTool: Deactivating move tool...');
    
    // Complete any active transform
    if (this.currentTransform) {
      await this.cleanupTool();
    }
    
    this.cursor = 'move';
  }

  // Tool icon component
  icon = () => React.createElement('div', { 
    className: 'w-4 h-4 flex items-center justify-center'
  }, React.createElement('svg', {
    width: '16',
    height: '16',
    viewBox: '0 0 16 16',
    fill: 'currentColor'
  }, React.createElement('path', {
    d: 'M8 2l2 2-2 2-2-2 2-2zm0 8l2 2-2 2-2-2 2-2zm-6-4l2-2 2 2-2 2-2-2zm8 0l2-2 2 2-2 2-2-2z'
  })));

  /**
   * State change handler
   */
  protected onStateChange(from: string, to: string): void {
    console.log(`MoveTool: ${from} → ${to}`);
    
    // Update cursor based on state
    if (to === 'ACTIVE') {
      this.cursor = 'move';
    } else if (to === 'WORKING') {
      this.cursor = 'grabbing';
    }
  }

  /**
   * Get transform operation name
   */
  protected getTransformOperation(): string {
    return 'move';
  }

  /**
   * Calculate transform data for move operation
   */
  protected calculateTransform(event: ToolEvent): Partial<TransformData> {
    if (!this.currentTransform) {
      return {};
    }

    const deltaX = event.canvasX - this.currentTransform.startPosition.x;
    const deltaY = event.canvasY - this.currentTransform.startPosition.y;

    // Apply constraints if shift is held
    let constrainedDeltaX = deltaX;
    let constrainedDeltaY = deltaY;

    if (this.currentTransform.modifiers.constrain) {
      // Constrain to 45-degree angles
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        constrainedDeltaY = 0;
      } else {
        constrainedDeltaX = 0;
      }
    }

    return {
      transformParams: {
        deltaX: constrainedDeltaX,
        deltaY: constrainedDeltaY,
        originalDeltaX: deltaX,
        originalDeltaY: deltaY
      }
    };
  }

  /**
   * Check if objects can be moved
   */
  protected canTransform(objects: CanvasObject[]): boolean {
    // Can move any object that's not locked
    return objects.every(obj => !obj.locked);
  }

  /**
   * Get additional transform parameters
   */
  protected getTransformParams(event: ToolEvent): Record<string, any> {
    return {
      cursor: { x: event.canvasX, y: event.canvasY }
    };
  }

  /**
   * Setup tool resources
   */
  protected async setupTool(): Promise<void> {
    // No special setup needed for move tool
  }

  /**
   * Cleanup tool resources
   */
  protected async cleanupTool(): Promise<void> {
    await super.cleanupTool();
    this.cursor = 'move';
  }

  /**
   * Get default options for move tool
   */
  protected getDefaultOptions(): Record<string, any> {
    return {
      showBounds: true,
      showCenter: false,
      snapToGrid: false,
      snapToObjects: false,
      snapDistance: 10
    };
  }

  /**
   * Get option definitions for move tool
   */
  protected getOptionDefinitions(): Record<string, any> {
    return {
      showBounds: {
        type: 'boolean',
        default: true,
      },
      showCenter: {
        type: 'boolean',
        default: false,
      },
      snapToGrid: {
        type: 'boolean',
        default: false,
      },
      snapToObjects: {
        type: 'boolean',
        default: false,
      },
      snapDistance: {
        type: 'number',
        default: 10,
        min: 1,
        max: 50,
      }
    };
  }
}

/**
 * Move Tool metadata for registration
 */
export const moveToolMetadata: ToolMetadata = {
  id: 'move',
  name: 'Move Tool',
  description: 'Move, duplicate, and transform objects on the canvas',
  category: 'transform',
  groupId: 'transform-group',
  icon: () => React.createElement('div', { 
    className: 'w-4 h-4 flex items-center justify-center',
    children: React.createElement('svg', {
      width: '16',
      height: '16',
      viewBox: '0 0 16 16',
      fill: 'currentColor',
      children: React.createElement('path', {
        d: 'M8 2l2 2-2 2-2-2 2-2zm0 8l2 2-2 2-2-2 2-2zm-6-4l2-2 2 2-2 2-2-2zm8 0l2-2 2 2-2 2-2-2z'
      })
    })
  }),
  cursor: 'move',
  shortcut: 'V',
  priority: 1
};
