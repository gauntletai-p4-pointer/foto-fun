import { z } from 'zod';
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import type { CanvasContext } from '../types/CanvasContext';
import type { AdapterDependencies } from '../types/AdapterDependencies';
import type { AdapterMetadata } from '../types/AdapterMetadata';
import type { MoveToolEnhanced } from '@/lib/editor/tools/transform/MoveToolEnhanced';
import type { EventToolStore } from '@/lib/store/tools/EventToolStore';

// Input schema for the AI
const MoveInputSchema = z.object({
  direction: z.enum(['left', 'right', 'up', 'down', 'center']).optional()
    .describe('Direction to move objects'),
  distance: z.number().min(0).optional()
    .describe('Distance in pixels for directional movement'),
  x: z.number().optional()
    .describe('Absolute X position to move objects to'),
  y: z.number().optional()
    .describe('Absolute Y position to move objects to'),
  align: z.enum(['left', 'right', 'top', 'bottom', 'center', 'middle']).optional()
    .describe('Alignment option for multiple objects')
}).refine(
  (data) => {
    // Ensure at least one movement option is provided
    const hasDirection = data.direction !== undefined && data.distance !== undefined;
    const hasPosition = data.x !== undefined && data.y !== undefined;
    const hasAlign = data.align !== undefined;
    return hasDirection || hasPosition || hasAlign;
  },
  {
    message: 'Must provide either direction+distance, x+y coordinates, or alignment option'
  }
);

type MoveInput = z.infer<typeof MoveInputSchema>;

interface MoveOutput {
  success: boolean;
  movedObjects: number;
  operation: 'move' | 'align' | 'center';
  details: string;
}

/**
 * AI Adapter for Move Tool
 * Follows the correct pattern: Adapter → Tool → Command
 */
export class MoveAdapter extends UnifiedToolAdapter<MoveInput, MoveOutput> {
  readonly toolId = 'move';
  readonly aiName = 'moveObject';
  readonly description = 'Move or align objects on the canvas. Supports directional movement (left/right/up/down), absolute positioning (x,y), and alignment options.';
  readonly inputSchema = MoveInputSchema;

  constructor(dependencies: AdapterDependencies) {
    super(dependencies);
  }

  /**
   * Get adapter metadata
   */
  protected getAdapterMetadata(): AdapterMetadata {
    return {
      category: 'canvas-tool',
      worksOn: 'existing',
      requiresSelection: true,
      isReadOnly: false,
      supportsBatch: true,
      estimatedDuration: 500
    };
  }

  /**
   * Core execution method
   */
  protected async executeCore(params: MoveInput, context: CanvasContext): Promise<MoveOutput> {
    // Validate that we have a selection
    if (context.targetObjects.length === 0) {
      throw new Error('No objects selected. Please select objects to move.');
    }

    // Get the tool store
    const toolStore = this.getToolStore();
    if (!toolStore) {
      throw new Error('Tool store not available');
    }

    // Activate the move tool
    await this.activateMoveTool(toolStore);
    
    // Get the active tool instance
    const moveTool = this.getActiveMoveTool(toolStore);
    
    try {
      // Execute the appropriate operation
      const result = await this.executeMoveOperation(moveTool, params, context);
      
      // Emit success event
      this.emitEvent('move.completed', {
        operation: result.operation,
        objectCount: context.targetObjects.length,
        params
      });
      
      return result;
      
    } catch (error) {
      // Emit failure event
      this.emitEvent('move.failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  /**
   * Activate the move tool
   */
  private async activateMoveTool(toolStore: EventToolStore): Promise<void> {
    await toolStore.activateTool(this.toolId);
    
    // Wait a frame to ensure activation is complete
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Get the active move tool instance
   */
  private getActiveMoveTool(toolStore: EventToolStore): MoveToolEnhanced {
    const activeTool = toolStore.getActiveTool();
    
    if (!activeTool) {
      throw new Error('Failed to activate move tool');
    }
    
    return activeTool as MoveToolEnhanced;
  }

  /**
   * Execute the move operation based on parameters
   */
  private async executeMoveOperation(
    moveTool: MoveToolEnhanced,
    params: MoveInput,
    context: CanvasContext
  ): Promise<MoveOutput> {
    // Handle alignment operation
    if (params.align) {
      if (context.targetObjects.length < 2) {
        throw new Error('Alignment requires at least 2 selected objects');
      }
      
      await moveTool.alignObjects(params.align);
      
      return {
        success: true,
        movedObjects: context.targetObjects.length,
        operation: 'align',
        details: `Aligned ${context.targetObjects.length} objects ${params.align}`
      };
    }
    
    // Handle absolute positioning
    if (params.x !== undefined && params.y !== undefined) {
      await moveTool.moveObjectsToPosition(params.x, params.y);
      
      return {
        success: true,
        movedObjects: context.targetObjects.length,
        operation: 'move',
        details: `Moved ${context.targetObjects.length} objects to (${params.x}, ${params.y})`
      };
    }
    
    // Handle directional movement
    if (params.direction && params.distance !== undefined) {
      const { deltaX, deltaY } = this.calculateDirectionalDelta(params.direction, params.distance);
      
      if (params.direction === 'center') {
        // Special case: center in canvas
        const canvasCenter = {
          x: context.dimensions.width / 2,
          y: context.dimensions.height / 2
        };
        await moveTool.moveObjectsToPosition(canvasCenter.x, canvasCenter.y);
        
        return {
          success: true,
          movedObjects: context.targetObjects.length,
          operation: 'center',
          details: `Centered ${context.targetObjects.length} objects on canvas`
        };
      } else {
        await moveTool.moveObjects(deltaX, deltaY);
        
        return {
          success: true,
          movedObjects: context.targetObjects.length,
          operation: 'move',
          details: `Moved ${context.targetObjects.length} objects ${params.direction} by ${params.distance}px`
        };
      }
    }
    
    // This should never happen due to input validation
    throw new Error('Invalid move parameters');
  }

  /**
   * Calculate delta values for directional movement
   */
  private calculateDirectionalDelta(
    direction: 'left' | 'right' | 'up' | 'down' | 'center',
    distance: number
  ): { deltaX: number; deltaY: number } {
    switch (direction) {
      case 'left':
        return { deltaX: -distance, deltaY: 0 };
      case 'right':
        return { deltaX: distance, deltaY: 0 };
      case 'up':
        return { deltaX: 0, deltaY: -distance };
      case 'down':
        return { deltaX: 0, deltaY: distance };
      case 'center':
        return { deltaX: 0, deltaY: 0 }; // Special case handled elsewhere
    }
  }

  /**
   * Override to provide operation-specific description
   */
  protected getOperationDescription(params: MoveInput): string {
    if (params.align) {
      return `Align objects ${params.align}`;
    } else if (params.direction) {
      return `Move objects ${params.direction}${params.distance ? ` by ${params.distance}px` : ''}`;
    } else if (params.x !== undefined && params.y !== undefined) {
      return `Move objects to (${params.x}, ${params.y})`;
    }
    return 'Move objects';
  }
}