# Frame Tool: Photoshop-like Artboards

## Executive Summary

**Goal:** Implement Photoshop-like artboards/frames that create defined work areas within the infinite canvas, enabling focused design work and easy export of specific compositions.

**Core Concept:** Frames are visual boundaries that define export regions while allowing free object movement in and out of frame bounds. Users can have multiple frames per canvas (logo + business card) and export each frame independently.

**Foundation:** Built on the completed events/stores architecture with object-based domain model, dependency injection, and command pattern.

## 🎯 **Frame Behavior**

### **Core Functionality**
- **Visual Boundaries**: Frames show as subtle borders on canvas with optional background
- **Export Boundaries**: Export crops content to frame bounds only
- **Free Movement**: Objects can move freely in/out of frames
- **Multiple Frames**: Support multiple frames per canvas
- **Preset Sizes**: Common formats (Instagram Post, Business Card, A4, etc.)

### **Export Behavior**
```typescript
interface FrameExportBehavior {
  // Only content within frame bounds is exported
  cropToFrame: true;
  
  // Objects partially outside frame are cropped at frame boundary
  clipOverflow: true;
  
  // Frame background is included in export (if not transparent)
  includeBackground: boolean;
  
  // Export dimensions match frame dimensions exactly
  outputDimensions: { width: frameWidth, height: frameHeight };
}
```

### **Auto-Frame Creation**
**Triggers:**
- **Open image in new workspace** → Create frame matching image dimensions
- **Drag first image to empty canvas** → Create frame around image
- **Generate first image to empty canvas** → Create frame for generated image
- **Subsequent images** → No auto-frame (user controls framing)

**Auto-Frame Logic:**
```typescript
interface AutoFrameConfig {
  enabled: boolean;
  matchImageSize: boolean;
  centerImage: boolean;
  addPadding: number; // Optional padding around image
}

class AutoFrameHandler {
  shouldCreateFrame(action: 'open' | 'drag' | 'generate'): boolean {
    return this.canvasManager.isEmpty() && this.config.enabled;
  }
  
  createAutoFrame(image: ImageObject): FrameObject {
    const dimensions = this.config.matchImageSize 
      ? { width: image.width, height: image.height }
      : this.getDefaultFrameSize();
      
    return {
      type: 'frame',
      x: this.calculateCenterX(dimensions.width),
      y: this.calculateCenterY(dimensions.height),
      width: dimensions.width,
      height: dimensions.height,
      style: {
        fill: 'transparent',
        stroke: { color: '#999', width: 1, style: 'dashed' }
      },
      metadata: { isAutoFrame: true }
    };
  }
}
```

## 🏗️ **Architecture Implementation**

### **Frame Object Model**
```typescript
interface FrameObject extends CanvasObject {
  type: 'frame';
  
  // Frame-specific properties
  preset?: string; // 'instagram-post', 'business-card', etc.
  exportName?: string; // Custom name for exports
  
  // Visual styling
  style: {
    fill: string | 'transparent';
    stroke: {
      color: string;
      width: number;
      style: 'solid' | 'dashed';
    };
    background?: {
      color: string;
      opacity: number;
    };
  };
  
  // Export configuration
  export: {
    format: 'png' | 'jpeg' | 'webp';
    quality: number;
    dpi: number;
  };
}
```

### **Frame Tool Implementation**
```typescript
class FrameTool extends BaseTool<FrameToolOptions> {
  id = 'frame';
  name = 'Frame Tool';
  cursor = 'crosshair';
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies);
    this.presetManager = new FramePresetManager();
    this.autoFrameHandler = new AutoFrameHandler(dependencies.canvasManager);
  }
  
  protected getOptionDefinitions(): FrameToolOptions {
    return {
      preset: {
        type: 'enum',
        default: 'custom',
        enum: ['custom', 'instagram-post', 'business-card', 'a4-portrait', 'web-banner'],
        description: 'Frame preset size'
      },
      fill: {
        type: 'color',
        default: 'transparent',
        description: 'Frame background color'
      },
      stroke: {
        type: 'object',
        default: { color: '#999', width: 1, style: 'dashed' },
        description: 'Frame border style'
      }
    };
  }
  
  protected handleMouseDown(event: ToolEvent): void {
    if (this.options.preset === 'custom') {
      this.startFrameCreation(event.point);
    } else {
      this.createPresetFrame(event.point);
    }
  }
  
  protected handleMouseMove(event: ToolEvent): void {
    if (this.state === ToolState.WORKING) {
      this.updateFramePreview(event.point);
    }
  }
  
  protected handleMouseUp(event: ToolEvent): void {
    this.finalizeFrameCreation();
  }
  
  private createPresetFrame(position: Point): void {
    const preset = this.presetManager.getPreset(this.options.preset);
    const command = new CreateFrameCommand(
      this.dependencies.canvasManager,
      {
        ...preset,
        x: position.x,
        y: position.y,
        style: {
          fill: this.options.fill,
          stroke: this.options.stroke
        }
      }
    );
    
    this.executeCommand(command);
  }
}
```

### **Frame Preset System**
```typescript
interface FramePreset {
  name: string;
  width: number;
  height: number;
  category: 'social' | 'print' | 'web' | 'document';
  dpi?: number;
}

class FramePresetManager {
  private presets: Map<string, FramePreset> = new Map([
    ['instagram-post', { 
      name: 'Instagram Post', 
      width: 1080, 
      height: 1080, 
      category: 'social' 
    }],
    ['instagram-story', { 
      name: 'Instagram Story', 
      width: 1080, 
      height: 1920, 
      category: 'social' 
    }],
    ['business-card', { 
      name: 'Business Card', 
      width: 1050, 
      height: 600, 
      category: 'print',
      dpi: 300 
    }],
    ['a4-portrait', { 
      name: 'A4 Portrait', 
      width: 2480, 
      height: 3508, 
      category: 'document',
      dpi: 300 
    }],
    ['web-banner', { 
      name: 'Web Banner', 
      width: 1920, 
      height: 600, 
      category: 'web' 
    }]
  ]);
  
  getPreset(id: string): FramePreset | null {
    return this.presets.get(id) || null;
  }
  
  getPresetsByCategory(category: string): FramePreset[] {
    return Array.from(this.presets.values())
      .filter(preset => preset.category === category);
  }
}
```

### **Frame Export System**
```typescript
class FrameExporter {
  constructor(
    private canvasManager: CanvasManager,
    private exportManager: ExportManager
  ) {}
  
  async exportFrame(frameId: string, options?: ExportOptions): Promise<Blob> {
    const frame = this.canvasManager.getObject(frameId) as FrameObject;
    if (!frame || frame.type !== 'frame') {
      throw new Error('Invalid frame object');
    }
    
    // Get all objects that intersect with frame bounds
    const frameObjects = this.canvasManager.getObjectsInBounds({
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height
    });
    
    // Export with frame dimensions as crop bounds
    return this.exportManager.exportRegion({
      bounds: {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height
      },
      objects: frameObjects,
      format: options?.format || frame.export.format,
      quality: options?.quality || frame.export.quality,
      dpi: options?.dpi || frame.export.dpi,
      background: frame.style.fill !== 'transparent' ? frame.style.fill : undefined
    });
  }
}
```

## 🎨 **User Experience**

### **Frame Creation Workflow**
1. **Select Frame Tool** → Tool activates with preset options
2. **Choose Preset** → Select "Instagram Post" or "Custom"
3. **Create Frame** → Click-drag for custom, click for preset
4. **Style Frame** → Adjust background, border in options panel
5. **Design Content** → Add objects inside/outside frame freely
6. **Export Frame** → Right-click frame → "Export Instagram Post"

### **Multi-Frame Workflow**
1. **Create Instagram Post Frame** → Design social media content
2. **Create Business Card Frame** → Design business card on same canvas
3. **Create Logo Frame** → Design logo that works in both contexts
4. **Export All** → Export each frame independently

### **Auto-Frame Workflow**
1. **Open Image** → Frame automatically created around image
2. **Adjust Frame** → Resize frame or change preset if needed
3. **Add Content** → Add text, graphics within frame
4. **Export** → Export frame with all content

## 🔧 **Implementation Plan**

### **Phase 1: Core Frame Tool**
- [ ] Implement FrameTool extending BaseTool
- [ ] Add CreateFrameCommand and UpdateFrameCommand
- [ ] Implement frame rendering with Konva
- [ ] Add basic frame styling (fill, stroke)

### **Phase 2: Preset System**
- [ ] Implement FramePresetManager
- [ ] Add preset options to tool panel
- [ ] Create preset creation workflow
- [ ] Add preset categories and filtering

### **Phase 3: Auto-Frame Creation**
- [ ] Implement AutoFrameHandler
- [ ] Hook into image import workflows
- [ ] Add user preferences for auto-frame
- [ ] Test auto-frame creation scenarios

### **Phase 4: Export Integration**
- [ ] Implement FrameExporter
- [ ] Add frame export commands to context menu
- [ ] Integrate with existing export system
- [ ] Add frame-specific export options

### **Phase 5: Polish & Testing**
- [ ] Add frame snapping and alignment
- [ ] Implement frame duplication
- [ ] Add frame templates and styles
- [ ] Comprehensive testing across workflows

## 🎯 **Success Criteria**

- **Frame Creation**: Users can create frames via presets or custom drawing
- **Auto-Frame**: Images automatically get frames when appropriate
- **Export**: Frame export crops content to frame bounds exactly
- **Multi-Frame**: Multiple frames work independently on same canvas
- **Integration**: Frames work seamlessly with existing object system
- **Performance**: Frame operations are smooth and responsive

This implementation provides Photoshop-like artboard functionality while maintaining the infinite canvas flexibility and object-based architecture.