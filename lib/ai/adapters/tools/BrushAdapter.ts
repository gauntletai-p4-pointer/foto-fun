import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import { z } from 'zod';
import type { CanvasContext } from '../../canvas/CanvasContext';
import type { BrushToolOptions } from '../../../editor/tools/drawing/BrushTool';
import { DEFAULT_BRUSH_OPTIONS } from '@/lib/editor/tools/drawing/DrawingTool';

const BrushInputSchema = z.object({
  size: z.number().min(1).max(500).describe('Brush size in pixels'),
  opacity: z.number().min(0).max(100).describe('Brush opacity percentage'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Brush color in hex format'),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light']).describe('Blend mode for painting'),
  pressure: z.boolean().describe('Enable pressure sensitivity'),
  flow: z.number().min(1).max(100).describe('Brush flow percentage'),
  hardness: z.number().min(0).max(100).describe('Brush hardness percentage'),
  strokePath: z.array(z.object({
    x: z.number().describe('X coordinate'),
    y: z.number().describe('Y coordinate'),
    pressure: z.number().min(0).max(1).describe('Pressure at this point')
  })).min(2).describe('Array of points defining the brush stroke path')
}).transform(data => ({
  size: data.size ?? 20,
  opacity: data.opacity ?? 100,
  color: data.color ?? '#000000',
  blendMode: data.blendMode ?? 'normal',
  pressure: data.pressure ?? true,
  flow: data.flow ?? 100,
  hardness: data.hardness ?? 100,
  strokePath: data.strokePath
}));

type BrushInput = z.infer<typeof BrushInputSchema>;

interface BrushOutput {
  success: boolean;
  strokeId: string;
  pointCount: number;
  affectedObjects: string[];
  message: string;
}

/**
 * BrushAdapter - AI adapter for the BrushTool
 * 
 * Provides natural language interface for brush painting operations.
 * Converts AI parameters to brush tool actions and executes them on the canvas.
 */
export class BrushAdapter extends UnifiedToolAdapter<BrushInput, BrushOutput> {
  readonly toolId = 'brush';
  readonly aiName = 'paintWithBrush';
  readonly description = 'Paint pixels directly on image objects using a brush. Requires stroke path coordinates and brush settings.';
  readonly inputSchema = BrushInputSchema;

  protected async executeCore(params: BrushInput, context: CanvasContext): Promise<BrushOutput> {
    try {
      // Validate context has image objects
      const imageObjects = context.targetObjects.filter(obj => obj.type === 'image');
      if (imageObjects.length === 0) {
        throw new Error('No image objects available for brush painting. Please select an image object first.');
      }

      const targetObject = imageObjects[0];

      // Create stroke data
      const strokeData = {
        id: `ai-stroke-${Date.now()}`,
        targetObjectId: targetObject.id,
        points: params.strokePath.map((point, index) => ({
          x: point.x,
          y: point.y,
          pressure: point.pressure,
          timestamp: Date.now() + index
        })),
        options: {
          size: params.size,
          opacity: params.opacity,
          color: params.color,
          blendMode: params.blendMode,
          pressure: params.pressure,
          flow: params.flow,
          hardness: params.hardness
        } as BrushToolOptions
      };

      // Execute brush stroke command using available command factory
      const strokePath = params.strokePath.map(p => ({ x: p.x, y: p.y, pressure: p.pressure, timestamp: Date.now() }));
      const command = this.dependencies.commandFactory.createDrawCommand(
        targetObject.id,
        strokePath,
        DEFAULT_BRUSH_OPTIONS
      );

      await this.dependencies.commandManager.executeCommand(command);

      // Emit completion event
      this.dependencies.eventBus.emit('drawing.completed', {
        toolId: this.toolId,
        canvasId: targetObject.id,
        result: {
          strokeId: strokeData.id,
          pointCount: strokeData.points.length
        }
      });

      return {
        success: true,
        strokeId: strokeData.id,
        pointCount: strokeData.points.length,
        affectedObjects: [targetObject.id],
        message: `Successfully painted brush stroke with ${strokeData.points.length} points on ${targetObject.name || 'image object'}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        strokeId: '',
        pointCount: 0,
        affectedObjects: [],
        message: `Brush painting failed: ${errorMessage}`
      };
    }
  }

  /**
   * Validate input parameters
   */
  protected validateInput(params: unknown): BrushInput {
    const result = this.inputSchema.safeParse(params);
    if (!result.success) {
      throw new Error(`Invalid brush parameters: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get adapter metadata for registration
   */
  static getMetadata() {
    return {
      aiName: 'paintWithBrush',
      toolId: 'brush',
      description: 'Paint pixels directly on image objects using a brush tool',
      category: 'drawing',
      inputSchema: BrushInputSchema,
      outputSchema: z.object({
        success: z.boolean(),
        strokeId: z.string(),
        pointCount: z.number(),
        affectedObjects: z.array(z.string()),
        message: z.string()
      })
    };
  }
} 