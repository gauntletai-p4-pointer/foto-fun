import { z } from 'zod';
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import type { CanvasContext } from '../types/CanvasContext';
import type { AdapterDependencies } from '../types/AdapterDependencies';

/**
 * AI Adapter for MoveTool - Object positioning and movement
 * Enables natural language object manipulation
 */
export class MoveAdapter extends UnifiedToolAdapter<MoveInput, MoveOutput> {
  readonly toolId = 'move';
  readonly aiName = 'moveObjects';
  readonly description = 'Move objects on the canvas with natural language commands. Supports relative positioning, alignment, and duplication.';
  
  readonly inputSchema = z.object({
    direction: z.enum(['left', 'right', 'up', 'down', 'center']).optional(),
    distance: z.number().min(0).optional(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    alignment: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom']).optional(),
    duplicate: z.boolean().optional(),
    constrainProportions: z.boolean().optional()
  });

  constructor(dependencies: AdapterDependencies) {
    super(dependencies);
  }

  protected async executeCore(params: MoveInput, context: CanvasContext): Promise<MoveOutput> {
    // Get target objects from context
    const targetObjects = context.targetObjects;
    
    if (targetObjects.length === 0) {
      throw new Error('No objects selected for move operation');
    }

    // Activate move tool
    await this.dependencies.toolStore.activateTool('move');
    
    // Calculate new positions based on parameters
    const moveOperations = targetObjects.map(obj => {
      let newX = obj.x;
      let newY = obj.y;
      
      // Handle direction-based movement
      if (params.direction && params.distance) {
        switch (params.direction) {
          case 'left':
            newX -= params.distance;
            break;
          case 'right':
            newX += params.distance;
            break;
          case 'up':
            newY -= params.distance;
            break;
          case 'down':
            newY += params.distance;
            break;
          case 'center':
            newX = context.dimensions.width / 2 - obj.width / 2;
            newY = context.dimensions.height / 2 - obj.height / 2;
            break;
        }
      }
      
      // Handle absolute positioning
      if (params.position) {
        newX = params.position.x;
        newY = params.position.y;
      }
      
      return {
        objectId: obj.id,
        newPosition: { x: newX, y: newY },
        originalPosition: { x: obj.x, y: obj.y }
      };
    });

    // Execute move operations
    for (const operation of moveOperations) {
      await context.canvas.updateObject(operation.objectId, {
        x: operation.newPosition.x,
        y: operation.newPosition.y
      });
    }

    return {
      success: true,
      affectedObjects: targetObjects.map(obj => obj.id),
      objectCount: targetObjects.length,
      movements: moveOperations.map(op => ({
        objectId: op.objectId,
        from: op.originalPosition,
        to: op.newPosition
      }))
    };
  }
}

// Type definitions
interface MoveInput {
  direction?: 'left' | 'right' | 'up' | 'down' | 'center';
  distance?: number;
  position?: { x: number; y: number };
  alignment?: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
  duplicate?: boolean;
  constrainProportions?: boolean;
}

interface MoveOutput {
  success: boolean;
  affectedObjects: string[];
  objectCount: number;
  movements: Array<{
    objectId: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>;
} 