import { z } from 'zod';
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import type { CanvasContext } from '../types/CanvasContext';
import type { AdapterDependencies } from '../types/AdapterDependencies';
import type { AdapterMetadata } from '../types/AdapterMetadata';
import type { TextTool } from '../../../editor/tools/creation/TextTool';

// Input schema for text creation
const TextInputSchema = z.object({
  text: z.string().describe('The text content to add'),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional().describe('Position on canvas (defaults to center-top)'),
  fontSize: z.number().optional().describe('Font size in pixels'),
  fontFamily: z.string().optional().describe('Font family name'),
  fontWeight: z.enum(['100', '300', '400', '500', '600', '700', '900']).optional(),
  color: z.string().optional().describe('Text color in hex format'),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  style: z.object({
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional()
  }).optional(),
  lineHeight: z.number().optional().describe('Line height multiplier'),
  letterSpacing: z.number().optional().describe('Letter spacing in pixels')
});

type TextInput = z.infer<typeof TextInputSchema>;

// Output schema for text creation
interface TextOutput {
  success: boolean;
  textId: string;
  position: { x: number; y: number };
  actualBounds: { width: number; height: number };
  message?: string;
}

/**
 * AI Adapter for Text Tool - Add text to the canvas
 * Enables natural language text creation with full typography controls
 */
export class AddTextAdapter extends UnifiedToolAdapter<TextInput, TextOutput> {
  readonly toolId = 'horizontal-type';
  readonly aiName = 'addText';
  readonly description = 'Add text to the canvas. Specify the text content, font properties, and position.';
  readonly inputSchema = TextInputSchema;

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

  protected async executeCore(params: TextInput, context: CanvasContext): Promise<TextOutput> {
    // Validate text content
    if (!params.text || params.text.trim().length === 0) {
      throw new Error('Text content cannot be empty');
    }

    // Activate text tool
    if (!this.dependencies.toolStore) {
      throw new Error('ToolStore not available');
    }
    
    await this.dependencies.toolStore.activateTool('horizontal-type');
    
    // Get the active tool instance
    const textTool = this.dependencies.toolStore.getActiveTool();
    if (!textTool) {
      throw new Error('Failed to activate text tool');
    }

    // Type assertion - we know this is a TextTool
    const textToolInstance = textTool as TextTool;

    // Determine position
    const position = params.position || this.getDefaultTextPosition(context);

    // Call the tool's public method
    const textId = await textToolInstance.createText({
      text: params.text,
      position,
      fontSize: params.fontSize,
      fontFamily: params.fontFamily,
      fontWeight: params.fontWeight,
      fontStyle: params.style?.italic ? 'italic' : 'normal',
      color: params.color,
      align: params.align,
      lineHeight: params.lineHeight,
      letterSpacing: params.letterSpacing
    });

    if (!textId) {
      throw new Error('Failed to create text');
    }

    // Calculate estimated bounds
    const estimatedWidth = Math.max(200, params.text.length * (params.fontSize || 24) * 0.6);
    const estimatedHeight = (params.fontSize || 24) * (params.lineHeight || 1.5) * 1.2;

    // Emit success event
    this.emitEvent('text.created', {
      textId,
      text: params.text,
      position,
      fontSize: params.fontSize || 24
    });

    return {
      success: true,
      textId,
      position,
      actualBounds: {
        width: estimatedWidth,
        height: estimatedHeight
      },
      message: `Added text: "${params.text.substring(0, 20)}${params.text.length > 20 ? '...' : ''}"`
    };
  }

  private getDefaultTextPosition(context: CanvasContext): { x: number; y: number } {
    // Position text in center-top area if no position specified
    return {
      x: context.dimensions.width / 2 - 100,
      y: 100
    };
  }

  private getTextDecoration(style?: TextInput['style']): string {
    if (!style) return 'none';
    
    const decorations = [];
    if (style.underline) decorations.push('underline');
    if (style.strikethrough) decorations.push('line-through');
    
    return decorations.length > 0 ? decorations.join(' ') : 'none';
  }
}