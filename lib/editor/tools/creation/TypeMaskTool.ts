import { BaseTool, ToolDependencies, ToolState } from '../base/BaseTool';
import type { ToolOptions } from '../base/BaseTool';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { Point, Rect } from '@/types';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';

interface TypeMaskToolOptions extends ToolOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
}

/**
 * Type Mask Tool - Creates text-shaped selections
 * Instead of creating text objects, it creates selections in the shape of text
 */
export class TypeMaskTool extends BaseTool<TypeMaskToolOptions> {
  private isCreating: boolean = false;
  private creationStart: Point | null = null;
  private previewText: string = '';
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  static getMetadata(): ToolMetadata {
    return {
      id: 'type-mask',
      name: 'Type Mask Tool',
      description: 'Create text-shaped selections',
      category: 'core',
      groupId: 'text-group',
      icon: ToolGroupIcons['type-mask'],
      cursor: 'text',
      shortcut: 'Alt+T',
      priority: 3,
    };
  }

  protected getDefaultOptions(): TypeMaskToolOptions {
    return {
      fontFamily: 'Inter',
      fontSize: 48,
      fontWeight: '700',
      fontStyle: 'normal',
      textAlign: 'left'
    };
  }

  public getOptionDefinitions() {
    return {
      fontFamily: {
        type: 'select' as const,
        defaultValue: 'Inter',
        options: [
          { value: 'Inter', label: 'Inter' },
          { value: 'Arial', label: 'Arial' },
          { value: 'Helvetica', label: 'Helvetica' },
          { value: 'Times New Roman', label: 'Times New Roman' },
          { value: 'Georgia', label: 'Georgia' },
          { value: 'Impact', label: 'Impact' }
        ],
        label: 'Font Family'
      },
      fontSize: {
        type: 'number' as const,
        defaultValue: 48,
        min: 12,
        max: 500,
        label: 'Font Size'
      },
      fontWeight: {
        type: 'select' as const,
        defaultValue: '700',
        options: [
          { value: '400', label: 'Regular' },
          { value: '600', label: 'Semi Bold' },
          { value: '700', label: 'Bold' },
          { value: '900', label: 'Black' }
        ],
        label: 'Font Weight'
      },
      fontStyle: {
        type: 'select' as const,
        defaultValue: 'normal',
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'italic', label: 'Italic' }
        ],
        label: 'Font Style'
      },
      textAlign: {
        type: 'select' as const,
        defaultValue: 'left',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' }
        ],
        label: 'Text Align'
      }
    };
  }

  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Set text cursor
    this.cursor = 'text';
    
    // Emit activation event
    this.dependencies.eventBus.emit('tool.activated', {
      toolId: this.id,
      previousToolId: null
    });
    
    this.setState(ToolState.ACTIVE);
  }

  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Reset state
    this.isCreating = false;
    this.creationStart = null;
    this.previewText = '';
    
    // Emit deactivation event
    this.dependencies.eventBus.emit('tool.deactivated', {
      toolId: this.id
    });
    
    this.setState(ToolState.INACTIVE);
  }

  onMouseDown(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    
    this.setState(ToolState.WORKING);
    this.isCreating = true;
    this.creationStart = { x: event.canvasX, y: event.canvasY };
    
    // Show text input dialog
    this.showTextInputDialog();
  }

  private showTextInputDialog(): void {
    // Create a simple text input overlay
    const overlay = document.createElement('div');
    overlay.className = 'type-mask-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 400px;
    `;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter text for selection mask...';
    input.style.cssText = `
      width: 100%;
      padding: 10px;
      font-size: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 10px;
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    `;
    
    const createButton = document.createElement('button');
    createButton.textContent = 'Create Selection';
    createButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      background: #0066FF;
      color: white;
      border-radius: 4px;
      cursor: pointer;
    `;
    
    dialog.appendChild(input);
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(createButton);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus input
    input.focus();
    
    // Handle events
    const cleanup = () => {
      overlay.remove();
      this.isCreating = false;
      this.setState(ToolState.ACTIVE);
    };
    
    cancelButton.onclick = cleanup;
    
    createButton.onclick = () => {
      const text = input.value.trim();
      if (text) {
        this.createTextSelection(text);
      }
      cleanup();
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        createButton.click();
      } else if (e.key === 'Escape') {
        cancelButton.click();
      }
    };
  }

  private async createTextSelection(text: string): Promise<void> {
    if (!this.creationStart) return;
    
    const options = this.getAllOptions();
    
    // Create a text-shaped selection
    // This would need integration with the selection system
    const _selectionBounds: Rect = {
      x: this.creationStart.x,
      y: this.creationStart.y,
      width: text.length * (options.fontSize * 0.6), // Rough estimate
      height: options.fontSize * 1.2
    };
    
    // Create selection via command
    // Note: This would need a proper text-mask selection implementation
    // For now, we'll just emit the operation event
    
    // In a full implementation, this would:
    // 1. Render the text to a canvas
    // 2. Extract the alpha channel as a selection mask
    // 3. Apply the selection to the canvas
    
    this.emitOperation('type-mask-created', {
      text,
      position: this.creationStart,
      options
    });
  }
}