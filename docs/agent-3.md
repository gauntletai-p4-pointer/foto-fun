You are the senior product engineer responsible for implementing new features into our codebase. You must adhere 100% to existing patterns and architecture. We need 100% consistency and the most senior level of code. No hard coding css variables, no making assumptions, no inconsistent patterns.

We are creating a browser-based, ai-native photoshop alternative with the granular controls of photoshop (direct pixel manipulations), with the ui/ux of figma (objectts), with the power of AI (agents/chat with ai sdk v5 and replicate cloud api calls).

# Agent 3: Object Creation Tools Implementation

## 🎯 Mission Overview

Agent 3 is responsible for implementing tools that create new objects on the infinite canvas. These tools are fundamental for building compositions and adding content to the canvas.

## 📋 Tools to Implement

### Object Creation Tools
1. **Frame Tool** (`frame`) - Create frame objects with presets
2. **Text Tool** (`horizontal-type`) - Create text objects
3. **Vertical Type Tool** (`vertical-type`) - Create vertical text
4. **Type Mask Tool** (`type-mask`) - Create text-shaped selections
5. **Type on Path Tool** (`type-on-path`) - Create text along paths

### Shape Tools (Future - Not in initial scope)
- Rectangle, Ellipse, Polygon tools will be added later

## 🏗️ Implementation Guide

### Base Class for Object Creation

```typescript
// lib/editor/tools/base/ObjectCreationTool.ts
export abstract class ObjectCreationTool extends BaseTool {
  protected isCreating: boolean = false;
  protected creationStart: Point | null = null;
  protected previewObject: Partial<CanvasObject> | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Set appropriate cursor
    canvas.setCursor(this.getCreationCursor());
    
    this.setState(ToolState.ACTIVE);
  }
  
  protected abstract getCreationCursor(): string;
  protected abstract createObjectData(bounds: Rect): Partial<CanvasObject>;
  
  protected async commitObject(): Promise<void> {
    if (!this.previewObject) return;
    
    // The factory already has a method for creating objects
    const command = this.dependencies.commandFactory.createAddObjectCommand(
      this.previewObject
    );
    
    await this.dependencies.commandManager.execute(command);
    
    // Select the newly created object
    const createdId = (command as any).getCreatedObjectId(); // A bit of a hack, command should expose this
    if (createdId) {
      await this.dependencies.selectionManager.selectObject(createdId);
    }
    
    // Reset state
    this.previewObject = null;
    this.isCreating = false;
  }
  
  protected showCreationPreview(bounds: Rect): void {
    this.previewObject = this.createObjectData(bounds);
    this.dependencies.canvasManager.setObjectPreview(this.previewObject);
  }
}
```

## 🛠️ Tool Implementations

### 1. Frame Tool

```typescript
// lib/editor/tools/creation/frameTool.ts
export class FrameTool extends ObjectCreationTool {
  private currentPreset: FramePreset | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('frame', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      preset: {
        type: 'select',
        default: 'custom',
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
        type: 'color',
        default: '#FFFFFF',
        label: 'Fill Color'
      },
      strokeColor: {
        type: 'color',
        default: '#E0E0E0',
        label: 'Stroke Color'
      },
      strokeWidth: {
        type: 'number',
        default: 1,
        min: 0,
        max: 50,
        label: 'Stroke Width'
      },
      cornerRadius: {
        type: 'number',
        default: 0,
        min: 0,
        max: 100,
        label: 'Corner Radius'
      },
      clipContent: {
        type: 'boolean',
        default: true,
        label: 'Clip Content to Frame'
      }
    };
  }
  
  protected getCreationCursor(): string {
    return 'crosshair';
  }
  
  protected createObjectData(bounds: Rect): Partial<CanvasObject> {
    const options = this.getAllOptions();
    const preset = this.getPresetDimensions(options.preset);
    
    // Use preset dimensions if not custom
    if (preset && options.preset !== 'custom') {
      bounds = {
        x: bounds.x,
        y: bounds.y,
        width: preset.width,
        height: preset.height
      };
    }
    
    return {
      type: 'frame',
      name: `Frame ${this.getFrameLabel(options.preset)}`,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      data: {
        preset: options.preset,
        fillColor: options.fillColor,
        strokeColor: options.strokeColor,
        strokeWidth: options.strokeWidth,
        cornerRadius: options.cornerRadius,
        clipContent: options.clipContent,
        category: this.getPresetCategory(options.preset)
      }
    };
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent()) return;
    
    this.setState(ToolState.WORKING);
    this.isCreating = true;
    this.creationStart = { x: event.canvasX, y: event.canvasY };
    
    const options = this.getAllOptions();
    
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
        this.commitObject();
        this.setState(ToolState.ACTIVE);
      }
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isCreating || !this.creationStart) return;
    
    const options = this.getAllOptions();
    if (options.preset !== 'custom') return; // Presets create immediately
    
    const current = { x: event.canvasX, y: event.canvasY };
    
    let bounds = {
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
    
    this.showCreationPreview(bounds);
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isCreating) return;
    
    const options = this.getAllOptions();
    if (options.preset === 'custom' && this.previewObject) {
      this.commitObject();
    }
    
    this.isCreating = false;
    this.creationStart = null;
    this.setState(ToolState.ACTIVE);
  }
  
  private getPresetDimensions(preset: string): { width: number; height: number } | null {
    const presets: Record<string, { width: number; height: number }> = {
      'a4': { width: 595, height: 842 }, // 72 DPI
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

export const frameToolRegistration: ToolRegistration = {
  id: 'frame',
  toolClass: FrameTool,
  metadata: {
    name: 'Frame Tool',
    description: 'Create frames for document boundaries',
    icon: 'frame',
    shortcut: 'F',
    groupId: 'shape-group',
    order: 1
  }
};
```

### 2. Text Tool

```typescript
// lib/editor/tools/creation/textTool.ts
export class TextTool extends ObjectCreationTool {
  private textEditor: TextEditor | null = null;
  private editingObjectId: string | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('horizontal-type', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      fontFamily: {
        type: 'select',
        default: 'Inter',
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
        type: 'number',
        default: 24,
        min: 8,
        max: 500,
        label: 'Font Size'
      },
      fontWeight: {
        type: 'select',
        default: '400',
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
        type: 'select',
        default: 'normal',
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'italic', label: 'Italic' }
        ],
        label: 'Font Style'
      },
      textAlign: {
        type: 'select',
        default: 'left',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
          { value: 'justify', label: 'Justify' }
        ],
        label: 'Text Align'
      },
      lineHeight: {
        type: 'number',
        default: 1.5,
        min: 0.5,
        max: 5,
        step: 0.1,
        label: 'Line Height'
      },
      letterSpacing: {
        type: 'number',
        default: 0,
        min: -50,
        max: 200,
        label: 'Letter Spacing'
      },
      color: {
        type: 'color',
        default: '#000000',
        label: 'Text Color'
      }
    };
  }
  
  protected getCreationCursor(): string {
    return 'text';
  }
  
  protected createObjectData(bounds: Rect): Partial<CanvasObject> {
    const options = this.getAllOptions();
    
    return {
      type: 'text',
      name: 'Text',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width || 200, // Default width if clicking
      height: bounds.height || 50, // Auto-height based on content
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      data: {
        text: '',
        fontFamily: options.fontFamily,
        fontSize: options.fontSize,
        fontWeight: options.fontWeight,
        fontStyle: options.fontStyle,
        textAlign: options.textAlign,
        lineHeight: options.lineHeight,
        letterSpacing: options.letterSpacing,
        color: options.color,
        textDecoration: 'none',
        textTransform: 'none',
        direction: 'ltr',
        writingMode: 'horizontal-tb'
      }
    };
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    await super.onActivate(canvas);
    
    // Initialize text editor
    this.textEditor = new TextEditor(this.dependencies);
    
    // Subscribe to text object double-clicks
    const unsubscribe = this.dependencies.eventBus.on('canvas.object.dblclick', (data) => {
      if (data.object.type === 'text') {
        this.enterEditMode(data.object);
      }
    });
    this.registerCleanup(unsubscribe);
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent()) return;
    
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
    const objectData = this.createObjectData(bounds);
    const command = this.dependencies.commandFactory.createAddObjectCommand(
      objectData
    );
    
    await this.dependencies.commandManager.execute(command);
    
    const objectId = (command as any).getCreatedObjectId(); // Hack
    if (objectId) {
      // Select and enter edit mode
      await this.dependencies.selectionManager.selectObject(objectId);
      const textObject = this.dependencies.canvasManager.getObject(objectId);
      if (textObject) {
        this.enterEditMode(textObject);
      }
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
    this.dependencies.eventBus.emit('text.edit.started', {
      objectId: textObject.id,
      timestamp: Date.now()
    });
  }
  
  private exitEditMode(): void {
    if (!this.textEditor) return;
    
    this.textEditor.stopEditing();
    this.editingObjectId = null;
    this.setState(ToolState.ACTIVE);
    
    // Emit edit mode event
    this.dependencies.eventBus.emit('text.edit.ended', {
      timestamp: Date.now()
    });
  }
  
  private updateTextPreview(objectId: string, text: string): void {
    // Update text in real-time
    this.dependencies.canvasManager.updateObjectPreview(objectId, {
      data: {
        ...this.dependencies.canvasManager.getObject(objectId)?.data,
        text
      }
    });
  }
  
  private async commitTextChanges(objectId: string, text: string): Promise<void> {
    const textObject = this.dependencies.canvasManager.getObject(objectId);
    if (!textObject) return;
    
    const command = this.dependencies.commandFactory.createUpdateObjectCommand(
      objectId,
      {
        data: {
          ...textObject.data,
          text
        }
      }
    );
    
    await this.dependencies.commandManager.execute(command);
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
}

export const textToolRegistration: ToolRegistration = {
  id: 'horizontal-type',
  toolClass: TextTool,
  metadata: {
    name: 'Type Tool',
    description: 'Add text to the canvas',
    icon: 'text',
    shortcut: 'T',
    groupId: 'text-group',
    order: 1
  }
};
```

### 3. Text Editor Component

```typescript
// lib/editor/tools/creation/TextEditor.ts
export class TextEditor {
  private container: HTMLDivElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private currentObject: CanvasObject | null = null;
  private callbacks: TextEditorCallbacks | null = null;
  
  constructor(private dependencies: ToolDependencies) {}
  
  startEditing(textObject: CanvasObject, callbacks: TextEditorCallbacks): void {
    this.currentObject = textObject;
    this.callbacks = callbacks;
    
    // Create editor UI
    this.createEditor();
    this.positionEditor();
    this.applyStyles();
    
    // Focus and select all
    if (this.textarea) {
      this.textarea.value = textObject.data.text || '';
      this.textarea.focus();
      this.textarea.select();
    }
  }
  
  stopEditing(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.textarea = null;
    }
    
    this.currentObject = null;
    this.callbacks = null;
  }
  
  complete(): void {
    if (this.textarea && this.callbacks) {
      this.callbacks.onComplete(this.textarea.value);
    }
  }
  
  cancel(): void {
    if (this.callbacks) {
      this.callbacks.onCancel();
    }
  }
  
  private createEditor(): void {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'text-editor-overlay';
    
    // Create textarea
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'text-editor-textarea';
    
    // Handle input
    this.textarea.addEventListener('input', () => {
      if (this.callbacks) {
        this.callbacks.onTextChange(this.textarea!.value);
      }
      this.autoResize();
    });
    
    // Handle keyboard
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.complete();
      }
    });
    
    // Handle blur
    this.textarea.addEventListener('blur', () => {
      // Delay to allow for button clicks
      setTimeout(() => {
        if (this.container && !this.container.contains(document.activeElement)) {
          this.complete();
        }
      }, 100);
    });
    
    this.container.appendChild(this.textarea);
    document.body.appendChild(this.container);
  }
  
  private positionEditor(): void {
    if (!this.container || !this.currentObject) return;
    
    const canvasRect = this.dependencies.canvasManager.getCanvasRect();
    const zoom = this.dependencies.canvasManager.getZoom();
    const camera = this.dependencies.canvasManager.getCamera();
    
    // Convert object coordinates to screen coordinates
    const screenX = (this.currentObject.x - camera.x) * zoom + canvasRect.left;
    const screenY = (this.currentObject.y - camera.y) * zoom + canvasRect.top;
    const screenWidth = this.currentObject.width * zoom;
    const screenHeight = this.currentObject.height * zoom;
    
    this.container.style.position = 'fixed';
    this.container.style.left = `${screenX}px`;
    this.container.style.top = `${screenY}px`;
    this.container.style.width = `${screenWidth}px`;
    this.container.style.minHeight = `${screenHeight}px`;
  }
  
  private applyStyles(): void {
    if (!this.textarea || !this.currentObject) return;
    
    const data = this.currentObject.data;
    const zoom = this.dependencies.canvasManager.getZoom();
    
    // Apply text styles
    this.textarea.style.fontFamily = data.fontFamily || 'Inter';
    this.textarea.style.fontSize = `${(data.fontSize || 24) * zoom}px`;
    this.textarea.style.fontWeight = data.fontWeight || '400';
    this.textarea.style.fontStyle = data.fontStyle || 'normal';
    this.textarea.style.textAlign = data.textAlign || 'left';
    this.textarea.style.lineHeight = `${data.lineHeight || 1.5}`;
    this.textarea.style.letterSpacing = `${(data.letterSpacing || 0) * zoom}px`;
    this.textarea.style.color = data.color || '#000000';
    
    // Transparent background
    this.textarea.style.background = 'none';
    this.textarea.style.border = '1px dashed #0066FF';
    this.textarea.style.outline = 'none';
    this.textarea.style.resize = 'none';
    this.textarea.style.padding = '4px';
  }
  
  private autoResize(): void {
    if (!this.textarea) return;
    
    // Reset height to auto to get scroll height
    this.textarea.style.height = 'auto';
    
    // Set height to scroll height
    this.textarea.style.height = `${this.textarea.scrollHeight}px`;
  }
}

interface TextEditorCallbacks {
  onTextChange: (text: string) => void;
  onComplete: (finalText: string) => void;
  onCancel: () => void;
}
```

## 🔌 Adapter Implementations

### Frame Adapter

```typescript
// lib/ai/adapters/tools/FrameAdapter.ts
export class FrameAdapter extends UnifiedToolAdapter<FrameInput, FrameOutput> {
  readonly toolId = 'frame';
  readonly aiName = 'createFrame';
  readonly description = 'Create frames for document boundaries. Supports presets like "A4", "Instagram", "16:9" or custom dimensions.';
  
  readonly inputSchema = z.object({
    preset: z.enum([
      'a4', 'a3', 'letter',
      'instagram-square', 'instagram-portrait', 'instagram-landscape',
      'facebook-post', 'twitter-post', 'youtube-thumbnail',
      '16:9', '4:3', '1:1', 'custom'
    ]).optional(),
    width: z.number().optional().describe('Width in pixels (for custom)'),
    height: z.number().optional().describe('Height in pixels (for custom)'),
    position: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    fillColor: z.string().optional().describe('Fill color in hex'),
    strokeColor: z.string().optional().describe('Stroke color in hex'),
    strokeWidth: z.number().optional().describe('Stroke width in pixels'),
    cornerRadius: z.number().optional().describe('Corner radius in pixels')
  });
  
  async execute(params: FrameInput, context: CanvasContext): Promise<FrameOutput> {
    // Activate frame tool
    await this.dependencies.toolStore.activateTool('frame');
    const tool = this.dependencies.toolStore.getActiveTool() as FrameTool;
    
    // Set options
    if (params.preset) {
      tool.setOption('preset', params.preset);
    }
    if (params.fillColor) {
      tool.setOption('fillColor', params.fillColor);
    }
    if (params.strokeColor) {
      tool.setOption('strokeColor', params.strokeColor);
    }
    if (params.strokeWidth !== undefined) {
      tool.setOption('strokeWidth', params.strokeWidth);
    }
    if (params.cornerRadius !== undefined) {
      tool.setOption('cornerRadius', params.cornerRadius);
    }
    
    // Determine dimensions
    let dimensions: { width: number; height: number };
    if (params.preset && params.preset !== 'custom') {
      dimensions = this.getPresetDimensions(params.preset);
    } else if (params.width && params.height) {
      dimensions = { width: params.width, height: params.height };
    } else {
      throw new Error('Must specify either a preset or width/height for custom frames');
    }
    
    // Determine position
    const position = params.position || this.getCenterPosition(dimensions, context);
    
    // Create frame
    const bounds = {
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height
    };
    
    const frameData = tool.createObjectData(bounds);
    const command = this.dependencies.commandFactory.createAddObjectCommand(
      frameData
    );
    
    await this.dependencies.commandManager.execute(command);
    
    return {
      success: true,
      frameId: (command as any).getCreatedObjectId(), // Hack
      dimensions,
      position,
      preset: params.preset || 'custom'
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
  ): Point {
    const viewport = context.dimensions;
    return {
      x: (viewport.width - dimensions.width) / 2,
      y: (viewport.height - dimensions.height) / 2
    };
  }
}
```

### Text Adapter

```typescript
// lib/ai/adapters/tools/AddTextAdapter.ts
export class AddTextAdapter extends UnifiedToolAdapter<TextInput, TextOutput> {
  readonly toolId = 'horizontal-type';
  readonly aiName = 'addText';
  readonly description = 'Add text to the canvas. Specify the text content, font properties, and position.';
  
  readonly inputSchema = z.object({
    text: z.string().describe('The text content to add'),
    position: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    fontSize: z.number().optional().describe('Font size in pixels'),
    fontFamily: z.string().optional().describe('Font family name'),
    fontWeight: z.enum(['100', '300', '400', '500', '600', '700', '900']).optional(),
    color: z.string().optional().describe('Text color in hex'),
    align: z.enum(['left', 'center', 'right', 'justify']).optional(),
    style: z.object({
      italic: z.boolean().optional(),
      underline: z.boolean().optional(),
      strikethrough: z.boolean().optional()
    }).optional()
  });
  
  async execute(params: TextInput, context: CanvasContext): Promise<TextOutput> {
    // Activate text tool
    await this.dependencies.toolStore.activateTool('horizontal-type');
    const tool = this.dependencies.toolStore.getActiveTool() as TextTool;
    
    // Set text options
    if (params.fontSize) {
      tool.setOption('fontSize', params.fontSize);
    }
    if (params.fontFamily) {
      tool.setOption('fontFamily', params.fontFamily);
    }
    if (params.fontWeight) {
      tool.setOption('fontWeight', params.fontWeight);
    }
    if (params.color) {
      tool.setOption('color', params.color);
    }
    if (params.align) {
      tool.setOption('textAlign', params.align);
    }
    
    // Determine position
    const position = params.position || this.getDefaultTextPosition(context);
    
    // Create text object
    const bounds = {
      x: position.x,
      y: position.y,
      width: 200, // Default width, will auto-adjust
      height: 50  // Default height, will auto-adjust
    };
    
    const textData = tool.createObjectData(bounds);
    textData.data.text = params.text;
    
    // Apply style options
    if (params.style) {
      if (params.style.italic) {
        textData.data.fontStyle = 'italic';
      }
      if (params.style.underline || params.style.strikethrough) {
        const decorations = [];
        if (params.style.underline) decorations.push('underline');
        if (params.style.strikethrough) decorations.push('line-through');
        textData.data.textDecoration = decorations.join(' ');
      }
    }
    
    const command = this.dependencies.commandFactory.createAddObjectCommand(
      textData
    );
    
    await this.dependencies.commandManager.execute(command);
    
    return {
      success: true,
      textId: (command as any).getCreatedObjectId(), // Hack
      position,
      actualBounds: {
        width: textData.width!,
        height: textData.height!
      }
    };
  }
  
  private getDefaultTextPosition(context: CanvasContext): Point {
    // Position text in center-top area if no position specified
    return {
      x: context.dimensions.width / 2 - 100, // Center horizontally
      y: 100 // Near top
    };
  }
}
```

## 📋 Implementation Checklist

### Frame Tool
- [ ] Implement FrameTool class extending ObjectCreationTool
- [ ] Support all social media presets
- [ ] Support document presets (A4, Letter, etc.)
- [ ] Add custom size creation with drag
- [ ] Implement corner radius support
- [ ] Add stroke and fill options
- [ ] Support content clipping toggle
- [ ] Write comprehensive tests

### Text Tool
- [ ] Implement TextTool class extending ObjectCreationTool
- [ ] Create inline text editor component
- [ ] Support all font properties
- [ ] Add real-time preview during editing
- [ ] Implement text selection and editing
- [ ] Support keyboard shortcuts
- [ ] Add auto-resize based on content
- [ ] Write comprehensive tests

### Vertical Type Tool
- [ ] Implement VerticalTypeTool class
- [ ] Support vertical text layout
- [ ] Handle vertical text editing
- [ ] Support right-to-left vertical text
- [ ] Write comprehensive tests

### Type Mask Tool
- [ ] Implement TypeMaskTool class
- [ ] Create text-shaped selections
- [ ] Support all text properties for mask
- [ ] Integrate with selection system
- [ ] Write comprehensive tests

### Type on Path Tool
- [ ] Implement TypeOnPathTool class
- [ ] Support text along bezier paths
- [ ] Handle path creation/selection
- [ ] Support text positioning on path
- [ ] Write comprehensive tests

### Adapters
- [ ] Implement FrameAdapter with preset support
- [ ] Implement AddTextAdapter with style options
- [ ] Implement vertical text adapter
- [ ] Register all adapters in AdapterRegistry
- [ ] Write adapter tests

## 🧪 Testing Requirements

Each tool must have:
1. Object creation accuracy tests
2. Preset dimension tests
3. Text rendering tests
4. Undo/redo operation tests
5. Property update tests
6. Cross-browser text rendering tests

## 📚 Resources

- Foundation patterns: `docs/foundation.md`
- Object system: `lib/editor/objects/types.ts`
- Command patterns: `lib/editor/commands/`
- Text rendering: `lib/editor/text/TextRenderer.ts`

---

Agent 3 is responsible for implementing these object creation tools that enable users to build compositions on the infinite canvas. Follow the patterns established in the foundation document and ensure all implementations maintain senior-level architecture standards.