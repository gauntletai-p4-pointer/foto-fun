import { z } from 'zod';
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import type { CanvasContext } from '../types/CanvasContext';
import type { AdapterDependencies } from '../types/AdapterDependencies';
import type { AdapterMetadata } from '../types/AdapterMetadata';
import type { FrameTool } from '../../../editor/tools/creation/FrameTool';

// Input schema for frame creation
const FrameInputSchema = z.object({
  preset: z.enum([
    'a4', 'a3', 'letter',
    'instagram-square', 'instagram-portrait', 'instagram-landscape',
    'facebook-post', 'twitter-post', 'youtube-thumbnail',
    '16:9', '4:3', '1:1', 'custom'
  ]).optional().describe('Frame preset - use predefined sizes or custom'),
  width: z.number().optional().describe('Width in pixels (for custom frames)'),
  height: z.number().optional().describe('Height in pixels (for custom frames)'),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional().describe('Position on canvas (defaults to center)'),
  fillColor: z.string().optional().describe('Fill color in hex format'),
  strokeColor: z.string().optional().describe('Stroke color in hex format'),
  strokeWidth: z.number().optional().describe('Stroke width in pixels'),
  cornerRadius: z.number().optional().describe('Corner radius in pixels'),
  clipContent: z.boolean().optional().describe('Whether to clip content to frame bounds')
});

type FrameInput = z.infer<typeof FrameInputSchema>;

// Output schema for frame creation
interface FrameOutput {
  success: boolean;
  frameId: string;
  dimensions: { width: number; height: number };
  position: { x: number; y: number };
  preset: string;
  message?: string;
}

/**
 * AI Adapter for Frame Tool - Create frames with presets and custom dimensions
 * Enables natural language frame creation with smart preset selection
 */
export class FrameAdapter extends UnifiedToolAdapter<FrameInput, FrameOutput> {
  readonly toolId = 'frame';
  readonly aiName = 'createFrame';
  readonly description = 'Create frames for document boundaries and composition guides. Supports presets like "A4", "Instagram Square", "16:9" or custom dimensions.';
  readonly inputSchema = FrameInputSchema;

  constructor(dependencies: AdapterDependencies) {
    super(dependencies);
  }

  protected getAdapterMetadata(): AdapterMetadata {
    return {
      category: 'canvas-tool',
      worksOn: 'new',
      requiresSelection: false,
      isReadOnly: false,
      supportsBatch: false,
      estimatedDuration: 500,
      memoryUsage: 'low',
      cpuIntensive: false
    };
  }

  protected async executeCore(params: FrameInput, context: CanvasContext): Promise<FrameOutput> {
    // Validate parameters
    if (params.preset === 'custom' && (!params.width || !params.height)) {
      throw new Error('Custom frames require both width and height parameters');
    }

    // Activate frame tool
    if (!this.dependencies.toolStore) {
      throw new Error('ToolStore not available');
    }
    
    await this.dependencies.toolStore.activateTool('frame');
    
    // Get the active tool instance
    const frameTool = this.dependencies.toolStore.getActiveTool();
    if (!frameTool) {
      throw new Error('Failed to activate frame tool');
    }

    // Type assertion - we know this is a FrameTool
    const frameToolInstance = frameTool as FrameTool;

    // Determine dimensions
    let dimensions: { width: number; height: number } | undefined;
    if (params.width && params.height) {
      dimensions = { width: params.width, height: params.height };
    }

    // Determine position
    const position = params.position || this.getCenterPosition(
      dimensions || this.getPresetDimensions(params.preset || 'a4'),
      context
    );

    // Call the tool's public method
    const frameId = await frameToolInstance.createFrame({
      preset: params.preset,
      position,
      dimensions,
      fillColor: params.fillColor,
      strokeColor: params.strokeColor,
      strokeWidth: params.strokeWidth,
      cornerRadius: params.cornerRadius,
      clipContent: params.clipContent
    });

    if (!frameId) {
      throw new Error('Failed to create frame');
    }

    // Get actual dimensions (in case preset was used)
    const actualDimensions = params.preset && params.preset !== 'custom'
      ? this.getPresetDimensions(params.preset)
      : dimensions || this.getPresetDimensions('a4');

    // Emit success event
    this.emitEvent('frame.created', {
      frameId,
      preset: params.preset || 'custom',
      dimensions: actualDimensions,
      position
    });

    return {
      success: true,
      frameId,
      dimensions: actualDimensions,
      position,
      preset: params.preset || 'custom',
      message: `Created ${this.getFrameLabel(params.preset || 'custom')} frame`
    };
  }

  private getPresetDimensions(preset: string): { width: number; height: number } {
    const presets: Record<string, { width: number; height: number }> = {
      'a4': { width: 595, height: 842 },
      'a3': { width: 842, height: 1191 },
      'letter': { width: 612, height: 792 },
      'instagram-square': { width: 1080, height: 1080 },
      'instagram-portrait': { width: 1080, height: 1350 },
      'instagram-landscape': { width: 1080, height: 566 },
      'facebook-post': { width: 1200, height: 630 },
      'twitter-post': { width: 1600, height: 900 },
      'youtube-thumbnail': { width: 1280, height: 720 },
      '16:9': { width: 1920, height: 1080 },
      '4:3': { width: 1600, height: 1200 },
      '1:1': { width: 1000, height: 1000 }
    };

    return presets[preset] || { width: 1000, height: 1000 };
  }

  private getCenterPosition(
    dimensions: { width: number; height: number },
    context: CanvasContext
  ): { x: number; y: number } {
    const viewport = context.dimensions;
    return {
      x: (viewport.width - dimensions.width) / 2,
      y: (viewport.height - dimensions.height) / 2
    };
  }

  private getFrameLabel(preset: string): string {
    if (preset === 'custom') return '';
    return `(${preset.toUpperCase()})`;
  }
} 