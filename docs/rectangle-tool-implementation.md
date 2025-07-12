# Frame Tool: Standalone Implementation Plan

## Executive Summary

**Primary Goal:** Implement a powerful, standalone Frame Tool that bridges infinite canvas flexibility with document-like functionality, enabling users to create backgrounds, frames, and document boundaries.

**Foundation:** This implementation builds on the completed [Events & Stores Migration](./events-stores-migration.md) and provides the foundation for all subsequent tool refactors.

**Core Innovation:** This Frame Tool serves dual purposes:
1. **Shape Creation**: Standard rectangular frame drawing with fills, strokes, and effects
2. **Canvas Framing**: Create frame boundaries within the infinite canvas for composition and export

**User Experience:** Users can create frames through multiple workflows:
- **Direct Drawing**: Click and drag to create custom frames
- **Preset Selection**: Choose from common frame sizes (A4, Instagram, etc.)
- **Custom Presets**: Save and reuse custom dimensions and styles
- **Background Creation**: One-click background creation for compositions
- **Auto-Frame**: Automatic frame creation when first image is added to empty canvas

## 🚨 **CRITICAL: Object-Based Architecture**

**IMPORTANT**: This tool implements the **Object-based architecture** from day one, serving as the reference implementation for all subsequent tools.

### **Object-Based Design Principles:**
```typescript
// ✅ NEW: Object-based frame creation
interface FrameObject extends CanvasObject {
  type: 'frame'
  geometry: {
    position: Point
    dimensions: Size
    rotation: number
  }
  style: {
    fill: FillStyle
    stroke: StrokeStyle
    effects: Effect[]
  }
  metadata: {
    isBackground: boolean
    preset?: string
    customName?: string
  }
}

// ✅ NEW: Object-based operations
createFrameObject(properties: FrameProperties): FrameObject
updateFrameObject(objectId: string, updates: Partial<FrameObject>): void
groupObjects(objectIds: string[]): GroupObject
```

## Frame Behavior & Clipping

### **Frame Clipping System**

**Question**: Do frames clip content?
**Answer**: **Optional Clipping** - Frames can clip content but don't have to.

```typescript
interface FrameObject extends CanvasObject {
  // ... existing properties ...
  clipping: {
    enabled: boolean;           // Whether frame clips content
    showOverflow: boolean;      // Show content outside frame on canvas
    exportClipped: boolean;     // Export only clipped content
  }
}
```

**Clipping Behavior:**
- **Canvas View**: Content outside frames is **always visible** on infinite canvas
- **Frame Clipping**: When enabled, content is visually clipped within frame bounds
- **Export Behavior**: Only clipped content is included in exports
- **Overflow Indication**: Visual indicators show when content extends beyond frame

**Example Scenarios:**
1. **Image extends beyond frame**: Image visible on canvas, clipped in export
2. **Text flows outside frame**: Text readable on canvas, cropped in export  
3. **Objects moved off frame**: Objects still selectable/editable on canvas

### **Auto-Frame Creation Logic**

**Simple Rule**: Create frame automatically only when canvas is empty and first content is added.

```typescript
interface AutoFrameConfig {
  triggers: {
    openPhoto: boolean;        // Opening a photo file
    dragImage: boolean;        // Dragging image to empty canvas
    generateImage: boolean;    // AI image generation on empty canvas
  };
  behavior: {
    matchImageSize: boolean;   // Frame matches image dimensions
    addPadding: number;        // Optional padding around image
    centerImage: boolean;      // Center image within frame
  };
}

class AutoFrameHandler {
  shouldCreateFrame(action: 'open' | 'drag' | 'generate'): boolean {
    return (
      this.canvasManager.isEmpty() && 
      this.autoFrameConfig.triggers[action]
    );
  }
  
  async createAutoFrame(image: ImageObject): Promise<FrameObject> {
    const frameDimensions = this.autoFrameConfig.behavior.matchImageSize 
      ? image.dimensions 
      : this.getDefaultFrameSize();
      
    return this.frameCreator.createFrame({
      dimensions: frameDimensions,
      position: this.calculateCenterPosition(frameDimensions),
      style: this.getDefaultFrameStyle(),
      metadata: { isBackground: true, preset: 'auto' }
    });
  }
}
```

**Auto-Frame Triggers:**
- ✅ **Open photo**: Creates frame matching photo size
- ✅ **Drag image to empty canvas**: Creates frame around image
- ✅ **AI generate image on empty canvas**: Creates frame for generated image
- ❌ **Additional images**: No additional frames created
- ❌ **Images on non-empty canvas**: No auto-frame

**User Control:**
- **Click image + "Create Frame"**: Manual frame creation from selected image
- **Frame presets**: Choose different size frame for existing image
- **Disable auto-frame**: User preference to turn off auto-frame behavior

## File Operations & Export System

### **🎯 Two-Tier File System**

The application uses a **two-tier approach** to handle different user needs:

#### **1. Project Files (Complete State)**
**Purpose**: Save and restore the entire application state
**File Extension**: `.fotofun`
**Contains**:
- ✅ **All Canvas Objects**: Every object on the infinite canvas
- ✅ **AI Chat History**: Complete conversation with agents
- ✅ **Tool Settings**: Current tool options and presets
- ✅ **Viewport State**: Current zoom level and pan position
- ✅ **Selection State**: Currently selected objects
- ✅ **Frame Definitions**: All frames and their properties
- ✅ **Project Metadata**: Creation date, last modified, version

**Operations**:
- **Save Project** (`Cmd+S`): Quick save, no dialog needed
- **Open Project** (`Cmd+O`): Restore complete application state
- **Auto-save**: Every 30 seconds (configurable)
- **Crash Recovery**: Automatic recovery on restart

#### **2. Export Files (Image Output)**
**Purpose**: Create image files for sharing and publishing
**File Extensions**: `.png`, `.jpeg`, `.webp`, `.pdf`
**Contains**: Rendered pixels of selected content

**Export Types**:
- **Export Selection**: Only selected objects
- **Export Frame**: Frame boundary + all objects within (with optional clipping)
- **Export Canvas**: Entire infinite canvas content
- **Export Group**: Grouped objects as single unit

### **🎨 User-Friendly File Operations UX**

#### **🔥 One-Click Actions (Most Common)**

```typescript
// Smart defaults eliminate dialogs for common operations
interface QuickActions {
  saveProject: 'Cmd+S';           // No dialog, just save
  exportSelection: 'Cmd+E';       // PNG with transparency
  newProject: 'Cmd+N';            // Clear canvas, keep chat
  openRecent: 'Cmd+R';            // Quick access menu
}
```

#### **📁 Streamlined File Menu**

```
File
├── New Project (Cmd+N)          // Clear canvas, keep AI chat
├── Open Project... (Cmd+O)      // Browse for .fotofun files
├── Open Recent ▶                // Last 10 projects with thumbnails
│   ├── Instagram Post.fotofun
│   ├── Web Banner.fotofun
│   └── Clear Recent
├── ─────────────────────────────
├── Save Project (Cmd+S)         // Quick save, no dialog
├── Save As... (Cmd+Shift+S)     // Choose location and name
├── ─────────────────────────────
├── Export ▶
│   ├── Selection (Cmd+E)        // Quick export selected objects
│   ├── Frame...                 // Export frame with options
│   ├── Canvas...                // Export entire canvas
│   └── Custom Region...         // Define export area
├── ─────────────────────────────
├── Import Image... (Cmd+I)      // Add image to canvas
└── Import from URL...           // Add image from web
```

#### **🚀 Smart Export System**

**Export Selection (Most Common)**:
```typescript
interface SmartExportDefaults {
  // If objects are selected
  selection: {
    format: 'PNG';                // Preserves transparency
    quality: 'high';              // 100% quality
    bounds: 'tight';              // Crop to object bounds
    background: 'transparent';    // No background
    naming: 'project-selection-timestamp';
  };
  
  // If frame is selected
  frame: {
    format: 'PNG' | 'JPEG';       // Based on frame content
    quality: 'optimized';         // 90% quality
    bounds: 'frame';              // Use frame dimensions
    clipping: 'optional';         // User choice in dialog
    naming: 'project-frame-name-timestamp';
  };
}
```

**Built-in Export Presets**:
```typescript
interface ExportPresets {
  // Social Media
  'instagram-post': { width: 1080, height: 1080, format: 'JPEG', quality: 90 };
  'instagram-story': { width: 1080, height: 1920, format: 'JPEG', quality: 90 };
  'twitter-header': { width: 1500, height: 500, format: 'JPEG', quality: 85 };
  
  // Web
  'web-banner': { width: 1920, height: 600, format: 'JPEG', quality: 85 };
  'hero-image': { width: 1920, height: 1080, format: 'JPEG', quality: 90 };
  'thumbnail': { width: 400, height: 300, format: 'JPEG', quality: 80 };
  
  // Print
  'business-card': { width: 1050, height: 600, format: 'PNG', dpi: 300 };
  'letter-size': { width: 2550, height: 3300, format: 'PNG', dpi: 300 };
  'poster': { width: 4200, height: 5940, format: 'PNG', dpi: 300 };
  
  // Development
  'retina-display': { scale: 2, format: 'PNG', quality: 100 };
  'web-optimized': { maxWidth: 1200, format: 'WebP', quality: 85 };
}
```

#### **💡 Intelligent Behavior**

**Auto-Frame Creation**:
- ✅ **Opening with photo**: Creates frame matching photo dimensions
- ✅ **Dragging in first image**: Creates frame around image
- ✅ **AI generating first image**: Creates frame if none exist
- ❌ **Additional images**: No auto-frame (user controls framing)

**Smart Format Selection**:
```typescript
interface FormatIntelligence {
  // Automatic format selection based on content
  hasTransparency: 'PNG';        // Preserves alpha channel
  isPhotographic: 'JPEG';        // Better compression for photos
  isGraphicDesign: 'PNG';        // Sharp edges and text
  isModernBrowser: 'WebP';       // Best compression and quality
  isPrintOutput: 'PNG';          // Lossless for print quality
}
```

**Smart Naming**:
```typescript
interface SmartNaming {
  project: 'project-name.fotofun';
  export: 'project-name-export-2024-01-15-14-30.png';
  frame: 'project-name-instagram-post.jpg';
  selection: 'project-name-selection.png';
}
```

#### **🎯 Frame-Specific Export Features**

**Frame Export Options**:
```typescript
interface FrameExportOptions {
  // Content handling
  clipping: 'enabled' | 'disabled';     // Clip content to frame bounds
  overflow: 'show' | 'hide';            // Handle objects outside frame
  background: 'frame' | 'transparent';  // Use frame background or transparent
  
  // Quality options
  preset: 'instagram-post' | 'web-banner' | 'custom';
  format: 'PNG' | 'JPEG' | 'WebP';
  quality: number;                       // 1-100 for lossy formats
  
  // Advanced
  padding: number;                       // Add padding around frame
  scale: number;                         // Scale factor for export
  dpi: number;                          // For print outputs
}
```

**Frame Clipping Behavior**:
- **Clipping Enabled**: Only content within frame bounds is exported
- **Clipping Disabled**: Frame acts as reference, all objects exported
- **Overflow Visible**: Objects outside frame are shown in export
- **Background Handling**: Frame background can be included or made transparent

#### **🔄 Project Workflow**

**Typical User Journey**:
```
1. Create New Project (Cmd+N)
   ↓
2. Add/Generate Content
   ↓ (Auto-frame created if first image)
3. Design and Edit
   ↓ (Auto-save every 30 seconds)
4. Export for Sharing (Cmd+E)
   ↓
5. Save Project (Cmd+S)
```

**Advanced Workflow**:
```
1. Open Recent Project (Cmd+R)
   ↓
2. Create Frame with Preset (Frame Tool → Instagram Post)
   ↓
3. Design within Frame
   ↓
4. Export Frame (Frame → Export → Instagram Post preset)
   ↓
5. Create Another Frame (Business Card preset)
   ↓
6. Export Multiple Formats
   ↓
7. Save Project with All Frames
```

#### **🛡️ Safety & Recovery**

**Auto-save System**:
- **Frequency**: Every 30 seconds (configurable)
- **Storage**: Browser IndexedDB + optional cloud sync
- **Recovery**: Automatic recovery dialog on restart after crash
- **Versioning**: Keep last 10 auto-save versions

**Export Safety**:
- **Preview**: Live preview in export dialog
- **Validation**: Check for empty selections or invalid dimensions
- **Error Handling**: Graceful fallbacks for export failures
- **Progress**: Progress indicators for large exports

**File Handling**:
- **Unsaved Changes**: Warning dialog before closing
- **Large Files**: Progress indicators and cancellation
- **Memory Management**: Automatic cleanup of temporary exports
- **Format Support**: Fallbacks for unsupported formats

This two-tier system provides the **flexibility of infinite canvas** while maintaining **familiar document workflows** through frames, giving users the best of both worlds.

## Tool Architecture Overview

### **1. 🎯 Tool Classification: First Tool (Top-Left Position)**

**Why First Tool:**
- **Primary Functionality**: Essential for document creation and framing workflows
- **User Workflow**: Most users start by creating a frame/document boundary
- **Visual Prominence**: Deserves top-left position as foundational tool
- **Workflow Integration**: Central to all design workflows

**Standalone Power Tool Features:**
- **Unique Functionality**: Combines shape creation with canvas framing
- **Complex UI**: Requires dedicated options panel with presets
- **Foundation Tool**: Essential for canvas organization and export workflows

**Power Tool Features:**
- **Preset System**: Extensible preset library with user customization
- **Style Engine**: Advanced fill, stroke, and effect capabilities
- **Smart Guides**: Alignment and snapping for precise placement
- **Batch Operations**: Create multiple rectangles with consistent styling

### **2. 🏗️ Component Architecture**

```typescript
// Tool Structure
FrameTool/
├── core/
│   ├── FrameTool.ts                  // Main tool implementation
│   ├── FrameCreator.ts               // Frame creation logic
│   ├── FrameEditor.ts                // Frame editing logic
│   └── FrameRenderer.ts              // Visual rendering
├── presets/
│   ├── PresetManager.ts              // Preset management
│   ├── FramePresets.ts               // Built-in frame presets
│   ├── CustomPresets.ts              // User custom presets
│   └── PresetStorage.ts              // Preset persistence
├── styles/
│   ├── FillStyleManager.ts           // Fill style management
│   ├── StrokeStyleManager.ts         // Stroke style management
│   └── EffectManager.ts              // Effect management
├── ui/
│   ├── FrameOptionsPanel.tsx         // Main options panel
│   ├── PresetSelector.tsx            // Preset selection UI
│   ├── StyleEditor.tsx               // Style editing UI
│   └── QuickActions.tsx              // Quick action buttons
└── commands/
    ├── CreateFrameCommand.ts         // Create frame command
    ├── UpdateFrameCommand.ts         // Update frame command
    └── CreateBackgroundCommand.ts    // Background creation command
```

## Core Implementation Plan

### **Phase 1: Foundation Architecture (Days 1-2)**

#### **Step 1.1: Core Tool Implementation**

```typescript
// lib/editor/tools/shapes/FrameTool.ts
export interface FrameToolOptions extends ToolOptions {
  fill: {
    type: 'solid' | 'gradient' | 'pattern' | 'none';
    color: string;
    gradient?: GradientDefinition;
    pattern?: PatternDefinition;
    opacity: number;
  };
  stroke: {
    enabled: boolean;
    color: string;
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
    opacity: number;
  };
  effects: {
    dropShadow: DropShadowEffect;
    innerShadow: InnerShadowEffect;
    glow: GlowEffect;
  };
  behavior: {
    maintainAspectRatio: boolean;
    snapToGrid: boolean;
    smartGuides: boolean;
  };
}

export class FrameTool extends BaseTool<FrameToolOptions> {
  id = 'frame';
  name = 'Frame';
  icon = FrameIcon;
  cursor = 'crosshair';
  shortcut = 'F';
  
  // Tool state
  private isDrawing = false;
  private startPoint: Point | null = null;
  private currentFrame: FrameObject | null = null;
  private previewFrame: FramePreview | null = null;
  
  // Managers
  private frameCreator: FrameCreator;
  private frameEditor: FrameEditor;
  private frameRenderer: FrameRenderer;
  private presetManager: PresetManager;
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies);
    this.initializeManagers();
  }
  
  protected getOptionDefinitions(): FrameToolOptions {
    return {
      fill: {
        type: { type: 'enum', enum: ['solid', 'gradient', 'pattern', 'none'], default: 'solid' },
        color: { type: 'color', default: '#3B82F6' },
        opacity: { type: 'number', min: 0, max: 1, default: 1 }
      },
      stroke: {
        enabled: { type: 'boolean', default: true },
        color: { type: 'color', default: '#1F2937' },
        width: { type: 'number', min: 0, max: 50, default: 2 },
        style: { type: 'enum', enum: ['solid', 'dashed', 'dotted'], default: 'solid' },
        opacity: { type: 'number', min: 0, max: 1, default: 1 }
      },
      effects: {
        dropShadow: {
          enabled: { type: 'boolean', default: false },
          offsetX: { type: 'number', default: 4 },
          offsetY: { type: 'number', default: 4 },
          blur: { type: 'number', min: 0, max: 50, default: 8 },
          color: { type: 'color', default: '#00000040' }
        }
      },
      behavior: {
        maintainAspectRatio: { type: 'boolean', default: false },
        snapToGrid: { type: 'boolean', default: true },
        smartGuides: { type: 'boolean', default: true }
      }
    };
  }
  
  protected setupTool(): void {
    this.setupEventListeners();
    this.initializePresets();
  }
  
  protected cleanupTool(): void {
    this.clearPreview();
    this.removeEventListeners();
  }
  
  // Mouse event handlers
  protected handleMouseDown(event: ToolEvent): void {
    const canvas = this.requireCanvas();
    const point = canvas.screenToCanvas(event.point);
    
    // Check if clicking on existing rectangle for editing
    const existingRect = this.findRectangleAtPoint(point);
    if (existingRect) {
      this.startEditingRectangle(existingRect, point);
      return;
    }
    
    // Start creating new rectangle
    this.startCreatingRectangle(point);
  }
  
  protected handleMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.startPoint) return;
    
    const canvas = this.requireCanvas();
    const currentPoint = canvas.screenToCanvas(event.point);
    
    // Update preview rectangle
    this.updatePreview(this.startPoint, currentPoint, event.modifiers);
  }
  
  protected handleMouseUp(event: ToolEvent): void {
    if (!this.isDrawing || !this.startPoint) return;
    
    const canvas = this.requireCanvas();
    const endPoint = canvas.screenToCanvas(event.point);
    
    // Create final rectangle
    this.finishCreatingRectangle(this.startPoint, endPoint, event.modifiers);
  }
  
  // Rectangle creation workflow
  private startCreatingRectangle(point: Point): void {
    this.isDrawing = true;
    this.startPoint = point;
    this.setState(ToolState.WORKING, 'Creating rectangle');
    
    this.emitToolEvent({
      type: 'rectangle.creation.started',
      point,
      timestamp: Date.now()
    });
  }
  
  private updatePreview(startPoint: Point, currentPoint: Point, modifiers: KeyboardModifiers): void {
    const rect = this.calculateRectangle(startPoint, currentPoint, modifiers);
    
    // Update preview rendering
    this.previewRect = this.rectangleRenderer.createPreview(rect, this.options);
    
    // Emit preview update for UI
    this.emitToolEvent({
      type: 'rectangle.preview.updated',
      rectangle: rect,
      timestamp: Date.now()
    });
  }
  
  private finishCreatingRectangle(startPoint: Point, endPoint: Point, modifiers: KeyboardModifiers): void {
    const rect = this.calculateRectangle(startPoint, endPoint, modifiers);
    
    // Validate minimum size
    if (rect.dimensions.width < 1 || rect.dimensions.height < 1) {
      this.cancelCreation();
      return;
    }
    
    // Create rectangle object
    const rectangleObject = this.rectangleCreator.createRectangle(rect, this.options);
    
    // Execute create command
    const command = new CreateRectangleCommand(
      'Create rectangle',
      this.dependencies.commandContext,
      { rectangle: rectangleObject }
    );
    
    this.executeCommand(command);
    
    // Cleanup
    this.finishCreation();
  }
  
  private calculateRectangle(startPoint: Point, endPoint: Point, modifiers: KeyboardModifiers): RectangleGeometry {
    let width = Math.abs(endPoint.x - startPoint.x);
    let height = Math.abs(endPoint.y - startPoint.y);
    
    // Handle aspect ratio constraint
    if (modifiers.shift || this.options.behavior.maintainAspectRatio) {
      const size = Math.min(width, height);
      width = size;
      height = size;
    }
    
    // Calculate position (top-left corner)
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    
    // Apply snapping if enabled
    const position = this.options.behavior.snapToGrid 
      ? this.snapToGrid({ x, y })
      : { x, y };
    
    return {
      position,
      dimensions: { width, height },
      rotation: 0
    };
  }
  
  // Preset integration
  async createFromPreset(presetId: string): Promise<void> {
    const preset = await this.presetManager.getPreset(presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);
    
    // Get canvas center for placement
    const canvas = this.requireCanvas();
    const center = canvas.getViewportCenter();
    
    // Create rectangle from preset
    const rectangleObject = this.rectangleCreator.createFromPreset(preset, center);
    
    // Execute create command
    const command = new CreateRectangleCommand(
      `Create ${preset.name} rectangle`,
      this.dependencies.commandContext,
      { rectangle: rectangleObject, preset: preset.id }
    );
    
    this.executeCommand(command);
    
    this.emitToolEvent({
      type: 'rectangle.created.from.preset',
      preset: preset.id,
      rectangle: rectangleObject,
      timestamp: Date.now()
    });
  }
  
  // Background creation
  async createBackground(preset?: DocumentPreset): Promise<void> {
    const canvas = this.requireCanvas();
    
    // Determine background size
    const dimensions = preset 
      ? preset.dimensions 
      : this.calculateBackgroundSize();
    
    // Create background rectangle
    const backgroundObject = this.rectangleCreator.createBackground(dimensions, this.options);
    
    // Execute create background command
    const command = new CreateBackgroundCommand(
      'Create background',
      this.dependencies.commandContext,
      { background: backgroundObject, preset: preset?.id }
    );
    
    this.executeCommand(command);
    
    this.emitToolEvent({
      type: 'background.created',
      background: backgroundObject,
      preset: preset?.id,
      timestamp: Date.now()
    });
  }
  
  private calculateBackgroundSize(): Size {
    const canvas = this.requireCanvas();
    const viewport = canvas.getViewportBounds();
    
    // Create background slightly larger than viewport
    return {
      width: Math.ceil(viewport.width * 1.2),
      height: Math.ceil(viewport.height * 1.2)
    };
  }
  
  // Utility methods
  private findRectangleAtPoint(point: Point): RectangleObject | null {
    const canvas = this.requireCanvas();
    const objects = canvas.getObjectsAtPoint(point);
    return objects.find(obj => obj.type === 'rectangle') as RectangleObject || null;
  }
  
  private snapToGrid(point: Point): Point {
    const gridSize = 10; // TODO: Get from canvas settings
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }
  
  private clearPreview(): void {
    if (this.previewRect) {
      this.rectangleRenderer.clearPreview(this.previewRect);
      this.previewRect = null;
    }
  }
  
  private cancelCreation(): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.clearPreview();
    this.setState(ToolState.ACTIVE, 'Creation cancelled');
  }
  
  private finishCreation(): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.clearPreview();
    this.setState(ToolState.ACTIVE, 'Rectangle created');
  }
}
```

#### **Step 1.2: Rectangle Creator Service**

```typescript
// lib/editor/tools/shapes/core/RectangleCreator.ts
export class RectangleCreator {
  constructor(
    private objectManager: ObjectManager,
    private styleManager: StyleManager
  ) {}
  
  createRectangle(geometry: RectangleGeometry, options: RectangleToolOptions): RectangleObject {
    const rectangleObject: RectangleObject = {
      id: nanoid(),
      type: 'rectangle',
      position: geometry.position,
      dimensions: geometry.dimensions,
      rotation: geometry.rotation,
      geometry,
      style: this.createStyle(options),
      metadata: {
        isBackground: false,
        createdAt: Date.now(),
        createdBy: 'rectangle-tool'
      },
      properties: {
        visible: true,
        locked: false,
        opacity: 1
      },
      parent: null,
      children: []
    };
    
    return rectangleObject;
  }
  
  createFromPreset(preset: DocumentPreset, position: Point): RectangleObject {
    const geometry: RectangleGeometry = {
      position: {
        x: position.x - preset.dimensions.width / 2,
        y: position.y - preset.dimensions.height / 2
      },
      dimensions: preset.dimensions,
      rotation: 0
    };
    
    const rectangleObject = this.createRectangle(geometry, preset.style);
    rectangleObject.metadata.preset = preset.id;
    rectangleObject.metadata.customName = preset.name;
    
    return rectangleObject;
  }
  
  createBackground(dimensions: Size, options: RectangleToolOptions): RectangleObject {
    const geometry: RectangleGeometry = {
      position: { x: -dimensions.width / 2, y: -dimensions.height / 2 },
      dimensions,
      rotation: 0
    };
    
    const rectangleObject = this.createRectangle(geometry, options);
    rectangleObject.metadata.isBackground = true;
    rectangleObject.metadata.customName = 'Background';
    
    // Background-specific styling
    rectangleObject.style.stroke.enabled = false;
    rectangleObject.properties.locked = true; // Prevent accidental editing
    
    return rectangleObject;
  }
  
  private createStyle(options: RectangleToolOptions): RectangleStyle {
    return {
      fill: this.createFillStyle(options.fill),
      stroke: this.createStrokeStyle(options.stroke),
      effects: this.createEffects(options.effects)
    };
  }
  
  private createFillStyle(fillOptions: RectangleToolOptions['fill']): FillStyle {
    switch (fillOptions.type) {
      case 'solid':
        return {
          type: 'solid',
          color: fillOptions.color,
          opacity: fillOptions.opacity
        };
      case 'gradient':
        return {
          type: 'gradient',
          gradient: fillOptions.gradient!,
          opacity: fillOptions.opacity
        };
      case 'pattern':
        return {
          type: 'pattern',
          pattern: fillOptions.pattern!,
          opacity: fillOptions.opacity
        };
      case 'none':
        return {
          type: 'none'
        };
      default:
        throw new Error(`Unknown fill type: ${fillOptions.type}`);
    }
  }
  
  private createStrokeStyle(strokeOptions: RectangleToolOptions['stroke']): StrokeStyle {
    return {
      enabled: strokeOptions.enabled,
      color: strokeOptions.color,
      width: strokeOptions.width,
      style: strokeOptions.style,
      opacity: strokeOptions.opacity
    };
  }
  
  private createEffects(effectOptions: RectangleToolOptions['effects']): Effect[] {
    const effects: Effect[] = [];
    
    if (effectOptions.dropShadow.enabled) {
      effects.push({
        type: 'drop-shadow',
        offsetX: effectOptions.dropShadow.offsetX,
        offsetY: effectOptions.dropShadow.offsetY,
        blur: effectOptions.dropShadow.blur,
        color: effectOptions.dropShadow.color
      });
    }
    
    // Add other effects as enabled
    
    return effects;
  }
}
```

### **Phase 2: Preset System (Days 3-4)**

#### **Step 2.1: Document Presets**

```typescript
// lib/editor/tools/shapes/presets/DocumentPresets.ts
export interface DocumentPreset {
  id: string;
  name: string;
  category: 'document' | 'social' | 'print' | 'web' | 'mobile' | 'custom';
  dimensions: Size;
  dpi?: number;
  orientation: 'portrait' | 'landscape';
  style: RectangleToolOptions;
  description?: string;
  tags: string[];
  isBuiltIn: boolean;
}

export class DocumentPresets {
  static readonly BUILT_IN_PRESETS: DocumentPreset[] = [
    // Document Formats
    {
      id: 'a4-portrait',
      name: 'A4 Portrait',
      category: 'document',
      dimensions: { width: 595, height: 842 }, // 210×297mm at 72 DPI
      dpi: 300,
      orientation: 'portrait',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: true, color: '#E5E7EB', width: 1, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: false, smartGuides: true }
      },
      description: 'Standard A4 document (210×297mm)',
      tags: ['document', 'standard', 'print'],
      isBuiltIn: true
    },
    {
      id: 'a4-landscape',
      name: 'A4 Landscape',
      category: 'document',
      dimensions: { width: 842, height: 595 },
      dpi: 300,
      orientation: 'landscape',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: true, color: '#E5E7EB', width: 1, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: false, smartGuides: true }
      },
      description: 'Standard A4 document landscape (297×210mm)',
      tags: ['document', 'standard', 'print', 'landscape'],
      isBuiltIn: true
    },
    {
      id: 'letter-portrait',
      name: 'US Letter Portrait',
      category: 'document',
      dimensions: { width: 612, height: 792 }, // 8.5×11" at 72 DPI
      dpi: 300,
      orientation: 'portrait',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: true, color: '#E5E7EB', width: 1, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: false, smartGuides: true }
      },
      description: 'US Letter document (8.5×11")',
      tags: ['document', 'us', 'letter', 'print'],
      isBuiltIn: true
    },
    
    // Social Media Formats
    {
      id: 'instagram-post',
      name: 'Instagram Post',
      category: 'social',
      dimensions: { width: 1080, height: 1080 },
      dpi: 72,
      orientation: 'portrait',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: false, color: '#000000', width: 0, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: true, smartGuides: true }
      },
      description: 'Instagram square post (1080×1080px)',
      tags: ['social', 'instagram', 'square', 'post'],
      isBuiltIn: true
    },
    {
      id: 'instagram-story',
      name: 'Instagram Story',
      category: 'social',
      dimensions: { width: 1080, height: 1920 },
      dpi: 72,
      orientation: 'portrait',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: false, color: '#000000', width: 0, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: true, smartGuides: true }
      },
      description: 'Instagram story (1080×1920px)',
      tags: ['social', 'instagram', 'story', 'vertical'],
      isBuiltIn: true
    },
    {
      id: 'twitter-post',
      name: 'Twitter Post',
      category: 'social',
      dimensions: { width: 1200, height: 675 },
      dpi: 72,
      orientation: 'landscape',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: false, color: '#000000', width: 0, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: true, smartGuides: true }
      },
      description: 'Twitter post image (1200×675px)',
      tags: ['social', 'twitter', 'post', 'horizontal'],
      isBuiltIn: true
    },
    {
      id: 'facebook-cover',
      name: 'Facebook Cover',
      category: 'social',
      dimensions: { width: 1200, height: 630 },
      dpi: 72,
      orientation: 'landscape',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: false, color: '#000000', width: 0, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: true, smartGuides: true }
      },
      description: 'Facebook cover photo (1200×630px)',
      tags: ['social', 'facebook', 'cover', 'banner'],
      isBuiltIn: true
    },
    
    // Print Formats
    {
      id: 'business-card',
      name: 'Business Card',
      category: 'print',
      dimensions: { width: 252, height: 144 }, // 3.5×2" at 72 DPI
      dpi: 300,
      orientation: 'landscape',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: true, color: '#CCCCCC', width: 1, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: false, smartGuides: true }
      },
      description: 'Standard business card (3.5×2")',
      tags: ['print', 'business', 'card', 'standard'],
      isBuiltIn: true
    },
    {
      id: 'poster-a3',
      name: 'A3 Poster',
      category: 'print',
      dimensions: { width: 842, height: 1191 }, // A3 at 72 DPI
      dpi: 300,
      orientation: 'portrait',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: true, color: '#E5E7EB', width: 2, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: false, smartGuides: true }
      },
      description: 'A3 poster (297×420mm)',
      tags: ['print', 'poster', 'a3', 'large'],
      isBuiltIn: true
    },
    
    // Web Formats
    {
      id: 'web-banner',
      name: 'Web Banner',
      category: 'web',
      dimensions: { width: 728, height: 90 },
      dpi: 72,
      orientation: 'landscape',
      style: {
        fill: { type: 'solid', color: '#F3F4F6', opacity: 1 },
        stroke: { enabled: true, color: '#D1D5DB', width: 1, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: true, smartGuides: true }
      },
      description: 'Standard web banner (728×90px)',
      tags: ['web', 'banner', 'ad', 'horizontal'],
      isBuiltIn: true
    },
    {
      id: 'web-hero',
      name: 'Hero Section',
      category: 'web',
      dimensions: { width: 1920, height: 1080 },
      dpi: 72,
      orientation: 'landscape',
      style: {
        fill: { type: 'gradient', gradient: {
          type: 'linear',
          angle: 45,
          stops: [
            { offset: 0, color: '#3B82F6' },
            { offset: 1, color: '#1D4ED8' }
          ]
        }, opacity: 1 },
        stroke: { enabled: false, color: '#000000', width: 0, style: 'solid', opacity: 1 },
        effects: {},
        behavior: { maintainAspectRatio: true, snapToGrid: true, smartGuides: true }
      },
      description: 'Website hero section (1920×1080px)',
      tags: ['web', 'hero', 'landing', 'full-width'],
      isBuiltIn: true
    },
    
    // Mobile Formats
    {
      id: 'mobile-screen',
      name: 'Mobile Screen',
      category: 'mobile',
      dimensions: { width: 375, height: 812 }, // iPhone X
      dpi: 72,
      orientation: 'portrait',
      style: {
        fill: { type: 'solid', color: '#FFFFFF', opacity: 1 },
        stroke: { enabled: true, color: '#000000', width: 2, style: 'solid', opacity: 1 },
        effects: {
          dropShadow: {
            enabled: true,
            offsetX: 0,
            offsetY: 4,
            blur: 20,
            color: '#00000020'
          }
        },
        behavior: { maintainAspectRatio: true, snapToGrid: true, smartGuides: true }
      },
      description: 'Mobile screen mockup (375×812px)',
      tags: ['mobile', 'screen', 'mockup', 'iphone'],
      isBuiltIn: true
    }
  ];
  
  static getPresetsByCategory(category: DocumentPreset['category']): DocumentPreset[] {
    return this.BUILT_IN_PRESETS.filter(preset => preset.category === category);
  }
  
  static getPresetById(id: string): DocumentPreset | undefined {
    return this.BUILT_IN_PRESETS.find(preset => preset.id === id);
  }
  
  static searchPresets(query: string): DocumentPreset[] {
    const searchTerm = query.toLowerCase();
    return this.BUILT_IN_PRESETS.filter(preset => 
      preset.name.toLowerCase().includes(searchTerm) ||
      preset.description?.toLowerCase().includes(searchTerm) ||
      preset.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
}
```

#### **Step 2.2: Preset Manager**

```typescript
// lib/editor/tools/shapes/presets/PresetManager.ts
export class PresetManager {
  private customPresets: Map<string, DocumentPreset> = new Map();
  private presetStorage: PresetStorage;
  
  constructor(
    private eventBus: TypedEventBus,
    private storageService: StorageService
  ) {
    this.presetStorage = new PresetStorage(storageService);
    this.loadCustomPresets();
  }
  
  // Get presets
  async getAllPresets(): Promise<DocumentPreset[]> {
    const builtIn = DocumentPresets.BUILT_IN_PRESETS;
    const custom = Array.from(this.customPresets.values());
    return [...builtIn, ...custom];
  }
  
  async getPreset(id: string): Promise<DocumentPreset | null> {
    // Check built-in presets first
    const builtIn = DocumentPresets.getPresetById(id);
    if (builtIn) return builtIn;
    
    // Check custom presets
    return this.customPresets.get(id) || null;
  }
  
  async getPresetsByCategory(category: DocumentPreset['category']): Promise<DocumentPreset[]> {
    const all = await this.getAllPresets();
    return all.filter(preset => preset.category === category);
  }
  
  async searchPresets(query: string): Promise<DocumentPreset[]> {
    const all = await this.getAllPresets();
    const searchTerm = query.toLowerCase();
    
    return all.filter(preset => 
      preset.name.toLowerCase().includes(searchTerm) ||
      preset.description?.toLowerCase().includes(searchTerm) ||
      preset.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  // Custom preset management
  async createCustomPreset(preset: Omit<DocumentPreset, 'id' | 'isBuiltIn'>): Promise<DocumentPreset> {
    const customPreset: DocumentPreset = {
      ...preset,
      id: nanoid(),
      isBuiltIn: false
    };
    
    this.customPresets.set(customPreset.id, customPreset);
    await this.presetStorage.savePreset(customPreset);
    
    this.eventBus.emit('preset.created', {
      preset: customPreset,
      timestamp: Date.now()
    });
    
    return customPreset;
  }
  
  async updateCustomPreset(id: string, updates: Partial<DocumentPreset>): Promise<DocumentPreset> {
    const existing = this.customPresets.get(id);
    if (!existing) throw new Error(`Custom preset ${id} not found`);
    if (existing.isBuiltIn) throw new Error('Cannot update built-in preset');
    
    const updated: DocumentPreset = {
      ...existing,
      ...updates,
      id, // Preserve ID
      isBuiltIn: false // Ensure it stays custom
    };
    
    this.customPresets.set(id, updated);
    await this.presetStorage.savePreset(updated);
    
    this.eventBus.emit('preset.updated', {
      preset: updated,
      previousPreset: existing,
      timestamp: Date.now()
    });
    
    return updated;
  }
  
  async deleteCustomPreset(id: string): Promise<void> {
    const preset = this.customPresets.get(id);
    if (!preset) throw new Error(`Custom preset ${id} not found`);
    if (preset.isBuiltIn) throw new Error('Cannot delete built-in preset');
    
    this.customPresets.delete(id);
    await this.presetStorage.deletePreset(id);
    
    this.eventBus.emit('preset.deleted', {
      preset,
      timestamp: Date.now()
    });
  }
  
  async duplicatePreset(id: string, name?: string): Promise<DocumentPreset> {
    const original = await this.getPreset(id);
    if (!original) throw new Error(`Preset ${id} not found`);
    
    const duplicate = await this.createCustomPreset({
      ...original,
      name: name || `${original.name} Copy`,
      category: 'custom'
    });
    
    return duplicate;
  }
  
  // Preset creation from current rectangle
  async createPresetFromRectangle(rectangle: RectangleObject, name: string, category: DocumentPreset['category']): Promise<DocumentPreset> {
    const preset = await this.createCustomPreset({
      name,
      category,
      dimensions: rectangle.dimensions,
      orientation: rectangle.dimensions.width > rectangle.dimensions.height ? 'landscape' : 'portrait',
      style: this.convertRectangleStyleToOptions(rectangle.style),
      description: `Custom preset created from rectangle`,
      tags: ['custom', 'user-created']
    });
    
    return preset;
  }
  
  // Export/Import
  async exportPresets(): Promise<string> {
    const customPresets = Array.from(this.customPresets.values());
    return JSON.stringify(customPresets, null, 2);
  }
  
  async importPresets(presetsJson: string): Promise<DocumentPreset[]> {
    const presets: DocumentPreset[] = JSON.parse(presetsJson);
    const imported: DocumentPreset[] = [];
    
    for (const preset of presets) {
      // Ensure it's marked as custom and has a new ID
      const customPreset = await this.createCustomPreset({
        ...preset,
        category: 'custom'
      });
      imported.push(customPreset);
    }
    
    return imported;
  }
  
  // Private methods
  private async loadCustomPresets(): Promise<void> {
    const presets = await this.presetStorage.loadAllPresets();
    for (const preset of presets) {
      this.customPresets.set(preset.id, preset);
    }
  }
  
  private convertRectangleStyleToOptions(style: RectangleStyle): RectangleToolOptions {
    // Convert rectangle style back to tool options format
    return {
      fill: {
        type: style.fill.type,
        color: style.fill.type === 'solid' ? style.fill.color : '#FFFFFF',
        opacity: style.fill.opacity || 1
      },
      stroke: {
        enabled: style.stroke.enabled,
        color: style.stroke.color,
        width: style.stroke.width,
        style: style.stroke.style,
        opacity: style.stroke.opacity
      },
      effects: this.convertEffectsToOptions(style.effects),
      behavior: {
        maintainAspectRatio: false,
        snapToGrid: true,
        smartGuides: true
      }
    };
  }
  
  private convertEffectsToOptions(effects: Effect[]): RectangleToolOptions['effects'] {
    const dropShadow = effects.find(e => e.type === 'drop-shadow');
    
    return {
      dropShadow: dropShadow ? {
        enabled: true,
        offsetX: dropShadow.offsetX,
        offsetY: dropShadow.offsetY,
        blur: dropShadow.blur,
        color: dropShadow.color
      } : {
        enabled: false,
        offsetX: 4,
        offsetY: 4,
        blur: 8,
        color: '#00000040'
      }
    };
  }
}
```

#### **Step 2.3: Preset Storage**

```typescript
// lib/editor/tools/shapes/presets/PresetStorage.ts
export class PresetStorage {
  private readonly STORAGE_KEY = 'rectangle-tool-presets';
  
  constructor(private storageService: StorageService) {}
  
  async savePreset(preset: DocumentPreset): Promise<void> {
    const presets = await this.loadAllPresets();
    const index = presets.findIndex(p => p.id === preset.id);
    
    if (index >= 0) {
      presets[index] = preset;
    } else {
      presets.push(preset);
    }
    
    await this.storageService.setItem(this.STORAGE_KEY, JSON.stringify(presets));
  }
  
  async loadAllPresets(): Promise<DocumentPreset[]> {
    const data = await this.storageService.getItem(this.STORAGE_KEY);
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse saved presets:', error);
      return [];
    }
  }
  
  async deletePreset(id: string): Promise<void> {
    const presets = await this.loadAllPresets();
    const filtered = presets.filter(p => p.id !== id);
    await this.storageService.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }
  
  async clearAllPresets(): Promise<void> {
    await this.storageService.removeItem(this.STORAGE_KEY);
  }
}
```

### **Phase 3: UI Components (Days 5-6)**

#### **Step 3.1: Rectangle Options Panel**

```typescript
// components/editor/ToolOptions/RectangleOptionsPanel.tsx
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PresetSelector } from './PresetSelector';
import { StyleEditor } from './StyleEditor';
import { QuickActions } from './QuickActions';

interface RectangleOptionsPanelProps {
  tool: RectangleTool;
  onOptionChange: (key: string, value: any) => void;
}

export function RectangleOptionsPanel({ tool, onOptionChange }: RectangleOptionsPanelProps) {
  const [activeTab, setActiveTab] = useState('presets');
  const [options, setOptions] = useState(tool.getOptions());
  
  const handleOptionChange = useCallback((key: string, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
    onOptionChange(key, value);
  }, [onOptionChange]);
  
  const handlePresetSelect = useCallback(async (presetId: string) => {
    await tool.createFromPreset(presetId);
  }, [tool]);
  
  const handleCreateBackground = useCallback(async (preset?: DocumentPreset) => {
    await tool.createBackground(preset);
  }, [tool]);
  
  return (
    <div className="rectangle-options-panel w-80 bg-background border-l border-border">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold">Rectangle Tool</h3>
        <p className="text-sm text-muted-foreground">
          Create rectangles, backgrounds, and document frames
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-3 m-4">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="presets" className="p-4 space-y-4">
          <PresetSelector
            onPresetSelect={handlePresetSelect}
            onCreateBackground={handleCreateBackground}
          />
        </TabsContent>
        
        <TabsContent value="style" className="p-4 space-y-4">
          <StyleEditor
            options={options}
            onChange={handleOptionChange}
          />
        </TabsContent>
        
        <TabsContent value="actions" className="p-4 space-y-4">
          <QuickActions
            tool={tool}
            onCreateBackground={handleCreateBackground}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### **Step 3.2: Preset Selector Component**

```typescript
// components/editor/ToolOptions/PresetSelector.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Star, Download, Upload } from 'lucide-react';

interface PresetSelectorProps {
  onPresetSelect: (presetId: string) => void;
  onCreateBackground: (preset?: DocumentPreset) => void;
}

export function PresetSelector({ onPresetSelect, onCreateBackground }: PresetSelectorProps) {
  const [presets, setPresets] = useState<DocumentPreset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentPreset['category'] | 'all'>('all');
  const [loading, setLoading] = useState(true);
  
  const presetManager = usePresetManager();
  
  useEffect(() => {
    loadPresets();
  }, []);
  
  const loadPresets = async () => {
    setLoading(true);
    try {
      const allPresets = await presetManager.getAllPresets();
      setPresets(allPresets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredPresets = useMemo(() => {
    let filtered = presets;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(preset => preset.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(query) ||
        preset.description?.toLowerCase().includes(query) ||
        preset.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [presets, selectedCategory, searchQuery]);
  
  const categories = useMemo(() => {
    const cats = Array.from(new Set(presets.map(p => p.category)));
    return [{ id: 'all', name: 'All', count: presets.length }]
      .concat(cats.map(cat => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: presets.filter(p => p.category === cat).length
      })));
  }, [presets]);
  
  const handlePresetClick = (preset: DocumentPreset) => {
    onPresetSelect(preset.id);
  };
  
  const handleCreateBackground = (preset?: DocumentPreset) => {
    onCreateBackground(preset);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading presets...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Quick Background Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Background</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={() => handleCreateBackground()}
            className="w-full"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Background
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleCreateBackground(presets.find(p => p.id === 'a4-portrait'))}
              variant="outline"
              size="sm"
            >
              A4 Background
            </Button>
            <Button
              onClick={() => handleCreateBackground(presets.find(p => p.id === 'instagram-post'))}
              variant="outline"
              size="sm"
            >
              Square Background
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.id as any)}
          >
            {category.name} ({category.count})
          </Badge>
        ))}
      </div>
      
      {/* Preset Grid */}
      <ScrollArea className="h-96">
        <div className="grid grid-cols-1 gap-3">
          {filteredPresets.map(preset => (
            <PresetCard
              key={preset.id}
              preset={preset}
              onClick={() => handlePresetClick(preset)}
              onCreateBackground={() => handleCreateBackground(preset)}
            />
          ))}
        </div>
      </ScrollArea>
      
      {filteredPresets.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No presets found matching your criteria
        </div>
      )}
      
      {/* Custom Preset Actions */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button variant="outline" size="sm" className="flex-1">
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
}

interface PresetCardProps {
  preset: DocumentPreset;
  onClick: () => void;
  onCreateBackground: () => void;
}

function PresetCard({ preset, onClick, onCreateBackground }: PresetCardProps) {
  const aspectRatio = preset.dimensions.width / preset.dimensions.height;
  const isWide = aspectRatio > 1.2;
  const isTall = aspectRatio < 0.8;
  
  return (
    <Card className="cursor-pointer hover:bg-accent transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Preview */}
          <div className="flex-shrink-0 w-12 h-12 bg-muted rounded border flex items-center justify-center">
            <div
              className="bg-primary rounded"
              style={{
                width: isWide ? '80%' : isTall ? '40%' : '60%',
                height: isTall ? '80%' : isWide ? '40%' : '60%'
              }}
            />
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-sm truncate">{preset.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {preset.dimensions.width} × {preset.dimensions.height}
                  {preset.dpi && ` @ ${preset.dpi} DPI`}
                </p>
                {preset.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                )}
              </div>
              {!preset.isBuiltIn && (
                <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {preset.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
            
            {/* Actions */}
            <div className="flex gap-1 mt-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                size="sm"
                variant="outline"
                className="text-xs h-6"
              >
                Create
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateBackground();
                }}
                size="sm"
                variant="outline"
                className="text-xs h-6"
              >
                Background
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### **Step 3.3: Style Editor Component**

```typescript
// components/editor/ToolOptions/StyleEditor.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StyleEditorProps {
  options: RectangleToolOptions;
  onChange: (key: string, value: any) => void;
}

export function StyleEditor({ options, onChange }: StyleEditorProps) {
  const handleFillChange = (key: string, value: any) => {
    onChange('fill', { ...options.fill, [key]: value });
  };
  
  const handleStrokeChange = (key: string, value: any) => {
    onChange('stroke', { ...options.stroke, [key]: value });
  };
  
  const handleEffectChange = (effectType: string, key: string, value: any) => {
    onChange('effects', {
      ...options.effects,
      [effectType]: { ...options.effects[effectType], [key]: value }
    });
  };
  
  const handleBehaviorChange = (key: string, value: any) => {
    onChange('behavior', { ...options.behavior, [key]: value });
  };
  
  return (
    <div className="space-y-4">
      {/* Fill Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Fill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fill Type</Label>
            <Select
              value={options.fill.type}
              onValueChange={(value) => handleFillChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid Color</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
                <SelectItem value="none">No Fill</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {options.fill.type === 'solid' && (
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker
                value={options.fill.color}
                onChange={(color) => handleFillChange('color', color)}
              />
            </div>
          )}
          
          {options.fill.type !== 'none' && (
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider
                value={[options.fill.opacity * 100]}
                onValueChange={([value]) => handleFillChange('opacity', value / 100)}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-right">
                {Math.round(options.fill.opacity * 100)}%
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Stroke Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Stroke
            <Switch
              checked={options.stroke.enabled}
              onCheckedChange={(checked) => handleStrokeChange('enabled', checked)}
            />
          </CardTitle>
        </CardHeader>
        {options.stroke.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker
                value={options.stroke.color}
                onChange={(color) => handleStrokeChange('color', color)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Width</Label>
              <Slider
                value={[options.stroke.width]}
                onValueChange={([value]) => handleStrokeChange('width', value)}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-right">
                {options.stroke.width}px
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Style</Label>
              <Select
                value={options.stroke.style}
                onValueChange={(value) => handleStrokeChange('style', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider
                value={[options.stroke.opacity * 100]}
                onValueChange={([value]) => handleStrokeChange('opacity', value / 100)}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-right">
                {Math.round(options.stroke.opacity * 100)}%
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Effects */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Effects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Shadow */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Drop Shadow</Label>
              <Switch
                checked={options.effects.dropShadow.enabled}
                onCheckedChange={(checked) => handleEffectChange('dropShadow', 'enabled', checked)}
              />
            </div>
            
            {options.effects.dropShadow.enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <ColorPicker
                    value={options.effects.dropShadow.color}
                    onChange={(color) => handleEffectChange('dropShadow', 'color', color)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Offset X</Label>
                    <Slider
                      value={[options.effects.dropShadow.offsetX]}
                      onValueChange={([value]) => handleEffectChange('dropShadow', 'offsetX', value)}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Offset Y</Label>
                    <Slider
                      value={[options.effects.dropShadow.offsetY]}
                      onValueChange={([value]) => handleEffectChange('dropShadow', 'offsetY', value)}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Blur</Label>
                  <Slider
                    value={[options.effects.dropShadow.blur]}
                    onValueChange={([value]) => handleEffectChange('dropShadow', 'blur', value)}
                    max={50}
                    step={1}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Behavior */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Maintain Aspect Ratio</Label>
            <Switch
              checked={options.behavior.maintainAspectRatio}
              onCheckedChange={(checked) => handleBehaviorChange('maintainAspectRatio', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Snap to Grid</Label>
            <Switch
              checked={options.behavior.snapToGrid}
              onCheckedChange={(checked) => handleBehaviorChange('snapToGrid', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Smart Guides</Label>
            <Switch
              checked={options.behavior.smartGuides}
              onCheckedChange={(checked) => handleBehaviorChange('smartGuides', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### **Phase 4: Command System Integration (Day 7)**

#### **Step 4.1: Rectangle Commands**

```
```