import { ObjectCreationTool } from '../base/ObjectCreationTool';
import type { ToolDependencies, ToolOptions } from '../base/BaseTool';
import { ToolState } from '../base/BaseTool';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { CanvasObject, Point, Rect } from '@/types';
import type { TextData } from '@/lib/editor/objects/types';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';
import { TextEditor, TextEditorDependencies } from './TextEditor';

interface TextToolOptions extends ToolOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  lineHeight: number;
  letterSpacing: number;
  color: string;
}

/**
 * Text Tool - Creates and edits text objects on the canvas
 * Supports inline editing with full typography controls
 */
export class TextTool extends ObjectCreationTool {
  private textEditor: TextEditor | null = null;
  private editingObjectId: string | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  static getMetadata(): ToolMetadata {
    return {
      id: 'horizontal-type',
      name: 'Type Tool',
      description: 'Add text to the canvas',
      category: 'core',
      groupId: 'text-group',
      icon: ToolGroupIcons['text'],
      cursor: 'text',
      shortcut: 'T',
      priority: 1,
    };
  }

  protected getDefaultOptions(): TextToolOptions {
    return {
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: '400',
      fontStyle: 'normal',
      textAlign: 'left',
      lineHeight: 1.5,
      letterSpacing: 0,
      color: '#000000'
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
          { value: 'Courier New', label: 'Courier New' },
          { value: 'Verdana', label: 'Verdana' },
          { value: 'system-ui', label: 'System UI' }
        ],
        label: 'Font Family'
      },
      fontSize: {
        type: 'number' as const,
        defaultValue: 24,
        min: 8,
        max: 500,
        label: 'Font Size'
      },
      fontWeight: {
        type: 'select' as const,
        defaultValue: '400',
        options: [
          { value: '100', label: 'Thin' },
          { value: '300', label: 'Light' },
          { value: '400', label: 'Regular' },
          { value: '500', label: 'Medium' },
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
          { value: 'right', label: 'Right' },
          { value: 'justify', label: 'Justify' }
        ],
        label: 'Text Align'
      },
      lineHeight: {
        type: 'number' as const,
        defaultValue: 1.5,
        min: 0.5,
        max: 5,
        step: 0.1,
        label: 'Line Height'
      },
      letterSpacing: {
        type: 'number' as const,
        defaultValue: 0,
        min: -50,
        max: 200,
        label: 'Letter Spacing'
      },
      color: {
        type: 'color' as const,
        defaultValue: '#000000',
        label: 'Text Color'
      }
    };
  }

  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Initialize text editor
    const editorDeps: TextEditorDependencies = {
      canvasManager: canvas
    };
    this.textEditor = new TextEditor(editorDeps);
    
    // Set text cursor
    this.cursor = this.getCreationCursor();
    
    // Subscribe to text object double-clicks
    // Note: 'canvas.object.dblclick' event needs to be added to EventRegistry
    // For now, we'll skip this subscription
    
    // Emit activation event
    this.dependencies.eventBus.emit('tool.activated', {
      toolId: this.id,
      previousToolId: null
    });
    
    this.setState(ToolState.ACTIVE);
  }

  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Exit edit mode if active
    if (this.editingObjectId) {
      this.exitEditMode();
    }
    
    // Clean up text editor
    if (this.textEditor) {
      this.textEditor.stopEditing();
      this.textEditor = null;
    }
    
    // Reset state
    this.isCreating = false;
    this.creationStart = null;
    
    // Emit deactivation event
    this.dependencies.eventBus.emit('tool.deactivated', {
      toolId: this.id
    });
    
    this.setState(ToolState.INACTIVE);
  }

  protected getCreationCursor(): string {
    return 'text';
  }

  protected createObjectData(bounds: Rect): Partial<CanvasObject> {
    const options = this.getAllOptions() as TextToolOptions;
    
    const textData: TextData = {
      content: '',
      font: options.fontFamily,
      fontSize: options.fontSize,
      color: options.color,
      align: options.textAlign as 'left' | 'center' | 'right',
      lineHeight: options.lineHeight,
      letterSpacing: options.letterSpacing,
      direction: 'horizontal'
    };
    
    return {
      type: 'text',
      name: 'Text',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width || 200,
      height: bounds.height || 50,
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
      data: textData
    };
  }

  onMouseDown(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    
    // Check if clicking on existing text object
    const clickedObject = this.getObjectAtPoint({ x: event.canvasX, y: event.canvasY });
    
    if (clickedObject && clickedObject.type === 'text') {
      // Enter edit mode for existing text
      this.enterEditMode(clickedObject);
    } else {
      // Create new text object
      this.createNewText({ x: event.canvasX, y: event.canvasY });
    }
  }

  private async createNewText(position: Point): Promise<void> {
    const bounds = {
      x: position.x,
      y: position.y,
      width: 200,
      height: 50
    };
    
    // Create text object
    this.previewObject = this.createObjectData(bounds);
    await this.commitObject();
    
    // Get the newly created object
    const objects = this.dependencies.canvasManager.getAllObjects();
    const newObject = objects[objects.length - 1];
    
    if (newObject && newObject.type === 'text') {
      // Select and enter edit mode
      this.dependencies.canvasManager.selectObjects([newObject.id]);
      this.enterEditMode(newObject);
    }
  }

  private enterEditMode(textObject: CanvasObject): void {
    if (!this.textEditor) return;
    
    this.setState(ToolState.WORKING);
    this.editingObjectId = textObject.id;
    
    // Show text editor
    this.textEditor.startEditing(textObject, {
      onTextChange: (text: string) => {
        this.updateTextPreview(textObject.id, text);
      },
      onComplete: (finalText: string) => {
        this.commitTextChanges(textObject.id, finalText);
        this.exitEditMode();
      },
      onCancel: () => {
        this.exitEditMode();
      }
    });
    
    // Emit edit mode event
    // Note: 'text.edit.started' event needs to be added to EventRegistry
    // For now, we'll skip this event
  }

  private exitEditMode(): void {
    if (!this.textEditor) return;
    
    this.textEditor.stopEditing();
    this.editingObjectId = null;
    this.setState(ToolState.ACTIVE);
    
    // Emit edit mode event  
    // Note: 'text.edit.ended' event needs to be added to EventRegistry
    // For now, we'll skip this event
  }

  private updateTextPreview(objectId: string, text: string): void {
    // Update text in real-time via direct canvas manipulation
    const object = this.dependencies.canvasManager.getObject(objectId);
    if (!object || object.type !== 'text') return;
    
    // For now, we'll store the preview text
    // In a full implementation, this would update the Konva text node directly
    if (object.data) {
      (object.data as TextData).content = text;
    }
  }

  private async commitTextChanges(objectId: string, text: string): Promise<void> {
    const textObject = this.dependencies.canvasManager.getObject(objectId);
    if (!textObject || textObject.type !== 'text') return;
    
    const updatedData = {
      ...(textObject.data as TextData),
      content: text
    };
    
    const command = this.dependencies.commandFactory.createUpdateObjectCommand(
      objectId,
      { data: updatedData }
    );
    
    await this.dependencies.commandManager.executeCommand(command);
  }

  onKeyDown(event: KeyboardEvent): void {
    // Handle keyboard shortcuts while editing
    if (this.editingObjectId && this.textEditor) {
      if (event.key === 'Escape') {
        this.textEditor.cancel();
      } else if (event.key === 'Enter' && event.metaKey) {
        // Cmd/Ctrl + Enter to finish editing
        this.textEditor.complete();
      }
    }
  }

  private getObjectAtPoint(point: Point): CanvasObject | null {
    // Get all objects and check from top to bottom
    const objects = this.dependencies.canvasManager.getAllObjects();
    
    // Check objects in reverse order (top to bottom)
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (this.isPointInObject(point, obj)) {
        return obj;
      }
    }
    
    return null;
  }

  private isPointInObject(point: Point, object: CanvasObject): boolean {
    // Simple bounding box check
    return point.x >= object.x &&
           point.x <= object.x + object.width &&
           point.y >= object.y &&
           point.y <= object.y + object.height;
  }

  /**
   * Public method for creating text programmatically (e.g., from AI adapters)
   * @param options Text creation options
   * @returns The ID of the created text object
   */
  public async createText(options: {
    text: string;
    position?: { x: number; y: number };
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    align?: string;
    lineHeight?: number;
    letterSpacing?: number;
  }): Promise<string | null> {
    // Validate text content
    if (!options.text || options.text.trim().length === 0) {
      throw new Error('Text content cannot be empty');
    }

    // Apply options
    if (options.fontSize) {
      this.setOption('fontSize', options.fontSize);
    }
    if (options.fontFamily) {
      this.setOption('fontFamily', options.fontFamily);
    }
    if (options.fontWeight) {
      this.setOption('fontWeight', options.fontWeight);
    }
    if (options.fontStyle) {
      this.setOption('fontStyle', options.fontStyle);
    }
    if (options.color) {
      this.setOption('color', options.color);
    }
    if (options.align) {
      this.setOption('textAlign', options.align);
    }
    if (options.lineHeight !== undefined) {
      this.setOption('lineHeight', options.lineHeight);
    }
    if (options.letterSpacing !== undefined) {
      this.setOption('letterSpacing', options.letterSpacing);
    }

    // Determine position
    const position = options.position || { x: 100, y: 100 };
    
    // Calculate estimated bounds
    const fontSize = options.fontSize || 24;
    const estimatedWidth = Math.max(200, options.text.length * fontSize * 0.6);
    const estimatedHeight = fontSize * (options.lineHeight || 1.5) * 1.2;
    
    const bounds = {
      x: position.x,
      y: position.y,
      width: estimatedWidth,
      height: estimatedHeight
    };

    // Create text object
    this.previewObject = this.createObjectData(bounds);
    
    // Set the text content
    if (this.previewObject.data) {
      (this.previewObject.data as TextData).content = options.text;
    }
    
    // Commit the object
    const objectId = await this.commitObject();
    
    // Reset preview
    this.previewObject = null;
    
    return objectId;
  }
}