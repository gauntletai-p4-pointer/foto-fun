import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import { z } from 'zod';
import type { CanvasContext } from '../../canvas/CanvasContext';
import type { MarqueeRectTool } from '../../../editor/tools/selection/MarqueeRectTool';

const SelectionInputSchema = z.object({
  type: z.enum(['rectangle', 'ellipse', 'color', 'object']).optional().describe('Type of selection'),
  area: z.enum(['all', 'center', 'top', 'bottom', 'left', 'right']).optional().describe('Predefined area to select'),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional().describe('Specific bounds for selection'),
  mode: z.enum(['replace', 'add', 'subtract', 'intersect']).optional().describe('Selection mode'),
  feather: z.number().min(0).max(100).optional().describe('Feather radius in pixels'),
  antiAlias: z.boolean().optional().describe('Enable anti-aliasing'),
  // For color-based selection
  color: z.string().optional().describe('Color to select (for magic wand)'),
  tolerance: z.number().min(0).max(255).optional().describe('Color tolerance for magic wand')
});

type SelectionInput = z.infer<typeof SelectionInputSchema>;

interface SelectionOutput {
  success: boolean;
  selectionType: string;
  bounds: { x: number; y: number; width: number; height: number };
  pixelCount?: number;
  mode: string;
}

/**
 * SelectionToolAdapter - AI adapter for selection tools
 * 
 * Follows the correct architectural pattern:
 * 1. Activates the appropriate selection tool via ToolStore
 * 2. Calls high-level methods on the tool instance
 * 3. Tool handles its own state and command creation
 */
export class SelectionToolAdapter extends UnifiedToolAdapter<SelectionInput, SelectionOutput> {
  readonly toolId = 'selection-manager';
  readonly aiName = 'createSelection';
  readonly description = 'Create selections on the canvas. Supports rectangular, elliptical, and color-based selections. Use terms like "select the sky", "select red areas", "select the center square".';
  readonly inputSchema = SelectionInputSchema;

  protected async executeCore(params: SelectionInput, context: CanvasContext): Promise<SelectionOutput> {
    let toolId: string;
    
    // Determine which selection tool to use
    if (params.type === 'color' || params.color) {
      toolId = 'magic-wand';
      // Magic wand not yet implemented, fall back to marquee
      console.warn('Magic wand tool not yet implemented, using rectangular marquee');
      toolId = 'marquee-rect';
    } else if (params.type === 'ellipse') {
      toolId = 'marquee-ellipse';
      // Ellipse marquee not yet implemented, fall back to rect
      console.warn('Ellipse marquee tool not yet implemented, using rectangular marquee');
      toolId = 'marquee-rect';
    } else {
      toolId = 'marquee-rect';
    }
    
    // Activate appropriate tool
    if (!this.dependencies.toolStore) {
      throw new Error('ToolStore not available');
    }
    
    await this.dependencies.toolStore.activateTool(toolId);
    
    // Get the active tool instance
    const activeTool = this.dependencies.toolStore.getActiveTool();
    if (!activeTool) {
      throw new Error(`Failed to activate ${toolId} tool`);
    }
    
    // Set tool options with defaults
    if (params.feather !== undefined) {
      activeTool.setOption('feather', params.feather);
    }
    activeTool.setOption('antiAlias', params.antiAlias ?? true);
    
    // Type assertion for marquee tool
    const marqueeRectTool = activeTool as unknown as MarqueeRectTool;
    
    // Create selection using high-level API
    let bounds: { x: number; y: number; width: number; height: number };
    
    if (params.bounds) {
      // Use provided bounds
      bounds = params.bounds;
      await marqueeRectTool.createSelectionFromBounds(bounds, params.mode ?? 'replace');
    } else if (params.area) {
      // Use predefined area
      const canvasBounds = {
        width: context.dimensions.width,
        height: context.dimensions.height
      };
      
      // Calculate bounds internally - the tool will handle it
      await marqueeRectTool.createSelectionFromArea(params.area, canvasBounds, params.mode ?? 'replace');
      
      // Get bounds for response
      bounds = this.getAreaBounds(params.area, canvasBounds);
    } else {
      throw new Error('Either bounds or area must be specified for selection');
    }
    
    return {
      success: true,
      selectionType: toolId,
      bounds,
      mode: params.mode ?? 'replace'
    };
  }
  
  private getAreaBounds(area: string, canvasBounds: { width: number; height: number }): { x: number; y: number; width: number; height: number } {
    switch (area) {
      case 'all':
        return { x: 0, y: 0, width: canvasBounds.width, height: canvasBounds.height };
        
      case 'center': {
        const size = Math.min(canvasBounds.width, canvasBounds.height) * 0.5;
        return {
          x: (canvasBounds.width - size) / 2,
          y: (canvasBounds.height - size) / 2,
          width: size,
          height: size
        };
      }
        
      case 'top':
        return { x: 0, y: 0, width: canvasBounds.width, height: canvasBounds.height / 2 };
        
      case 'bottom':
        return { x: 0, y: canvasBounds.height / 2, width: canvasBounds.width, height: canvasBounds.height / 2 };
        
      case 'left':
        return { x: 0, y: 0, width: canvasBounds.width / 2, height: canvasBounds.height };
        
      case 'right':
        return { x: canvasBounds.width / 2, y: 0, width: canvasBounds.width / 2, height: canvasBounds.height };
        
      default:
        return { x: 0, y: 0, width: canvasBounds.width, height: canvasBounds.height };
    }
  }

  /**
   * Get adapter metadata for registration
   */
  static getMetadata() {
    return {
      aiName: 'createSelection',
      toolId: 'selection-manager',
      description: 'Create selections on the canvas',
      category: 'selection',
      inputSchema: SelectionInputSchema,
      outputSchema: z.object({
        success: z.boolean(),
        selectionType: z.string(),
        bounds: z.object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number()
        }),
        pixelCount: z.number().optional(),
        mode: z.string()
      })
    };
  }
}