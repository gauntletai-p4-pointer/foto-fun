import { z } from 'zod';
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import type { CanvasContext } from '../types/CanvasContext';
import type { AdapterDependencies } from '../types/AdapterDependencies';
import type { AdapterMetadata } from '../types/AdapterMetadata';

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

    // Activate frame tool if not already active
    if (this.dependencies.toolStore) {
      await this.dependencies.toolStore.activateTool('frame');
    }

    // Get tool instance (this would need to be implemented in the tool store)
    // For now, we'll create the frame directly through commands

    // Determine dimensions
    let dimensions: { width: number; height: number };
    if (params.preset && params.preset !== 'custom') {
      dimensions = this.getPresetDimensions(params.preset);
    } else if (params.width && params.height) {
      dimensions = { width: params.width, height: params.height };
    } else {
      // Default to A4 if no dimensions specified
      dimensions = this.getPresetDimensions('a4');
    }

    // Determine position
    const position = params.position || this.getCenterPosition(dimensions, context);

    // Create frame object data
    const frameData = {
      type: 'frame' as const,
      name: `Frame ${this.getFrameLabel(params.preset || 'custom')}`,
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      opacity: 1,
      blendMode: 'normal' as const,
      visible: true,
      locked: false,
      filters: [],
      adjustments: [],
      data: {
        type: 'frame' as const,
        preset: params.preset || 'custom',
        exportName: `Frame ${this.getFrameLabel(params.preset || 'custom')}`,
        style: {
          fill: params.fillColor || '#FFFFFF',
          stroke: {
            color: params.strokeColor || '#E0E0E0',
            width: params.strokeWidth || 1,
            style: 'solid' as const
          },
          background: {
            color: params.fillColor || '#FFFFFF',
            opacity: 1
          }
        },
        export: {
          format: 'png' as const,
          quality: 100,
          dpi: 72
        },
        clipping: {
          enabled: params.clipContent ?? true,
          showOverflow: true,
          exportClipped: params.clipContent ?? true
        }
      }
    };

    // Create frame using command
    const command = this.dependencies.commandFactory.createAddObjectCommand(frameData);
    await this.dependencies.commandManager.executeCommand(command);

    // Get the created frame ID
    const frameId = ((command as unknown) as { getObjectId?: () => string }).getObjectId?.() || `frame-${Date.now()}`;

    // Emit success event
    this.emitEvent('frame.created', {
      frameId,
      preset: params.preset || 'custom',
      dimensions,
      position
    });

    return {
      success: true,
      frameId,
      dimensions,
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