# Agent 2: Drawing and Selection Tools Implementation

## 🎯 Mission Overview

Agent 2 is responsible for implementing drawing tools that manipulate pixels directly and selection tools that create pixel-level masks. These tools are critical for precise editing and creative work on the infinite canvas.

## 📋 Tools to Implement

### Drawing Tools (Pixel Manipulation)
1. **Brush Tool** (`brush`) - Paint pixels on image objects
2. **Eraser Tool** (`eraser`) - Remove pixels from image objects
3. **Gradient Tool** (`gradient`) - Apply gradient fills to selections/objects

### Selection Tools
1. **Marquee Rectangle** (`marquee-rect`) - Rectangular selections
2. **Marquee Ellipse** (`marquee-ellipse`) - Elliptical selections
3. **Lasso Tool** (`lasso`) - Freehand selections
4. **Magic Wand** (`magic-wand`) - Color-based selections
5. **Quick Selection** (`quick-selection`) - Smart edge detection

## 🏗️ Implementation Guide

### Base Classes to Extend

```typescript
// Drawing tools extend DrawingTool
import { DrawingTool } from 'lib/editor/tools/drawing/DrawingTool';

// Selection tools extend SelectionTool
import { SelectionTool } from 'lib/editor/tools/selection/SelectionTool';
```

### DrawingTool Base Class

```typescript
// lib/editor/tools/drawing/DrawingTool.ts
export abstract class DrawingTool extends BaseTool {
  protected pixelBuffer: PixelBuffer | null = null;
  protected isDrawing: boolean = false;
  protected lastPoint: Point | null = null;
  protected strokePath: Point[] = [];
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Drawing tools require an image object
    const imageObjects = this.getImageObjects();
    if (imageObjects.length === 0) {
      this.showNoImageMessage();
      this.switchToDefaultTool();
      return;
    }
    
    // Initialize pixel buffer for active image
    this.pixelBuffer = await this.createPixelBuffer(imageObjects[0]);
    
    // Subscribe to selection changes
    const unsubscribe = this.dependencies.eventBus.on('selection.changed', async (data) => {
      await this.handleSelectionChange(data.selectedObjects);
    });
    this.registerCleanup(unsubscribe);
    
    this.setState(ToolState.ACTIVE);
  }
  
  protected async createPixelBuffer(imageObject: CanvasObject): Promise<PixelBuffer> {
    return new PixelBuffer(
      imageObject.data.imageData,
      imageObject.width,
      imageObject.height
    );
  }
  
  protected applyBrushStroke(from: Point, to: Point): void {
    if (!this.pixelBuffer) return;
    
    const options = this.getAllOptions();
    const brush = this.createBrush(options);
    
    // Draw line between points
    this.pixelBuffer.drawLine(from, to, brush);
    
    // Update canvas preview
    this.updateCanvasPreview();
  }
  
  protected abstract createBrush(options: Record<string, any>): Brush;
  
  protected commitDrawing(): void {
    if (!this.pixelBuffer || this.strokePath.length === 0) return;
    
    const imageObject = this.getImageObjects()[0];
    
    // NOTE FOR EXECUTOR: This requires adding a `createDrawCommand` method to CommandFactory.ts
    const command = this.dependencies.commandFactory.createDrawCommand(
      imageObject.id,
      this.pixelBuffer.getImageData(),
      this.strokePath
    );
    
    this.dependencies.commandManager.execute(command);
    this.strokePath = [];
  }
}
```

### SelectionTool Base Class

```typescript
// lib/editor/tools/selection/SelectionTool.ts
export abstract class SelectionTool extends BaseTool {
  protected selectionMask: SelectionMask | null = null;
  protected selectionMode: SelectionMode = 'new';
  protected isSelecting: boolean = false;
  protected selectionStart: Point | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Subscribe to keyboard modifiers
    const unsubscribe = this.dependencies.eventBus.on('keyboard.modifiers.changed', (data) => {
      this.updateSelectionMode(data);
    });
    this.registerCleanup(unsubscribe);
    
    this.setState(ToolState.ACTIVE);
  }
  
  protected updateSelectionMode(modifiers: KeyboardModifiers): void {
    if (modifiers.shiftKey && modifiers.altKey) {
      this.selectionMode = 'intersect';
    } else if (modifiers.shiftKey) {
      this.selectionMode = 'add';
    } else if (modifiers.altKey) {
      this.selectionMode = 'subtract';
    } else {
      this.selectionMode = 'new';
    }
    
    this.updateCursor();
  }
  
  protected createSelectionMask(bounds: Rect): SelectionMask {
    return new SelectionMask(bounds.width, bounds.height, bounds.x, bounds.y);
  }
  
  protected applySelection(): void {
    if (!this.selectionMask) return;
    
    // NOTE FOR EXECUTOR: This requires adding a `createApplySelectionCommand` method to CommandFactory.ts
    const command = this.dependencies.commandFactory.createApplySelectionCommand(
      this.selectionMask,
      this.selectionMode
    );
    
    this.dependencies.commandManager.execute(command);
    
    // Emit selection created event
    this.dependencies.eventBus.emit('selection.created', {
      mask: this.selectionMask,
      mode: this.selectionMode,
      bounds: this.selectionMask.getBounds(),
      timestamp: Date.now()
    });
  }
  
  protected abstract updateSelectionPreview(current: Point): void;
}
```

## 🛠️ Tool Implementations

### 1. Brush Tool

```typescript
// lib/editor/tools/drawing/brushTool.ts
export class BrushTool extends DrawingTool {
  private pressure: number = 1.0;
  private smoothing: number = 0;
  private smoothingBuffer: Point[] = [];
  
  constructor(dependencies: ToolDependencies) {
    super('brush', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      size: {
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        label: 'Brush Size'
      },
      hardness: {
        type: 'number',
        default: 100,
        min: 0,
        max: 100,
        label: 'Hardness %'
      },
      opacity: {
        type: 'number',
        default: 100,
        min: 0,
        max: 100,
        label: 'Opacity %'
      },
      flow: {
        type: 'number',
        default: 100,
        min: 0,
        max: 100,
        label: 'Flow %'
      },
      smoothing: {
        type: 'number',
        default: 20,
        min: 0,
        max: 100,
        label: 'Smoothing %'
      },
      blendMode: {
        type: 'select',
        default: 'normal',
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'screen', label: 'Screen' },
          { value: 'overlay', label: 'Overlay' },
          { value: 'soft-light', label: 'Soft Light' },
          { value: 'color-dodge', label: 'Color Dodge' },
          { value: 'color-burn', label: 'Color Burn' }
        ],
        label: 'Blend Mode'
      },
      color: {
        type: 'color',
        default: '#000000',
        label: 'Brush Color'
      }
    };
  }
  
  protected createBrush(options: Record<string, any>): Brush {
    return new Brush({
      size: options.size,
      hardness: options.hardness / 100,
      opacity: options.opacity / 100,
      flow: options.flow / 100,
      color: this.hexToRgba(options.color),
      blendMode: options.blendMode,
      shape: this.createBrushShape(options.size, options.hardness / 100)
    });
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent() || !this.pixelBuffer) return;
    
    this.setState(ToolState.WORKING);
    this.isDrawing = true;
    this.lastPoint = { x: event.canvasX, y: event.canvasY };
    this.strokePath = [this.lastPoint];
    
    // Get pressure if available
    this.pressure = event.pressure || 1.0;
    
    // Apply initial dab
    const brush = this.createBrush(this.getAllOptions());
    brush.pressure = this.pressure;
    this.pixelBuffer.applyBrush(this.lastPoint, brush);
    this.updateCanvasPreview();
    
    // Start stroke
    this.dependencies.eventBus.emit('drawing.stroke.started', {
      toolId: this.id,
      point: this.lastPoint,
      pressure: this.pressure,
      timestamp: Date.now()
    });
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.lastPoint || !this.pixelBuffer) return;
    
    const currentPoint = { x: event.canvasX, y: event.canvasY };
    this.pressure = event.pressure || 1.0;
    
    // Apply smoothing
    const options = this.getAllOptions();
    const smoothedPoint = this.applySmoothing(currentPoint, options.smoothing / 100);
    
    // Draw line from last point to current
    const brush = this.createBrush(options);
    brush.pressure = this.pressure;
    
    // Calculate spacing based on brush size
    const spacing = Math.max(1, brush.size * 0.25);
    const distance = this.getDistance(this.lastPoint, smoothedPoint);
    const steps = Math.ceil(distance / spacing);
    
    // Draw dabs along the line
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: this.lastPoint.x + (smoothedPoint.x - this.lastPoint.x) * t,
        y: this.lastPoint.y + (smoothedPoint.y - this.lastPoint.y) * t
      };
      
      // Interpolate pressure
      const interpolatedPressure = this.lastPressure + (this.pressure - this.lastPressure) * t;
      brush.pressure = interpolatedPressure;
      
      this.pixelBuffer.applyBrush(point, brush);
    }
    
    this.strokePath.push(smoothedPoint);
    this.lastPoint = smoothedPoint;
    this.lastPressure = this.pressure;
    
    this.updateCanvasPreview();
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    this.commitDrawing();
    
    // Clear smoothing buffer
    this.smoothingBuffer = [];
    
    this.setState(ToolState.ACTIVE);
    
    // End stroke
    this.dependencies.eventBus.emit('drawing.stroke.ended', {
      toolId: this.id,
      strokePath: this.strokePath,
      timestamp: Date.now()
    });
  }
  
  private applySmoothing(point: Point, smoothingFactor: number): Point {
    if (smoothingFactor === 0) return point;
    
    this.smoothingBuffer.push(point);
    
    // Keep buffer size based on smoothing factor
    const bufferSize = Math.ceil(smoothingFactor * 10);
    if (this.smoothingBuffer.length > bufferSize) {
      this.smoothingBuffer.shift();
    }
    
    // Calculate weighted average
    let sumX = 0, sumY = 0, totalWeight = 0;
    this.smoothingBuffer.forEach((p, i) => {
      const weight = (i + 1) / this.smoothingBuffer.length;
      sumX += p.x * weight;
      sumY += p.y * weight;
      totalWeight += weight;
    });
    
    return {
      x: sumX / totalWeight,
      y: sumY / totalWeight
    };
  }
  
  private createBrushShape(size: number, hardness: number): Float32Array {
    const diameter = Math.ceil(size);
    const radius = diameter / 2;
    const shape = new Float32Array(diameter * diameter);
    
    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        const dx = x - radius + 0.5;
        const dy = y - radius + 0.5;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          // Calculate falloff based on hardness
          let value = 1.0;
          if (hardness < 1.0) {
            const falloffStart = radius * hardness;
            if (distance > falloffStart) {
              const falloffDistance = distance - falloffStart;
              const falloffRange = radius - falloffStart;
              value = 1.0 - (falloffDistance / falloffRange);
              value = value * value; // Quadratic falloff
            }
          }
          shape[y * diameter + x] = value;
        }
      }
    }
    
    return shape;
  }
}

export const brushToolRegistration: ToolRegistration = {
  id: 'brush',
  toolClass: BrushTool,
  metadata: {
    name: 'Brush Tool',
    description: 'Paint on images',
    icon: 'brush',
    shortcut: 'B',
    groupId: 'drawing-group',
    order: 1
  }
};
```

### 2. Marquee Rectangle Tool

```typescript
// lib/editor/tools/selection/marqueeRectTool.ts
export class MarqueeRectTool extends SelectionTool {
  private previewRect: Rect | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('marquee-rect', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      feather: {
        type: 'number',
        default: 0,
        min: 0,
        max: 100,
        label: 'Feather (px)'
      },
      antiAlias: {
        type: 'boolean',
        default: true,
        label: 'Anti-alias'
      },
      aspectRatio: {
        type: 'select',
        default: 'free',
        options: [
          { value: 'free', label: 'Free' },
          { value: '1:1', label: 'Square' },
          { value: '4:3', label: '4:3' },
          { value: '16:9', label: '16:9' },
          { value: 'fixed', label: 'Fixed Size' }
        ],
        label: 'Style'
      },
      fixedWidth: {
        type: 'number',
        default: 100,
        min: 1,
        max: 5000,
        label: 'Fixed Width',
        visible: (options) => options.aspectRatio === 'fixed'
      },
      fixedHeight: {
        type: 'number',
        default: 100,
        min: 1,
        max: 5000,
        label: 'Fixed Height',
        visible: (options) => options.aspectRatio === 'fixed'
      }
    };
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent()) return;
    
    this.setState(ToolState.WORKING);
    this.isSelecting = true;
    this.selectionStart = { x: event.canvasX, y: event.canvasY };
    
    // Start selection
    this.dependencies.eventBus.emit('selection.interaction.started', {
      toolId: this.id,
      point: this.selectionStart,
      mode: this.selectionMode,
      timestamp: Date.now()
    });
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isSelecting || !this.selectionStart) return;
    
    const current = { x: event.canvasX, y: event.canvasY };
    this.updateSelectionPreview(current);
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isSelecting || !this.previewRect) return;
    
    this.isSelecting = false;
    
    // Create selection mask
    this.selectionMask = this.createRectangularMask(this.previewRect);
    
    // Apply feathering if needed
    const options = this.getAllOptions();
    if (options.feather > 0) {
      this.selectionMask.applyFeather(options.feather);
    }
    
    // Apply anti-aliasing if needed
    if (options.antiAlias) {
      this.selectionMask.applyAntiAlias();
    }
    
    // Apply the selection
    this.applySelection();
    
    // Clear preview
    this.previewRect = null;
    this.clearSelectionPreview();
    
    this.setState(ToolState.ACTIVE);
    
    // End selection
    this.dependencies.eventBus.emit('selection.interaction.ended', {
      toolId: this.id,
      bounds: this.selectionMask.getBounds(),
      timestamp: Date.now()
    });
  }
  
  protected updateSelectionPreview(current: Point): void {
    if (!this.selectionStart) return;
    
    const options = this.getAllOptions();
    
    // Calculate rectangle
    let rect = {
      x: Math.min(this.selectionStart.x, current.x),
      y: Math.min(this.selectionStart.y, current.y),
      width: Math.abs(current.x - this.selectionStart.x),
      height: Math.abs(current.y - this.selectionStart.y)
    };
    
    // Apply aspect ratio constraints
    if (options.aspectRatio !== 'free') {
      rect = this.constrainAspectRatio(rect, options);
    }
    
    this.previewRect = rect;
    
    // Update canvas preview
    this.dependencies.canvasManager.setSelectionPreview({
      type: 'rectangle',
      bounds: rect,
      mode: this.selectionMode,
      feather: options.feather
    });
  }
  
  private constrainAspectRatio(rect: Rect, options: Record<string, any>): Rect {
    switch (options.aspectRatio) {
      case '1:1':
        const size = Math.min(rect.width, rect.height);
        return { ...rect, width: size, height: size };
        
      case '4:3':
        return this.applyRatio(rect, 4 / 3);
        
      case '16:9':
        return this.applyRatio(rect, 16 / 9);
        
      case 'fixed':
        return {
          x: rect.x,
          y: rect.y,
          width: options.fixedWidth,
          height: options.fixedHeight
        };
        
      default:
        return rect;
    }
  }
  
  private createRectangularMask(rect: Rect): SelectionMask {
    const mask = this.createSelectionMask(rect);
    
    // Fill the rectangle
    for (let y = 0; y < rect.height; y++) {
      for (let x = 0; x < rect.width; x++) {
        mask.setPixel(x, y, 255); // Full selection
      }
    }
    
    return mask;
  }
}

export const marqueeRectToolRegistration: ToolRegistration = {
  id: 'marquee-rect',
  toolClass: MarqueeRectTool,
  metadata: {
    name: 'Rectangular Marquee Tool',
    description: 'Make rectangular selections',
    icon: 'marquee-rect',
    shortcut: 'M',
    groupId: 'selection-group',
    order: 1
  }
};
```

### 3. Magic Wand Tool

```typescript
// lib/editor/tools/selection/magicWandTool.ts
export class MagicWandTool extends SelectionTool {
  private colorThreshold: number = 32;
  private contiguous: boolean = true;
  
  constructor(dependencies: ToolDependencies) {
    super('magic-wand', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      tolerance: {
        type: 'number',
        default: 32,
        min: 0,
        max: 255,
        label: 'Tolerance'
      },
      sampleSize: {
        type: 'select',
        default: 'point',
        options: [
          { value: 'point', label: 'Point Sample' },
          { value: '3x3', label: '3x3 Average' },
          { value: '5x5', label: '5x5 Average' },
          { value: '11x11', label: '11x11 Average' }
        ],
        label: 'Sample Size'
      },
      contiguous: {
        type: 'boolean',
        default: true,
        label: 'Contiguous'
      },
      sampleAllLayers: {
        type: 'boolean',
        default: false,
        label: 'Sample All Layers'
      }
    };
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent()) return;
    
    const point = { x: event.canvasX, y: event.canvasY };
    const options = this.getAllOptions();
    
    // Get color at click point
    const sampleColor = this.sampleColorAtPoint(point, options);
    if (!sampleColor) return;
    
    this.setState(ToolState.WORKING);
    
    // Create selection based on color similarity
    this.createColorBasedSelection(point, sampleColor, options);
    
    this.setState(ToolState.ACTIVE);
  }
  
  private sampleColorAtPoint(point: Point, options: Record<string, any>): Color | null {
    const objects = options.sampleAllLayers 
      ? this.dependencies.canvasManager.getAllObjects()
      : this.dependencies.selectionManager.getSelectedObjects();
    
    // Find topmost object at point
    const object = this.getObjectAtPoint(point, objects);
    if (!object || object.type !== 'image') return null;
    
    // Get pixel data
    const pixelBuffer = new PixelBuffer(
      object.data.imageData,
      object.width,
      object.height
    );
    
    // Convert canvas coordinates to object coordinates
    const localX = point.x - object.x;
    const localY = point.y - object.y;
    
    // Sample based on size
    switch (options.sampleSize) {
      case 'point':
        return pixelBuffer.getPixel(localX, localY);
        
      case '3x3':
        return this.sampleAverage(pixelBuffer, localX, localY, 3);
        
      case '5x5':
        return this.sampleAverage(pixelBuffer, localX, localY, 5);
        
      case '11x11':
        return this.sampleAverage(pixelBuffer, localX, localY, 11);
        
      default:
        return null;
    }
  }
  
  private createColorBasedSelection(
    startPoint: Point,
    targetColor: Color,
    options: Record<string, any>
  ): void {
    const tolerance = options.tolerance;
    const contiguous = options.contiguous;
    
    const objects = options.sampleAllLayers 
      ? this.dependencies.canvasManager.getAllObjects()
      : this.dependencies.selectionManager.getSelectedObjects();
    
    // Create selection mask
    const bounds = this.calculateSelectionBounds(objects);
    this.selectionMask = this.createSelectionMask(bounds);
    
    if (contiguous) {
      // Flood fill algorithm
      this.floodFillSelection(startPoint, targetColor, tolerance, objects);
    } else {
      // Select all similar colors
      this.selectAllSimilarColors(targetColor, tolerance, objects);
    }
    
    // Apply the selection
    this.applySelection();
  }
  
  private floodFillSelection(
    startPoint: Point,
    targetColor: Color,
    tolerance: number,
    objects: CanvasObject[]
  ): void {
    // Queue for flood fill
    const queue: Point[] = [startPoint];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const point = queue.shift()!;
      const key = `${Math.floor(point.x)},${Math.floor(point.y)}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      // Check if point is within any object
      for (const object of objects) {
        if (object.type !== 'image') continue;
        
        const localX = point.x - object.x;
        const localY = point.y - object.y;
        
        if (localX < 0 || localX >= object.width || 
            localY < 0 || localY >= object.height) continue;
        
        const pixelBuffer = new PixelBuffer(
          object.data.imageData,
          object.width,
          object.height
        );
        
        const pixelColor = pixelBuffer.getPixel(localX, localY);
        
        if (this.colorMatches(pixelColor, targetColor, tolerance)) {
          // Add to selection
          const maskX = point.x - this.selectionMask!.bounds.x;
          const maskY = point.y - this.selectionMask!.bounds.y;
          this.selectionMask!.setPixel(maskX, maskY, 255);
          
          // Add neighbors to queue
          queue.push({ x: point.x - 1, y: point.y });
          queue.push({ x: point.x + 1, y: point.y });
          queue.push({ x: point.x, y: point.y - 1 });
          queue.push({ x: point.x, y: point.y + 1 });
        }
      }
    }
  }
  
  private colorMatches(color1: Color, color2: Color, tolerance: number): boolean {
    const dr = Math.abs(color1.r - color2.r);
    const dg = Math.abs(color1.g - color2.g);
    const db = Math.abs(color1.b - color2.b);
    const da = Math.abs(color1.a - color2.a);
    
    return dr <= tolerance && dg <= tolerance && 
           db <= tolerance && da <= tolerance;
  }
}

export const magicWandToolRegistration: ToolRegistration = {
  id: 'magic-wand',
  toolClass: MagicWandTool,
  metadata: {
    name: 'Magic Wand Tool',
    description: 'Select by color',
    icon: 'magic-wand',
    shortcut: 'W',
    groupId: 'selection-group',
    order: 4
  }
};
```

## 🔌 Adapter Implementations

### Brush Adapter

```typescript
// lib/ai/adapters/tools/BrushAdapter.ts
export class BrushAdapter extends UnifiedToolAdapter<BrushInput, BrushOutput> {
  readonly toolId = 'brush';
  readonly aiName = 'paintWithBrush';
  readonly description = 'Paint on images with a brush. Specify color, size, and painting instructions like "paint a red heart" or "add blue strokes to the sky".';
  
  readonly inputSchema = z.object({
    color: z.string().describe('Color in hex format or color name'),
    size: z.number().min(1).max(500).optional().describe('Brush size in pixels'),
    opacity: z.number().min(0).max(100).optional().describe('Opacity percentage'),
    strokes: z.array(z.object({
      from: z.object({ x: z.number(), y: z.number() }),
      to: z.object({ x: z.number(), y: z.number() })
    })).optional().describe('Specific stroke paths'),
    pattern: z.enum(['dots', 'lines', 'scribble', 'fill']).optional()
  });
  
  async execute(params: BrushInput, context: CanvasContext): Promise<BrushOutput> {
    const imageObjects = context.targetObjects.filter(obj => obj.type === 'image');
    
    if (imageObjects.length === 0) {
      throw new Error('No image objects selected for painting');
    }
    
    // Activate brush tool
    await this.dependencies.toolStore.activateTool('brush');
    const tool = this.dependencies.toolStore.getActiveTool() as BrushTool;
    
    // Set brush options
    tool.setOption('color', this.parseColor(params.color));
    if (params.size) tool.setOption('size', params.size);
    if (params.opacity) tool.setOption('opacity', params.opacity);
    
    // Apply strokes or pattern
    if (params.strokes && params.strokes.length > 0) {
      await this.applyStrokes(tool, params.strokes);
    } else if (params.pattern) {
      await this.applyPattern(tool, params.pattern, imageObjects[0]);
    }
    
    return {
      success: true,
      paintedObjects: imageObjects.length,
      brushSettings: {
        color: params.color,
        size: params.size || tool.getOption('size'),
        opacity: params.opacity || tool.getOption('opacity')
      }
    };
  }
  
  private parseColor(color: string): string {
    // Handle color names
    const colorMap: Record<string, string> = {
      red: '#FF0000',
      green: '#00FF00',
      blue: '#0000FF',
      yellow: '#FFFF00',
      black: '#000000',
      white: '#FFFFFF',
      // Add more as needed
    };
    
    return colorMap[color.toLowerCase()] || color;
  }
}
```

### Selection Adapter

```typescript
// lib/ai/adapters/tools/CanvasSelectionManagerAdapter.ts
export class CanvasSelectionManagerAdapter extends UnifiedToolAdapter<SelectionInput, SelectionOutput> {
  readonly toolId = 'selection-manager';
  readonly aiName = 'createSelection';
  readonly description = 'Create selections on the canvas. Supports rectangular, elliptical, and color-based selections. Use terms like "select the sky", "select red areas", "select the center square".';
  
  readonly inputSchema = z.object({
    type: z.enum(['rectangle', 'ellipse', 'color', 'object']).optional(),
    area: z.enum(['all', 'center', 'top', 'bottom', 'left', 'right']).optional(),
    color: z.string().optional().describe('Color to select'),
    tolerance: z.number().min(0).max(255).optional(),
    bounds: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }).optional()
  });
  
  async execute(params: SelectionInput, context: CanvasContext): Promise<SelectionOutput> {
    let toolId: string;
    let selectionBounds: Rect;
    
    // Determine which selection tool to use
    if (params.type === 'color' || params.color) {
      toolId = 'magic-wand';
    } else if (params.type === 'ellipse') {
      toolId = 'marquee-ellipse';
    } else {
      toolId = 'marquee-rect';
    }
    
    // Activate appropriate tool
    await this.dependencies.toolStore.activateTool(toolId);
    
    if (params.color && toolId === 'magic-wand') {
      // Find areas matching the color
      const colorPoint = await this.findColorInCanvas(params.color, context);
      if (colorPoint) {
        // Simulate click at color location
        await this.simulateToolClick(colorPoint);
      }
    } else if (params.bounds) {
      // Use provided bounds
      selectionBounds = params.bounds;
      await this.createSelectionFromBounds(selectionBounds);
    } else if (params.area) {
      // Calculate bounds from area description
      selectionBounds = this.calculateAreaBounds(params.area, context);
      await this.createSelectionFromBounds(selectionBounds);
    }
    
    return {
      success: true,
      selectionType: toolId,
      bounds: selectionBounds || this.dependencies.selectionManager.getSelectionBounds(),
      pixelCount: this.dependencies.selectionManager.getSelectedPixelCount()
    };
  }
  
  private calculateAreaBounds(area: string, context: CanvasContext): Rect {
    const { width, height } = context.dimensions;
    
    switch (area) {
      case 'all':
        return { x: 0, y: 0, width, height };
        
      case 'center':
        const size = Math.min(width, height) * 0.5;
        return {
          x: (width - size) / 2,
          y: (height - size) / 2,
          width: size,
          height: size
        };
        
      case 'top':
        return { x: 0, y: 0, width, height: height / 2 };
        
      case 'bottom':
        return { x: 0, y: height / 2, width, height: height / 2 };
        
      case 'left':
        return { x: 0, y: 0, width: width / 2, height };
        
      case 'right':
        return { x: width / 2, y: 0, width: width / 2, height };
        
      default:
        return { x: 0, y: 0, width, height };
    }
  }
}
```

## 📋 Implementation Checklist

### Brush Tool
- [ ] Implement BrushTool class extending DrawingTool
- [ ] Create brush shape generation algorithm
- [ ] Implement pressure sensitivity support
- [ ] Add stroke smoothing algorithm
- [ ] Support multiple blend modes
- [ ] Implement spacing and flow controls
- [ ] Add color mixing capabilities
- [ ] Write comprehensive tests

### Eraser Tool
- [ ] Implement EraserTool class extending DrawingTool
- [ ] Support soft/hard eraser modes
- [ ] Add background color erasing
- [ ] Implement opacity-based erasing
- [ ] Support pressure sensitivity
- [ ] Write comprehensive tests

### Gradient Tool
- [ ] Implement GradientTool class extending DrawingTool
- [ ] Support linear gradients
- [ ] Support radial gradients
- [ ] Add angle gradient support
- [ ] Implement gradient editor
- [ ] Support multiple color stops
- [ ] Add gradient presets
- [ ] Write comprehensive tests

### Marquee Rectangle Tool
- [ ] Implement MarqueeRectTool class
- [ ] Support aspect ratio constraints
- [ ] Add feathering support
- [ ] Implement anti-aliasing
- [ ] Support fixed size selections
- [ ] Handle selection modes (add/subtract/intersect)
- [ ] Write comprehensive tests

### Marquee Ellipse Tool
- [ ] Implement MarqueeEllipseTool class
- [ ] Support circular constraints
- [ ] Add feathering support
- [ ] Implement anti-aliasing
- [ ] Support from-center drawing
- [ ] Write comprehensive tests

### Lasso Tool
- [ ] Implement LassoTool class
- [ ] Support freehand path drawing
- [ ] Add path smoothing
- [ ] Implement magnetic lasso mode
- [ ] Support polygonal lasso mode
- [ ] Add feathering support
- [ ] Write comprehensive tests

### Magic Wand Tool
- [ ] Implement MagicWandTool class
- [ ] Add color tolerance algorithm
- [ ] Support contiguous/non-contiguous modes
- [ ] Implement sample size options
- [ ] Add multi-layer sampling
- [ ] Support anti-aliasing
- [ ] Write comprehensive tests

### Quick Selection Tool
- [ ] Implement QuickSelectionTool class
- [ ] Add edge detection algorithm
- [ ] Support brush-based selection
- [ ] Implement auto-expand mode
- [ ] Add selection refinement
- [ ] Write comprehensive tests

### Adapters
- [ ] Implement BrushAdapter with natural language support
- [ ] Implement EraserAdapter with smart erasing
- [ ] Implement GradientAdapter with preset support
- [ ] Implement CanvasSelectionManagerAdapter
- [ ] Register all adapters in AdapterRegistry
- [ ] Write adapter tests

## 🧪 Testing Requirements

Each tool must have:
1. Pixel accuracy tests
2. Performance tests with large images
3. Selection combination tests
4. Undo/redo operation tests
5. Memory usage tests
6. Cross-browser compatibility tests

## 📚 Resources

- Foundation patterns: `docs/foundation.md`
- Pixel manipulation: `lib/editor/pixel/PixelBuffer.ts`
- Selection system: `lib/editor/selection/SelectionManager.ts`
- Drawing algorithms: `lib/editor/drawing/algorithms/`

---

Agent 2 is responsible for implementing these critical drawing and selection tools that enable precise pixel manipulation and selection creation. Follow the patterns established in the foundation document and ensure all implementations maintain senior-level architecture standards.