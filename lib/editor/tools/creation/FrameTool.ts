import { ObjectCreationTool } from '../base/ObjectCreationTool';
import type { ToolDependencies, ToolOptions } from '../base/BaseTool';
import { ToolState } from '../base/BaseTool';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { CanvasObject, Rect } from '@/types';
import type { FrameData } from '@/lib/editor/objects/types';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';

interface FrameToolOptions extends ToolOptions {
  preset: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius: number;
  clipContent: boolean;
}

interface FramePreset {
  width: number;
  height: number;
  category: string;
  label: string;
}

/**
 * Frame Tool - Creates frame objects with presets and custom dimensions
 * Frames provide document boundaries and composition guides on the infinite canvas
 */
export class FrameTool extends ObjectCreationTool {
  private currentPreset: FramePreset | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  static getMetadata(): ToolMetadata {
    return {
      id: 'frame',
      name: 'Frame Tool',
      description: 'Create frames for document boundaries',
      category: 'core',
      groupId: 'shape-group',
      icon: ToolGroupIcons['frame'],
      cursor: 'crosshair',
      shortcut: 'F',
      priority: 1,
    };
  }

  protected getDefaultOptions(): FrameToolOptions {
    return {
      preset: 'custom',
      fillColor: '#FFFFFF',
      strokeColor: '#E0E0E0',
      strokeWidth: 1,
      cornerRadius: 0,
      clipContent: true
    };
  }

  public getOptionDefinitions() {
    return {
      preset: {
        type: 'select' as const,
        defaultValue: 'custom',
        options: [
          { value: 'custom', label: 'Custom Size' },
          { value: 'a4', label: 'A4 (210 × 297 mm)' },
          { value: 'a3', label: 'A3 (297 × 420 mm)' },
          { value: 'letter', label: 'Letter (8.5 × 11")' },
          { value: 'instagram-square', label: 'Instagram Square (1080 × 1080)' },
          { value: 'instagram-portrait', label: 'Instagram Portrait (1080 × 1350)' },
          { value: 'instagram-landscape', label: 'Instagram Landscape (1080 × 566)' },
          { value: 'facebook-post', label: 'Facebook Post (1200 × 630)' },
          { value: 'twitter-post', label: 'Twitter Post (1600 × 900)' },
          { value: 'youtube-thumbnail', label: 'YouTube Thumbnail (1280 × 720)' },
          { value: '16:9', label: '16:9 Aspect Ratio' },
          { value: '4:3', label: '4:3 Aspect Ratio' },
          { value: '1:1', label: 'Square (1:1)' }
        ],
        label: 'Frame Preset'
      },
      fillColor: {
        type: 'color' as const,
        defaultValue: '#FFFFFF',
        label: 'Fill Color'
      },
      strokeColor: {
        type: 'color' as const,
        defaultValue: '#E0E0E0',
        label: 'Stroke Color'
      },
      strokeWidth: {
        type: 'number' as const,
        defaultValue: 1,
        min: 0,
        max: 50,
        label: 'Stroke Width'
      },
      cornerRadius: {
        type: 'number' as const,
        defaultValue: 0,
        min: 0,
        max: 100,
        label: 'Corner Radius'
      },
      clipContent: {
        type: 'boolean' as const,
        defaultValue: true,
        label: 'Clip Content to Frame'
      }
    };
  }

  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Set cursor for frame creation
    this.cursor = this.getCreationCursor();
    
    // Emit activation event
    this.dependencies.eventBus.emit('tool.activated', {
      toolId: this.id,
      previousToolId: null
    });
    
    this.setState(ToolState.ACTIVE);
  }

  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Clean up any preview
    if (this.previewObject) {
      // Note: clearObjectPreview method needs to be implemented in CanvasManager
      // For now, we'll just clear the preview object
      this.previewObject = null;
    }
    
    // Reset state
    this.isCreating = false;
    this.creationStart = null;
    this.currentPreset = null;
    
    // Emit deactivation event
    this.dependencies.eventBus.emit('tool.deactivated', {
      toolId: this.id
    });
    
    this.setState(ToolState.INACTIVE);
  }

  protected getCreationCursor(): string {
    return 'crosshair';
  }

  protected createObjectData(bounds: Rect): Partial<CanvasObject> {
    const options = this.getAllOptions() as FrameToolOptions;
    const preset = this.getPresetDimensions(options.preset);
    
    // Use preset dimensions if not custom
    let finalBounds = bounds;
    if (preset && options.preset !== 'custom') {
      finalBounds = {
        x: bounds.x,
        y: bounds.y,
        width: preset.width,
        height: preset.height
      };
    }

    const frameData: FrameData = {
      type: 'frame',
      preset: options.preset,
      exportName: `Frame ${this.getFrameLabel(options.preset)}`,
      style: {
        fill: options.fillColor,
        stroke: {
          color: options.strokeColor,
          width: options.strokeWidth,
          style: 'solid'
        },
        background: {
          color: options.fillColor,
          opacity: 1
        }
      },
      export: {
        format: 'png',
        quality: 100,
        dpi: 72
      },
      clipping: {
        enabled: options.clipContent,
        showOverflow: true,
        exportClipped: options.clipContent
      }
    };
    
    return {
      type: 'frame',
      name: `Frame ${this.getFrameLabel(options.preset)}`,
      x: finalBounds.x,
      y: finalBounds.y,
      width: finalBounds.width,
      height: finalBounds.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      filters: [],
      adjustments: [],
      data: frameData
    };
  }

  onMouseDown(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    
    this.setState(ToolState.WORKING);
    this.isCreating = true;
    this.creationStart = { x: event.canvasX, y: event.canvasY };
    
    const options = this.getAllOptions() as FrameToolOptions;
    
    // If using preset, create immediately
    if (options.preset !== 'custom') {
      const preset = this.getPresetDimensions(options.preset);
      if (preset) {
        const bounds = {
          x: this.creationStart.x - preset.width / 2,
          y: this.creationStart.y - preset.height / 2,
          width: preset.width,
          height: preset.height
        };
        
        this.showCreationPreview(bounds);
        this.commitObject().then(() => {
          this.setState(ToolState.ACTIVE);
        });
      }
    }
  }

  onMouseMove(event: ToolEvent): void {
    if (!this.isCreating || !this.creationStart) return;
    
    const options = this.getAllOptions() as FrameToolOptions;
    if (options.preset !== 'custom') return; // Presets create immediately
    
    const current = { x: event.canvasX, y: event.canvasY };
    
    const bounds = {
      x: Math.min(this.creationStart.x, current.x),
      y: Math.min(this.creationStart.y, current.y),
      width: Math.abs(current.x - this.creationStart.x),
      height: Math.abs(current.y - this.creationStart.y)
    };
    
    // Constrain proportions with shift key
    if (event.shiftKey) {
      const size = Math.min(bounds.width, bounds.height);
      bounds.width = size;
      bounds.height = size;
    }
    
    // Minimum size constraint
    if (bounds.width < 10) bounds.width = 10;
    if (bounds.height < 10) bounds.height = 10;
    
    this.showCreationPreview(bounds);
  }

  onMouseUp(_event: ToolEvent): void {
    if (!this.isCreating) return;
    
    const options = this.getAllOptions() as FrameToolOptions;
    if (options.preset === 'custom' && this.previewObject) {
      this.commitObject().then(() => {
        this.setState(ToolState.ACTIVE);
      });
    }
    
    this.isCreating = false;
    this.creationStart = null;
  }

  private showCreationPreview(bounds: Rect): void {
    this.previewObject = this.createObjectData(bounds);
    // Note: setObjectPreview method needs to be implemented in CanvasManager
    // For now, we'll just store the preview object
  }

  private getPresetDimensions(preset: string): FramePreset | null {
    const presets: Record<string, FramePreset> = {
      'a4': { width: 595, height: 842, category: 'document', label: 'A4' },
      'a3': { width: 842, height: 1191, category: 'document', label: 'A3' },
      'letter': { width: 612, height: 792, category: 'document', label: 'Letter' },
      'instagram-square': { width: 1080, height: 1080, category: 'social', label: 'Instagram Square' },
      'instagram-portrait': { width: 1080, height: 1350, category: 'social', label: 'Instagram Portrait' },
      'instagram-landscape': { width: 1080, height: 566, category: 'social', label: 'Instagram Landscape' },
      'facebook-post': { width: 1200, height: 630, category: 'social', label: 'Facebook Post' },
      'twitter-post': { width: 1600, height: 900, category: 'social', label: 'Twitter Post' },
      'youtube-thumbnail': { width: 1280, height: 720, category: 'social', label: 'YouTube Thumbnail' },
      '16:9': { width: 1920, height: 1080, category: 'screen', label: '16:9' },
      '4:3': { width: 1600, height: 1200, category: 'screen', label: '4:3' },
      '1:1': { width: 1000, height: 1000, category: 'screen', label: 'Square' }
    };
    
    return presets[preset] || null;
  }

  private getPresetCategory(preset: string): string {
    const categories: Record<string, string> = {
      'a4': 'document',
      'a3': 'document',
      'letter': 'document',
      'instagram-square': 'social',
      'instagram-portrait': 'social',
      'instagram-landscape': 'social',
      'facebook-post': 'social',
      'twitter-post': 'social',
      'youtube-thumbnail': 'social',
      '16:9': 'screen',
      '4:3': 'screen',
      '1:1': 'screen'
    };
    
    return categories[preset] || 'custom';
  }

  private getFrameLabel(preset: string): string {
    return preset === 'custom' ? '' : `(${preset.toUpperCase()})`;
  }
} 