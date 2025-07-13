You are the senior product engineer responsible for implementing new features into our codebase. You must adhere 100% to existing patterns and architecture. We need 100% consistency and the most senior level of code. No hard coding css variables, no making assumptions, no inconsistent patterns. Deep dive the codebase and relevant files to learn the patterns that you need to replicate.

We are creating a browser-based, ai-native photoshop alternative with the granular controls of photoshop (direct pixel manipulations), with the ui/ux of figma (objectts), with the power of AI (agents/chat with ai sdk v5 and replicate cloud api calls).

Read docs/agent-1.md for your assignment and come up with a comprehensive plan AFTER deep diving the codebase.

# Agent 1: Navigation and Transform Tools Implementation

## 🎯 Mission Overview

Agent 1 is responsible for implementing the foundational navigation and transform tools that enable users to interact with the infinite canvas. These tools are critical for basic canvas manipulation and object transformation.

## 📋 Tools to Implement

### Navigation Tools
1. **Hand Tool** (`hand`) - Pan the infinite canvas
2. **Zoom Tool** (`zoom`) - Zoom in/out of the canvas
3. **Eyedropper Tool** (`eyedropper`) - Sample colors from canvas

### Transform Tools
1. **Move Tool** (`move`) - Transform objects (position, size, rotation)
2. **Crop Tool** (`crop`) - Non-destructive cropping of image objects
3. **Rotate Tool** (`rotate`) - Rotate objects with precision
4. **Flip Tool** (`flip`) - Flip objects horizontally/vertically

## 🏗️ Implementation Guide

### Base Classes to Extend

```typescript
// Navigation tools extend NavigationTool
import { NavigationTool } from 'lib/editor/tools/base/NavigationTool';

// Transform tools extend TransformTool
import { TransformTool } from 'lib/editor/tools/base/TransformTool';
```

### NavigationTool Base Class

```typescript
// lib/editor/tools/base/NavigationTool.ts
export abstract class NavigationTool extends BaseTool {
  protected cursor: string = 'default';
  protected isNavigating: boolean = false;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Set cursor
    canvas.setCursor(this.cursor);
    
    // Navigation tools are always ready
    this.setState(ToolState.ACTIVE);
  }
  
  async onDeactivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Reset cursor
    canvas.setCursor('default');
    
    // Clean up
    this.isNavigating = false;
    
    this.setState(ToolState.INACTIVE);
  }
}
```

### TransformTool Base Class

```typescript
// lib/editor/tools/base/TransformTool.ts
export abstract class TransformTool extends BaseTool {
  protected transformHandles: TransformHandle[] = [];
  protected activeHandle: TransformHandle | null = null;
  protected transformOrigin: Point = { x: 0.5, y: 0.5 };
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Subscribe to selection changes
    const unsubscribe = this.dependencies.eventBus.on('selection.changed', (data) => {
      this.updateTransformHandles(data.selectedObjects);
    });
    this.registerCleanup(unsubscribe);
    
    // Show transform handles for current selection
    const selection = this.dependencies.selectionManager.getSelectedObjects();
    this.updateTransformHandles(selection);
    
    this.setState(ToolState.ACTIVE);
  }
  
  protected abstract updateTransformHandles(objects: CanvasObject[]): void;
}
```

## 🛠️ Tool Implementations

### 1. Hand Tool

```typescript
// lib/editor/tools/navigation/handTool.ts
export class HandTool extends NavigationTool {
  protected cursor = 'grab';
  private startPan: Point | null = null;
  private startCamera: Point | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('hand', dependencies);
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent()) return;
    
    this.isNavigating = true;
    this.startPan = { x: event.x, y: event.y };
    this.startCamera = this.dependencies.canvasManager.getCamera();
    
    // Change cursor to grabbing
    this.dependencies.canvasManager.setCursor('grabbing');
    
    // Emit pan start event
    this.dependencies.eventBus.emit('canvas.pan.started', {
      position: this.startCamera,
      timestamp: Date.now()
    });
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isNavigating || !this.startPan || !this.startCamera) return;
    
    const deltaX = event.x - this.startPan.x;
    const deltaY = event.y - this.startPan.y;
    
    const newCamera = {
      x: this.startCamera.x - deltaX,
      y: this.startCamera.y - deltaY
    };
    
    // Update camera position
    this.dependencies.canvasManager.setCamera(newCamera);
    
    // Emit pan event
    this.dependencies.eventBus.emit('canvas.pan.changed', {
      position: newCamera,
      delta: { x: deltaX, y: deltaY },
      timestamp: Date.now()
    });
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isNavigating) return;
    
    this.isNavigating = false;
    this.startPan = null;
    this.startCamera = null;
    
    // Restore cursor
    this.dependencies.canvasManager.setCursor('grab');
    
    // Emit pan end event
    this.dependencies.eventBus.emit('canvas.pan.ended', {
      position: this.dependencies.canvasManager.getCamera(),
      timestamp: Date.now()
    });
  }
  
  // Support spacebar temporary activation
  onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space' && !this.isNavigating) {
      this.dependencies.eventBus.emit('tool.temporary.requested', {
        toolId: 'hand',
        timestamp: Date.now()
      });
    }
  }
}

// Register with metadata
export const handToolRegistration: ToolRegistration = {
  id: 'hand',
  toolClass: HandTool,
  metadata: {
    name: 'Hand Tool',
    description: 'Pan the canvas',
    icon: 'hand',
    shortcut: 'H',
    groupId: 'navigation-group',
    order: 1
  }
};
```

### 2. Zoom Tool

```typescript
// lib/editor/tools/navigation/zoomTool.ts
export class ZoomTool extends NavigationTool {
  protected cursor = 'zoom-in';
  private zoomMode: 'in' | 'out' = 'in';
  
  constructor(dependencies: ToolDependencies) {
    super('zoom', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      zoomStep: {
        type: 'number',
        default: 0.1,
        min: 0.01,
        max: 0.5,
        label: 'Zoom Step'
      },
      smoothZoom: {
        type: 'boolean',
        default: true,
        label: 'Smooth Zoom'
      }
    };
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent()) return;
    
    const options = this.getAllOptions();
    const currentZoom = this.dependencies.canvasManager.getZoom();
    const zoomStep = options.zoomStep;
    
    const newZoom = this.zoomMode === 'in' 
      ? currentZoom * (1 + zoomStep)
      : currentZoom * (1 - zoomStep);
    
    // Zoom towards mouse position
    const zoomPoint = { x: event.canvasX, y: event.canvasY };
    
    if (options.smoothZoom) {
      this.animateZoom(currentZoom, newZoom, zoomPoint);
    } else {
      this.dependencies.canvasManager.setZoom(newZoom, zoomPoint);
    }
    
    // Emit zoom event
    this.dependencies.eventBus.emit('canvas.zoom.changed', {
      zoom: newZoom,
      center: zoomPoint,
      timestamp: Date.now()
    });
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Alt key toggles zoom out mode
    if (event.altKey) {
      this.zoomMode = 'out';
      this.dependencies.canvasManager.setCursor('zoom-out');
    }
  }
  
  onKeyUp(event: KeyboardEvent): void {
    if (!event.altKey && this.zoomMode === 'out') {
      this.zoomMode = 'in';
      this.dependencies.canvasManager.setCursor('zoom-in');
    }
  }
  
  private animateZoom(fromZoom: number, toZoom: number, center: Point): void {
    const duration = 200; // ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentZoom = fromZoom + (toZoom - fromZoom) * easeProgress;
      
      this.dependencies.canvasManager.setZoom(currentZoom, center);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
}

export const zoomToolRegistration: ToolRegistration = {
  id: 'zoom',
  toolClass: ZoomTool,
  metadata: {
    name: 'Zoom Tool',
    description: 'Zoom in/out of the canvas',
    icon: 'zoom',
    shortcut: 'Z',
    groupId: 'navigation-group',
    order: 2
  }
};
```

### 3. Move Tool

```typescript
// lib/editor/tools/transform/moveTool.ts
export class MoveTool extends TransformTool {
  private dragStart: Point | null = null;
  private originalTransforms: Map<string, Transform> = new Map();
  private isTransforming = false;
  
  constructor(dependencies: ToolDependencies) {
    super('move', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      constrainProportions: {
        type: 'boolean',
        default: false,
        label: 'Constrain Proportions'
      },
      snapToGrid: {
        type: 'boolean',
        default: false,
        label: 'Snap to Grid'
      },
      gridSize: {
        type: 'number',
        default: 10,
        min: 1,
        max: 100,
        label: 'Grid Size'
      }
    };
  }
  
  protected updateTransformHandles(objects: CanvasObject[]): void {
    this.transformHandles = [];
    
    if (objects.length === 0) return;
    
    // Calculate bounding box
    const bounds = this.calculateBounds(objects);
    
    // Create 8 handles (corners + edges)
    this.transformHandles = [
      // Corners
      { type: 'nw', x: bounds.x, y: bounds.y, cursor: 'nw-resize' },
      { type: 'ne', x: bounds.x + bounds.width, y: bounds.y, cursor: 'ne-resize' },
      { type: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'se-resize' },
      { type: 'sw', x: bounds.x, y: bounds.y + bounds.height, cursor: 'sw-resize' },
      // Edges
      { type: 'n', x: bounds.x + bounds.width / 2, y: bounds.y, cursor: 'n-resize' },
      { type: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, cursor: 'e-resize' },
      { type: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, cursor: 's-resize' },
      { type: 'w', x: bounds.x, y: bounds.y + bounds.height / 2, cursor: 'w-resize' },
      // Rotation handle
      { type: 'rotate', x: bounds.x + bounds.width / 2, y: bounds.y - 30, cursor: 'rotate' }
    ];
    
    // Render handles
    this.renderHandles();
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent()) return;
    
    const point = { x: event.canvasX, y: event.canvasY };
    
    // Check if clicking on a handle
    this.activeHandle = this.getHandleAtPoint(point);
    
    if (this.activeHandle) {
      this.startTransformWithHandle(point);
    } else {
      // Check if clicking on an object
      const object = this.getObjectAtPoint(point);
      if (object) {
        this.startMove(point, object);
      }
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isTransforming || !this.dragStart) return;
    
    const point = { x: event.canvasX, y: event.canvasY };
    const delta = {
      x: point.x - this.dragStart.x,
      y: point.y - this.dragStart.y
    };
    
    if (this.activeHandle) {
      this.updateTransformWithHandle(point, delta);
    } else {
      this.updateMove(delta);
    }
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isTransforming) return;
    
    // Create command for the transformation
    const transforms: Transform[] = [];
    const selectedObjects = this.dependencies.selectionManager.getSelectedObjects();
    
    selectedObjects.forEach(obj => {
      const original = this.originalTransforms.get(obj.id);
      if (original) {
        transforms.push({
          objectId: obj.id,
          before: original,
          after: {
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            rotation: obj.rotation
          }
        });
      }
    });
    
    if (transforms.length > 0) {
      // Use the factory to create a composite command to batch the updates
      const updateCommands = transforms.map(t => 
        this.dependencies.commandFactory.createUpdateObjectCommand(t.objectId, t.after)
      );
      
      const command = this.dependencies.commandFactory.createCompositeCommand(
        'Transform Objects', 
        updateCommands
      );
      
      // Use the command manager to execute
      this.dependencies.commandManager.execute(command);
    }
    
    // Reset state
    this.isTransforming = false;
    this.dragStart = null;
    this.activeHandle = null;
    this.originalTransforms.clear();
  }
  
  private startMove(point: Point, object: CanvasObject): void {
    this.setState(ToolState.WORKING);
    this.isTransforming = true;
    this.dragStart = point;
    
    // Store original transforms
    const selectedObjects = this.dependencies.selectionManager.getSelectedObjects();
    selectedObjects.forEach(obj => {
      this.originalTransforms.set(obj.id, {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation
      });
    });
    
    // Select object if not already selected
    if (!selectedObjects.find(obj => obj.id === object.id)) {
      this.dependencies.selectionManager.selectObject(object.id);
    }
  }
  
  private updateMove(delta: Point): void {
    const options = this.getAllOptions();
    const selectedObjects = this.dependencies.selectionManager.getSelectedObjects();
    
    selectedObjects.forEach(obj => {
      const original = this.originalTransforms.get(obj.id);
      if (original) {
        let newX = original.x + delta.x;
        let newY = original.y + delta.y;
        
        // Apply grid snapping if enabled
        if (options.snapToGrid) {
          newX = Math.round(newX / options.gridSize) * options.gridSize;
          newY = Math.round(newY / options.gridSize) * options.gridSize;
        }
        
        // Update object position (preview)
        this.dependencies.canvasManager.updateObjectPreview(obj.id, {
          x: newX,
          y: newY
        });
      }
    });
  }
}

export const moveToolRegistration: ToolRegistration = {
  id: 'move',
  toolClass: MoveTool,
  metadata: {
    name: 'Move Tool',
    description: 'Move and transform objects',
    icon: 'move',
    shortcut: 'V',
    groupId: 'transform-group',
    order: 1,
    isDefault: true // Default tool for the app
  }
};
```

### 4. Crop Tool

```typescript
// lib/editor/tools/transform/cropTool.ts
export class CropTool extends TransformTool {
  private cropBounds: Rect | null = null;
  private originalBounds: Map<string, Rect> = new Map();
  private isDragging = false;
  private dragHandle: string | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('crop', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      aspectRatio: {
        type: 'select',
        default: 'free',
        options: [
          { value: 'free', label: 'Free' },
          { value: '1:1', label: 'Square (1:1)' },
          { value: '4:3', label: 'Standard (4:3)' },
          { value: '16:9', label: 'Widescreen (16:9)' },
          { value: '9:16', label: 'Portrait (9:16)' },
          { value: 'custom', label: 'Custom' }
        ],
        label: 'Aspect Ratio'
      },
      customRatio: {
        type: 'string',
        default: '1:1',
        label: 'Custom Ratio',
        visible: (options) => options.aspectRatio === 'custom'
      },
      deletePixels: {
        type: 'boolean',
        default: false,
        label: 'Delete Cropped Pixels'
      }
    };
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    await super.onActivate(canvas);
    
    // Only crop image objects
    const selectedObjects = this.dependencies.selectionManager.getSelectedObjects();
    const imageObjects = selectedObjects.filter(obj => obj.type === 'image');
    
    if (imageObjects.length === 0) {
      // Show message and switch to move tool
      this.dependencies.eventBus.emit('notification.show', {
        type: 'info',
        message: 'Please select an image to crop',
        duration: 3000
      });
      
      this.dependencies.eventBus.emit('tool.activation.requested', {
        toolId: 'move',
        timestamp: Date.now()
      });
      return;
    }
    
    // Initialize crop bounds to first image
    const image = imageObjects[0];
    this.cropBounds = {
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height
    };
    
    // Store original bounds
    imageObjects.forEach(img => {
      this.originalBounds.set(img.id, {
        x: img.x,
        y: img.y,
        width: img.width,
        height: img.height
      });
    });
    
    // Show crop overlay
    this.showCropOverlay();
  }
  
  async onDeactivate(canvas: CanvasManager): Promise<void> {
    // Hide crop overlay
    this.hideCropOverlay();
    
    // Clear state
    this.cropBounds = null;
    this.originalBounds.clear();
    
    await super.onDeactivate(canvas);
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvent() || !this.cropBounds) return;
    
    const point = { x: event.canvasX, y: event.canvasY };
    
    // Check if clicking on crop handle
    this.dragHandle = this.getCropHandleAtPoint(point);
    if (this.dragHandle) {
      this.isDragging = true;
      this.dragStart = point;
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isDragging || !this.dragStart || !this.cropBounds) return;
    
    const point = { x: event.canvasX, y: event.canvasY };
    const delta = {
      x: point.x - this.dragStart.x,
      y: point.y - this.dragStart.y
    };
    
    // Update crop bounds based on handle
    const newBounds = this.calculateNewCropBounds(this.dragHandle!, delta);
    
    // Apply aspect ratio constraint
    const options = this.getAllOptions();
    if (options.aspectRatio !== 'free') {
      this.constrainAspectRatio(newBounds, options.aspectRatio);
    }
    
    this.cropBounds = newBounds;
    this.updateCropOverlay();
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.dragHandle = null;
    this.dragStart = null;
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.applyCrop();
    } else if (event.key === 'Escape') {
      this.cancelCrop();
    }
  }
  
  private applyCrop(): void {
    if (!this.cropBounds) return;
    
    const selectedObjects = this.dependencies.selectionManager.getSelectedObjects();
    const imageObjects = selectedObjects.filter(obj => obj.type === 'image');
    const options = this.getAllOptions();
    
    // Create crop command via the factory
    // NOTE FOR EXECUTOR: This requires adding a `createCropCommand` method to CommandFactory.ts
    const command = this.dependencies.commandFactory.createCropCommand(
      imageObjects,
      this.cropBounds,
      {
        deletePixels: options.deletePixels,
        originalBounds: this.originalBounds
      }
    );
    
    this.dependencies.commandManager.execute(command);
    
    // Switch back to move tool
    this.dependencies.eventBus.emit('tool.activation.requested', {
      toolId: 'move',
      timestamp: Date.now()
    });
  }
  
  private cancelCrop(): void {
    // Restore original bounds
    this.originalBounds.forEach((bounds, objectId) => {
      this.dependencies.canvasManager.updateObjectPreview(objectId, bounds);
    });
    
    // Switch back to move tool
    this.dependencies.eventBus.emit('tool.activation.requested', {
      toolId: 'move',
      timestamp: Date.now()
    });
  }
}

export const cropToolRegistration: ToolRegistration = {
  id: 'crop',
  toolClass: CropTool,
  metadata: {
    name: 'Crop Tool',
    description: 'Crop images',
    icon: 'crop',
    shortcut: 'C',
    groupId: 'transform-group',
    order: 2
  }
};
```

## 🔌 Adapter Implementations

### Move Adapter

```typescript
// lib/ai/adapters/tools/MoveAdapter.ts
export class MoveAdapter extends UnifiedToolAdapter<MoveInput, MoveOutput> {
  readonly toolId = 'move';
  readonly aiName = 'moveObject';
  readonly description = 'Move objects to a new position. Accepts relative movements like "left", "right", "up", "down" or absolute coordinates.';
  
  readonly inputSchema = z.object({
    direction: z.enum(['left', 'right', 'up', 'down', 'center']).optional(),
    distance: z.number().optional().describe('Distance in pixels'),
    x: z.number().optional().describe('Absolute X position'),
    y: z.number().optional().describe('Absolute Y position'),
    align: z.enum(['left', 'right', 'top', 'bottom', 'center', 'middle']).optional()
  });
  
  async execute(params: MoveInput, context: CanvasContext): Promise<MoveOutput> {
    const targetObjects = this.requireSelection(context);
    
    // Calculate new positions
    const transforms = targetObjects.map(obj => {
      const newPosition = this.calculateNewPosition(obj, params, context);
      return {
        objectId: obj.id,
        before: { x: obj.x, y: obj.y },
        after: newPosition
      };
    });
    
    // Create and execute command using the factory and manager
    const updateCommands = transforms.map(t => 
      this.dependencies.commandFactory.createUpdateObjectCommand(t.objectId, t.after)
    );
    const command = this.dependencies.commandFactory.createCompositeCommand(
      'Move Objects',
      updateCommands
    );
    
    await this.dependencies.commandManager.execute(command);
    
    return {
      success: true,
      movedObjects: transforms.length,
      finalPositions: transforms.map(t => ({
        objectId: t.objectId,
        x: t.after.x,
        y: t.after.y
      }))
    };
  }
  
  private calculateNewPosition(
    object: CanvasObject,
    params: MoveInput,
    context: CanvasContext
  ): Point {
    // Absolute positioning
    if (params.x !== undefined && params.y !== undefined) {
      return { x: params.x, y: params.y };
    }
    
    // Relative movement
    if (params.direction && params.distance) {
      const distance = params.distance;
      switch (params.direction) {
        case 'left': return { x: object.x - distance, y: object.y };
        case 'right': return { x: object.x + distance, y: object.y };
        case 'up': return { x: object.x, y: object.y - distance };
        case 'down': return { x: object.x, y: object.y + distance };
        case 'center': {
          const canvasCenter = {
            x: context.dimensions.width / 2,
            y: context.dimensions.height / 2
          };
          return {
            x: canvasCenter.x - object.width / 2,
            y: canvasCenter.y - object.height / 2
          };
        }
      }
    }
    
    // Alignment
    if (params.align) {
      return this.calculateAlignmentPosition(object, params.align, context);
    }
    
    // No change
    return { x: object.x, y: object.y };
  }
}
```

### Crop Adapter

```typescript
// lib/ai/adapters/tools/CropAdapter.ts
export class CropAdapter extends UnifiedToolAdapter<CropInput, CropOutput> {
  readonly toolId = 'crop';
  readonly aiName = 'cropImage';
  readonly description = 'Crop images to specific dimensions or aspect ratios. Supports presets like "square", "16:9", etc.';
  
  readonly inputSchema = z.object({
    aspectRatio: z.string().optional().describe('Aspect ratio like "16:9" or "square"'),
    width: z.number().optional().describe('Crop width in pixels'),
    height: z.number().optional().describe('Crop height in pixels'),
    position: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
    preset: z.enum(['square', 'portrait', 'landscape', 'instagram', 'twitter']).optional()
  });
  
  async execute(params: CropInput, context: CanvasContext): Promise<CropOutput> {
    const imageObjects = context.targetObjects.filter(obj => obj.type === 'image');
    
    if (imageObjects.length === 0) {
      throw new Error('No image objects selected for cropping');
    }
    
    // Activate crop tool
    await this.dependencies.toolStore.activateTool('crop');
    
    // Set crop options
    const tool = this.dependencies.toolStore.getActiveTool() as CropTool;
    
    if (params.preset) {
      const presetRatio = this.getPresetAspectRatio(params.preset);
      tool.setOption('aspectRatio', presetRatio);
    } else if (params.aspectRatio) {
      tool.setOption('aspectRatio', params.aspectRatio);
    }
    
    // Calculate crop bounds
    const cropBounds = this.calculateCropBounds(imageObjects[0], params);
    
    // Execute crop using the factory and manager
    // NOTE FOR EXECUTOR: This requires adding a `createCropCommand` method to CommandFactory.ts
    const command = this.dependencies.commandFactory.createCropCommand(
      imageObjects,
      cropBounds,
      { deletePixels: false }
    );
    
    await this.dependencies.commandManager.execute(command);
    
    return {
      success: true,
      croppedObjects: imageObjects.length,
      newDimensions: {
        width: cropBounds.width,
        height: cropBounds.height
      }
    };
  }
}
```

## 📋 Implementation Checklist

### Hand Tool
- [ ] Implement HandTool class extending NavigationTool
- [ ] Handle mouse drag for panning
- [ ] Support spacebar temporary activation
- [ ] Implement smooth panning with momentum
- [ ] Add cursor management (grab/grabbing)
- [ ] Emit pan events for other components
- [ ] Write comprehensive tests

### Zoom Tool
- [ ] Implement ZoomTool class extending NavigationTool
- [ ] Handle click to zoom in/out
- [ ] Support Alt key for zoom out mode
- [ ] Implement smooth zoom animation
- [ ] Add zoom constraints (min/max)
- [ ] Support scroll wheel zoom (optional)
- [ ] Write comprehensive tests

### Eyedropper Tool
- [ ] Implement EyedropperTool class extending NavigationTool
- [ ] Sample color from canvas on click
- [ ] Show color preview while hovering
- [ ] Support sampling from all object types
- [ ] Emit color selected event
- [ ] Update color in appropriate stores
- [ ] Write comprehensive tests

### Move Tool
- [ ] Implement MoveTool class extending TransformTool
- [ ] Create transform handles for selection
- [ ] Handle object movement with drag
- [ ] Support resize with corner/edge handles
- [ ] Implement rotation with rotation handle
- [ ] Add grid snapping option
- [ ] Support multi-object transformation
- [ ] Write comprehensive tests

### Crop Tool
- [ ] Implement CropTool class extending TransformTool
- [ ] Show crop overlay for image objects
- [ ] Handle crop area adjustment
- [ ] Support aspect ratio constraints
- [ ] Implement crop preview
- [ ] Add Enter/Escape keyboard shortcuts
- [ ] Support non-destructive cropping
- [ ] Write comprehensive tests

### Rotate Tool
- [ ] Implement RotateTool class extending TransformTool
- [ ] Show rotation UI with angle indicator
- [ ] Support precise angle input
- [ ] Add 15° snapping with Shift key
- [ ] Implement rotation preview
- [ ] Support batch rotation
- [ ] Write comprehensive tests

### Flip Tool
- [ ] Implement FlipTool class extending TransformTool
- [ ] Support horizontal flip
- [ ] Support vertical flip
- [ ] Handle multi-object flipping
- [ ] Maintain object relationships
- [ ] Write comprehensive tests

### Adapters
- [ ] Implement MoveAdapter with natural language support
- [ ] Implement CropAdapter with preset support
- [ ] Implement RotateAdapter with angle parsing
- [ ] Implement FlipAdapter with direction parsing
- [ ] Register all adapters in AdapterRegistry
- [ ] Write adapter tests

## 🧪 Testing Requirements

Each tool must have:
1. Unit tests for all public methods
2. Integration tests with canvas
3. Event emission tests
4. State machine transition tests
5. Error handling tests
6. Performance tests for large selections

## 📚 Resources

- Foundation patterns: `docs/foundation.md`
- Event system: `lib/events/core/TypedEventBus.ts`
- Command examples: `lib/editor/commands/`
- Canvas API: `lib/editor/canvas/CanvasManager.ts`

---

Agent 1 is responsible for implementing these foundational tools that enable basic canvas interaction. Follow the patterns established in the foundation document and ensure all implementations maintain senior-level architecture standards.

## ✅ FINAL REVIEW: APPROVED

The work for Agent 1 has been reviewed and is **approved**.

The agent successfully addressed the architectural violation in `MoveToolEnhanced.ts`. The public methods now correctly use the `CommandManager` to execute transformations, ensuring that all state changes are properly tracked in the application's history.

This implementation now meets our architectural and quality standards. It can serve as a reference for other agents.