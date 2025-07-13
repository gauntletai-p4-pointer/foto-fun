import { ObjectCreationTool } from '../base/ObjectCreationTool';
import type { ToolDependencies, ToolOptions } from '../base/BaseTool';
import { ToolState } from '../base/BaseTool';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { CanvasObject, Point, Rect } from '@/types';
import type { TextData } from '@/lib/editor/objects/types';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';

interface TypeOnPathToolOptions extends ToolOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  letterSpacing: number;
  pathOffset: number;
  pathAlign: string;
}

interface PathPoint {
  x: number;
  y: number;
  controlPoint1?: Point;
  controlPoint2?: Point;
}

/**
 * Type on Path Tool - Creates text that follows along paths
 * Allows text to be placed along bezier curves and custom paths
 */
export class TypeOnPathTool extends ObjectCreationTool {
  private isDrawingPath: boolean = false;
  private pathPoints: PathPoint[] = [];
  private selectedPathId: string | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  static getMetadata(): ToolMetadata {
    return {
      id: 'type-on-path',
      name: 'Type on Path Tool',
      description: 'Create text along paths',
      category: 'core',
      groupId: 'text-group',
      icon: ToolGroupIcons['type-on-path'],
      cursor: 'crosshair',
      shortcut: 'Shift+Alt+T',
      priority: 4,
    };
  }

  protected getDefaultOptions(): TypeOnPathToolOptions {
    return {
      fontFamily: 'Inter',
      fontSize: 18,
      fontWeight: '400',
      fontStyle: 'normal',
      color: '#000000',
      letterSpacing: 0,
      pathOffset: 0,
      pathAlign: 'baseline'
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
          { value: 'Georgia', label: 'Georgia' }
        ],
        label: 'Font Family'
      },
      fontSize: {
        type: 'number' as const,
        defaultValue: 18,
        min: 8,
        max: 200,
        label: 'Font Size'
      },
      fontWeight: {
        type: 'select' as const,
        defaultValue: '400',
        options: [
          { value: '300', label: 'Light' },
          { value: '400', label: 'Regular' },
          { value: '600', label: 'Semi Bold' },
          { value: '700', label: 'Bold' }
        ],
        label: 'Font Weight'
      },
      color: {
        type: 'color' as const,
        defaultValue: '#000000',
        label: 'Text Color'
      },
      letterSpacing: {
        type: 'number' as const,
        defaultValue: 0,
        min: -20,
        max: 100,
        label: 'Letter Spacing'
      },
      pathOffset: {
        type: 'number' as const,
        defaultValue: 0,
        min: -100,
        max: 100,
        label: 'Path Offset',
        step: 1
      },
      pathAlign: {
        type: 'select' as const,
        defaultValue: 'baseline',
        options: [
          { value: 'baseline', label: 'Baseline' },
          { value: 'top', label: 'Top' },
          { value: 'middle', label: 'Middle' },
          { value: 'bottom', label: 'Bottom' }
        ],
        label: 'Path Alignment'
      }
    };
  }

  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Set cursor
    this.cursor = this.getCreationCursor();
    
    // Subscribe to path selection events
    const unsubscribe = this.dependencies.eventBus.on('canvas.object.selected', (data) => {
      const object = this.dependencies.canvasManager.getObject(data.objectId);
      if (object && object.type === 'shape' && object.data && 'type' in object.data && (object.data as { type: string }).type === 'path') {
        this.selectedPathId = data.objectId;
      }
    });
    this.registerCleanup(unsubscribe);
    
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
    this.isDrawingPath = false;
    this.pathPoints = [];
    this.selectedPathId = null;
    this.isCreating = false;
    this.creationStart = null;
    
    // Emit deactivation event
    this.dependencies.eventBus.emit('tool.deactivated', {
      toolId: this.id
    });
    
    this.setState(ToolState.INACTIVE);
  }

  protected getCreationCursor(): string {
    return this.isDrawingPath ? 'crosshair' : 'text';
  }

  protected createObjectData(bounds: Rect): Partial<CanvasObject> {
    const options = this.getAllOptions() as TypeOnPathToolOptions;
    
    // Create text object with path data
    return {
      type: 'text',
      name: 'Text on Path',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
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
      data: {
        content: '',
        font: options.fontFamily,
        fontSize: options.fontSize,
        color: options.color,
        align: 'left' as const,
        lineHeight: 1.5,
        letterSpacing: options.letterSpacing,
        direction: 'horizontal' as const
      } as TextData
    };
  }

  onMouseDown(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    
    const point = { x: event.canvasX, y: event.canvasY };
    
    if (event.shiftKey) {
      // Shift+click to create path mode
      this.startPathCreation(point);
    } else if (this.isDrawingPath) {
      // Continue drawing path
      this.addPathPoint(point);
    } else {
      // Check if clicking on existing path object
      const clickedObject = this.getObjectAtPoint(point);
      if (clickedObject && clickedObject.type === 'shape' && clickedObject.data && 'type' in clickedObject.data && (clickedObject.data as { type: string }).type === 'path') {
        this.selectedPathId = clickedObject.id;
        this.showTextInputDialog();
      } else if (this.pathPoints.length > 0) {
        // If we have a path, place text
        this.showTextInputDialog();
      }
    }
  }

  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawingPath) return;
    
    // Update preview of path being drawn
    const _currentPoint = { x: event.canvasX, y: event.canvasY };
    // In full implementation, this would show a preview line
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.isDrawingPath && event.key === 'Enter') {
      // Finish path drawing
      this.finishPathCreation();
    } else if (event.key === 'Escape') {
      // Cancel current operation
      this.cancelCurrentOperation();
    }
  }

  private startPathCreation(point: Point): void {
    this.isDrawingPath = true;
    this.pathPoints = [{ x: point.x, y: point.y }];
    this.setState(ToolState.WORKING);
    
    this.emitIntent('path-creation-started', {
      startPoint: point
    });
  }

  private addPathPoint(point: Point): void {
    this.pathPoints.push({ x: point.x, y: point.y });
    
    // Could add bezier control points here for curved paths
    if (this.pathPoints.length > 1) {
      const _prevPoint = this.pathPoints[this.pathPoints.length - 2];
      // Calculate control points for smooth curves
    }
  }

  private finishPathCreation(): void {
    if (this.pathPoints.length < 2) {
      this.cancelCurrentOperation();
      return;
    }
    
    this.isDrawingPath = false;
    this.showTextInputDialog();
  }

  private cancelCurrentOperation(): void {
    this.isDrawingPath = false;
    this.pathPoints = [];
    this.setState(ToolState.ACTIVE);
  }

  private showTextInputDialog(): void {
    // Similar to TypeMaskTool, show dialog for text input
    const overlay = document.createElement('div');
    overlay.className = 'type-path-overlay';
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
    input.placeholder = 'Enter text for path...';
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
    createButton.textContent = 'Create Text';
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
    
    input.focus();
    
    const cleanup = () => {
      overlay.remove();
      this.setState(ToolState.ACTIVE);
    };
    
    cancelButton.onclick = () => {
      cleanup();
      this.cancelCurrentOperation();
    };
    
    createButton.onclick = () => {
      const text = input.value.trim();
      if (text) {
        this.createTextOnPath(text);
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

  private async createTextOnPath(text: string): Promise<void> {
    const bounds = this.calculatePathBounds();
    
    // Create the text-on-path object
    this.previewObject = this.createObjectData(bounds);
    if (this.previewObject.data) {
      (this.previewObject.data as TextData).content = text;
    }
    
    await this.commitObject();
    
    // Reset state
    this.pathPoints = [];
    this.selectedPathId = null;
    
    this.emitOperation('text-on-path-created', {
      text,
      pathPoints: this.pathPoints,
      selectedPathId: this.selectedPathId
    });
  }

  private createPathData(): string {
    // Convert path points to SVG path data
    if (this.pathPoints.length < 2) return '';
    
    let pathData = `M ${this.pathPoints[0].x} ${this.pathPoints[0].y}`;
    
    for (let i = 1; i < this.pathPoints.length; i++) {
      const point = this.pathPoints[i];
      // Simple line for now, could use bezier curves
      pathData += ` L ${point.x} ${point.y}`;
    }
    
    return pathData;
  }

  private calculatePathBounds(): Rect {
    if (this.pathPoints.length === 0) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }
    
    let minX = this.pathPoints[0].x;
    let minY = this.pathPoints[0].y;
    let maxX = minX;
    let maxY = minY;
    
    for (const point of this.pathPoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private getObjectAtPoint(point: Point): CanvasObject | null {
    const objects = this.dependencies.canvasManager.getAllObjects();
    
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (this.isPointInObject(point, obj)) {
        return obj;
      }
    }
    
    return null;
  }

  private isPointInObject(point: Point, object: CanvasObject): boolean {
    return point.x >= object.x &&
           point.x <= object.x + object.width &&
           point.y >= object.y &&
           point.y <= object.y + object.height;
  }
}