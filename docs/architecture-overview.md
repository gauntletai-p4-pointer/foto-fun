# FotoFun: Comprehensive Architectural Overview

## Executive Summary

**FotoFun** is a senior-level photo editing application built with modern architectural patterns. This document serves as the definitive context and standards guide for all agents working on this codebase.

**Core Architecture:** Object-based infinite canvas with event-driven communication, dependency injection, and AI-native tools.

**Key Technologies:** Next.js 14, TypeScript (strict mode), Konva.js, AI SDK v5, Supabase, Drizzle ORM.

## 🎯 **Senior-Level Architectural Standards**

All code MUST follow these non-negotiable patterns:

### 1. **Dependency Injection** (No Singletons)
```typescript
// ✅ CORRECT: Constructor injection
constructor(
  private eventBus: TypedEventBus,
  private canvasManager: CanvasManager,
  private resourceManager: ResourceManager
) {}

// ❌ FORBIDDEN: Singleton imports
const eventBus = getTypedEventBus() // NEVER DO THIS
EventStore.getInstance() // NEVER DO THIS
```

### 2. **Event-Driven Architecture** (No Direct Calls)
```typescript
// ✅ CORRECT: Event emission
this.eventBus.emit('object.created', { objectId, object, timestamp })

// ❌ FORBIDDEN: Direct method calls
canvasManager.refreshUI() // NEVER DO THIS
```

### 3. **Command Pattern** (No Direct State Mutation)
```typescript
// ✅ CORRECT: Commands for all operations
this.commandManager.execute(new CreateObjectCommand(objectData))

// ❌ FORBIDDEN: Direct state changes
this.state.objects.push(newObject) // NEVER DO THIS
```

### 4. **Type Safety** (100% TypeScript Strict)
```typescript
// ✅ CORRECT: Strict typing
interface FrameOptions {
  width: number;
  height: number;
  fill: FillStyle;
}

// ❌ FORBIDDEN: Any types
const options: any = {} // NEVER DO THIS
```

### 5. **Composition over Inheritance**
```typescript
// ✅ CORRECT: Behavior composition
class FrameTool extends BaseTool {
  constructor(dependencies: ToolDependencies) {
    super(dependencies);
    this.addBehavior(new DrawingBehavior());
    this.addBehavior(new PresetBehavior());
  }
}
```

### 6. **Factory Pattern** (DI-Based Creation)
```typescript
// ✅ CORRECT: Factory with DI
const tool = this.toolFactory.createTool(FrameTool);

// ❌ FORBIDDEN: Direct instantiation
const tool = new FrameTool(); // NEVER DO THIS
```

## 🏗️ **Core Architecture Components**

### **Service Container (Dependency Injection)**

**Location:** `lib/core/ServiceContainer.ts`

**Purpose:** Central dependency injection container managing all services with proper lifecycle.

**Key Features:**
- **Three Lifecycles:** Singleton, Transient, Scoped
- **Initialization Phases:** Core → Infrastructure → Application
- **Dependency Validation:** Circular dependency detection
- **Async Support:** Promise-based factory resolution

**Usage Pattern:**
```typescript
// Service registration (in AppInitializer)
container.registerSingleton('CanvasManager', (container) => {
  return new CanvasManager(
    container.getSync('TypedEventBus'),
    container.getSync('ObjectManager'),
    container.getSync('EventStore')
  );
}, {
  dependencies: ['TypedEventBus', 'ObjectManager', 'EventStore'],
  phase: 'infrastructure'
});

// Service resolution
const canvasManager = await container.get<CanvasManager>('CanvasManager');
```

**Critical Rules:**
- ✅ All services MUST be registered in ServiceContainer
- ✅ Use constructor injection for dependencies
- ❌ NEVER use singleton patterns or getInstance()
- ❌ NEVER import services directly

### **Event System (TypedEventBus + EventStore)**

**Location:** `lib/events/core/`

**Purpose:** Event-driven communication with complete audit trail and event sourcing.

**Architecture:**
```typescript
// Event definitions (type-safe)
interface EventRegistry {
  'object.created': { objectId: string; object: CanvasObject };
  'object.modified': { objectId: string; changes: ObjectChanges };
  'object.deleted': { objectId: string };
  // 50+ more events...
}

// Event emission
this.eventBus.emit('object.created', {
  objectId: newObject.id,
  object: newObject,
  timestamp: Date.now()
});

// Event listening
this.eventBus.on('object.created', (data) => {
  this.updateUI(data.object);
});
```

**Event Categories:**
- **Canvas Events:** Object lifecycle, viewport changes
- **Tool Events:** Activation, deactivation, option changes
- **Selection Events:** Selection changes, context creation
- **Workflow Events:** AI agent execution, multi-step operations
- **System Events:** Initialization, error handling

**Critical Rules:**
- ✅ ALL communication MUST use events
- ✅ Events are immutable and auditable
- ❌ NEVER call methods directly between components
- ❌ NEVER mutate event data

## 🎨 **Canvas Architecture (Infinite Object-Based)**

### **Infinite Canvas Paradigm**

**Core Concept:** Unlimited 2D space where users can place and manipulate objects without boundaries.

**Key Differences from Traditional Editors:**
```typescript
// ❌ OLD: Document-based (Photoshop style)
interface Document {
  width: number;    // Fixed canvas size
  height: number;   // Fixed canvas size
  layers: Layer[];  // Layer hierarchy
}

// ✅ NEW: Infinite object-based (Figma style)
interface CanvasState {
  viewport: { width: number; height: number };  // Container size only
  camera: { x: number; y: number; zoom: number }; // Position on infinite space
  objects: Map<string, CanvasObject>;            // Objects at any position
  objectOrder: string[];                         // Z-order for rendering
}
```

**Navigation:**
- **Pan:** Move camera position to explore infinite space
- **Zoom:** Scale view from 0.1x to 50x
- **Viewport:** Fixed container showing portion of infinite canvas

### **🎯 CRITICAL: Tool Operation Categories**

**All tools are categorized by HOW they manipulate the canvas:**

#### **1. Object Creation Tools**
**Purpose:** Create new `CanvasObject` instances on the infinite canvas

**How They Work:**
- Create new entries in the canvas object store
- Generate new `CanvasObject` with unique ID
- Add to canvas via `canvas.addObject()`
- Objects become independently selectable and transformable

**Examples:**
- **Frame Tool:** Creates frame objects with preset dimensions
- **Text Tool:** Creates text objects with typography
- **Shape Tools:** Create vector shape objects (rectangle, circle, polygon)
- **Image Import:** Creates image objects from files
- **AI Image Generation:** Creates image objects from AI prompts

**Data Structure:**
```typescript
// New object added to canvas
const frameObject: CanvasObject = {
  id: 'frame-123',
  type: 'frame',
  x: 100, y: 100,
  width: 800, height: 600,
  data: { preset: 'A4', fill: '#ffffff' }
};
```

#### **2. Pixel Manipulation Tools**
**Purpose:** Directly modify pixel data within existing image objects

**How They Work:**
- Target existing image objects only
- Modify the underlying `ImageData` buffer
- Use `PixelBuffer` for efficient pixel operations
- Changes are applied destructively to source image

**Examples:**
- **Brush Tool:** Paints pixels directly onto image objects
- **Eraser Tool:** Removes pixels from image objects
- **Clone/Healing:** Copies pixels within image objects
- **Blur/Sharpen:** Applies pixel-level filters
- **Color Correction:** Adjusts pixel values (brightness, contrast, etc.)

**Data Structure:**
```typescript
// Modifies existing image object's pixel data
const imageObject = canvas.getObject('img-123');
imageObject.data.imageData = modifiedPixelBuffer.getImageData();
```

#### **3. Transform Tools**
**Purpose:** Modify object properties and spatial relationships

**How They Work:**
- Operate on any `CanvasObject` type
- Modify object properties (position, size, rotation)
- Handle object relationships (grouping, parenting)
- Changes are non-destructive to object content

**Examples:**
- **Move Tool:** Transform position, size, rotation
- **Crop Tool:** Modify image object bounds (non-destructive)
- **Align Tools:** Arrange multiple objects spatially
- **Group/Ungroup:** Manage object hierarchies

**Data Structure:**
```typescript
// Updates object transform properties
canvas.updateObject('obj-123', {
  x: newX, y: newY,
  width: newWidth, height: newHeight,
  rotation: newRotation
});
```

#### **4. Selection Tools**
**Purpose:** Create and modify pixel-level selections within image objects

**How They Work:**
- Create `PixelSelection` masks on image objects
- Use boolean operations (add, subtract, intersect)
- Selections constrain other tool operations
- Selections are temporary overlays, not permanent objects

**Examples:**
- **Marquee Tool:** Rectangular selections
- **Lasso Tool:** Freehand selections
- **Magic Wand:** Color-based selections
- **AI Selection:** Semantic object selection

**Data Structure:**
```typescript
// Creates selection mask on image object
const selection: PixelSelection = {
  objectId: 'img-123',
  mask: selectionMaskData,
  bounds: { x: 10, y: 10, width: 100, height: 100 }
};
```

#### **5. AI-Enhanced Tools (Cross-Category)**
**Purpose:** AI-powered versions of traditional tools

**How They Work:**
- Can be any of the above categories
- Use AI models to enhance or automate operations
- Accessible through both UI and chat interfaces
- Maintain same data flow patterns as base tools

**Examples:**
- **AI Background Removal:** Pixel manipulation with AI selection
- **AI Image Generation:** Object creation with AI content
- **AI Style Transfer:** Pixel manipulation with AI processing
- **AI Auto-Crop:** Transform tool with AI composition analysis

### **Object-Based Domain Model**

**Location:** `lib/editor/objects/types.ts`

**Core Entity:**
```typescript
interface CanvasObject {
  id: string;
  type: 'image' | 'text' | 'shape' | 'group' | 'frame';
  name: string;
  
  // Position & Transform (in infinite space)
  x: number;        // X position (can be negative)
  y: number;        // Y position (can be negative)
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  
  // Visual Properties
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  
  // Object Hierarchy (Figma-style)
  children?: string[];  // Child object IDs
  parent?: string;      // Parent object ID
  
  // Type-specific data
  data: ImageData | TextData | ShapeData | GroupData;
  
  // Effects & Filters
  filters: Filter[];
  adjustments: Adjustment[];
  
  // Metadata
  metadata?: Record<string, unknown>;
}
```

**Object Types:**

1. **Image Objects:** Photos, AI-generated images, imported graphics
2. **Text Objects:** Typography with full styling support
3. **Shape Objects:** Rectangles, circles, paths, frames
4. **Group Objects:** Collections of other objects
5. **Frame Objects:** Document boundaries and composition guides

### **Frame System (Document-Like Functionality)**

**Purpose:** Bridge infinite canvas flexibility with document-like workflows.

**Frame Behavior:**
```typescript
interface FrameObject extends CanvasObject {
  type: 'frame';
  clipping: {
    enabled: boolean;     // Whether frame clips content
    showOverflow: boolean; // Show content outside frame on canvas
    exportClipped: boolean; // Export only clipped content
  };
  preset?: {
    name: string;         // "A4", "Instagram Square", etc.
    category: string;     // "document", "social", "print"
  };
}
```

**Frame Workflows:**
- **Auto-Frame Creation:** When first image added to empty canvas
- **Preset System:** Common sizes (A4, Instagram, business cards)
- **Export Boundaries:** Frames define export regions
- **Composition Guides:** Visual boundaries for design

**Critical Rules:**
- ✅ Objects outside frames remain visible on infinite canvas
- ✅ Frames are optional - infinite canvas works without them
- ✅ Export system respects frame boundaries when present
- ❌ Frames don't restrict object placement or movement

### **Canvas Manager**

**Location:** `lib/editor/canvas/CanvasManager.ts`

**Purpose:** Central coordinator for all canvas operations using Konva.js for rendering.

**Key Responsibilities:**
```typescript
interface CanvasManager {
  // Object operations
  addObject(object: Partial<CanvasObject>): Promise<string>;
  removeObject(objectId: string): Promise<void>;
  updateObject(objectId: string, updates: Partial<CanvasObject>): Promise<void>;
  getAllObjects(): CanvasObject[];
  
  // Selection operations
  selectObject(objectId: string): void;
  selectMultiple(objectIds: string[]): void;
  getSelectedObjects(): CanvasObject[];
  clearSelection(): void;
  
  // Viewport operations (infinite canvas navigation)
  setZoom(zoom: number): void;
  setPan(position: Point): void;
  fitToViewport(): void;
  
  // Rendering (Konva integration)
  stage: Konva.Stage;
  contentLayer: Konva.Layer;
  render(): void;
}
```

**Konva Integration:**
- **Stage:** Root container managing viewport
- **Layers:** Background, Content, Selection, Overlay
- **Nodes:** Each CanvasObject maps to Konva.Node
- **Performance:** Dirty rectangle rendering, object pooling

## 🛠️ **Tool Architecture**

### **Tool System Overview**

**Purpose:** Unified interface for all editing operations (canvas tools + AI tools).

**Base Tool Architecture:**
```typescript
abstract class BaseTool<TOptions extends ToolOptions = {}> {
  // State machine
  state: ToolState; // INACTIVE | ACTIVATING | ACTIVE | WORKING | DEACTIVATING
  
  // Dependencies (injected)
  protected dependencies: ToolDependencies;
  
  // Tool lifecycle
  abstract onActivate(canvas: CanvasManager): Promise<void>;
  abstract onDeactivate(canvas: CanvasManager): Promise<void>;
  
  // Event handlers
  onMouseDown?(event: ToolEvent): void;
  onMouseMove?(event: ToolEvent): void;
  onMouseUp?(event: ToolEvent): void;
  
  // Type-safe options
  protected abstract getOptionDefinitions(): TOptions;
  setOption<K extends keyof TOptions>(key: K, value: TOptions[K]['default']): void;
}
```

### **Tool Categories**

**CRITICAL DISTINCTION:** Tools are categorized by **how they manipulate the canvas**, not just their interface:

#### **1. Object Creation Tools**
**Purpose:** Create new `CanvasObject` instances on the infinite canvas

**Base Class:** `ObjectTool` → `ObjectDrawingTool`
**How They Work:** 
- Create new entries in the canvas object store
- Generate new `CanvasObject` with unique ID
- Add to canvas via `canvas.addObject()`
- Objects become independently selectable and transformable

**Examples:**
- **Frame Tool:** Creates frame objects with preset dimensions
- **Text Tool:** Creates text objects with typography
- **Shape Tools:** Create vector shape objects (rectangle, circle, polygon)
- **Image Import:** Creates image objects from files
- **AI Image Generation:** Creates image objects from AI prompts

**Data Flow:**
```typescript
// Object creation workflow
const objectData = tool.createObjectData(userInput);
const objectId = await canvas.addObject(objectData);
await canvas.selectObject(objectId);
```

#### **2. Pixel Manipulation Tools**
**Purpose:** Directly modify pixel data within existing image objects

**Base Class:** `PixelTool` → `EnhancedDrawingTool`
**How They Work:**
- Target existing image objects only
- Modify the underlying `ImageData` buffer
- Use `PixelBuffer` for efficient pixel operations
- Changes are applied destructively to source image

**Examples:**
- **Brush Tool:** Paints pixels directly onto image objects
- **Eraser Tool:** Removes pixels from image objects
- **Clone/Healing:** Copies pixels within image objects
- **Blur/Sharpen:** Applies pixel-level filters
- **Color Correction:** Adjusts pixel values (brightness, contrast, etc.)

**Data Flow:**
```typescript
// Pixel manipulation workflow
const imageObjects = canvas.getSelectedObjects().filter(obj => obj.type === 'image');
const pixelBuffer = new PixelBuffer(imageObjects[0].imageData);
await tool.applyPixelOperation(pixelBuffer, toolOptions);
await canvas.updateObject(imageObjects[0].id, { imageData: pixelBuffer.getImageData() });
```

#### **3. Transform Tools**
**Purpose:** Modify object properties and spatial relationships

**Base Class:** `TransformTool`
**How They Work:**
- Operate on any `CanvasObject` type
- Modify object properties (position, size, rotation)
- Handle object relationships (grouping, parenting)
- Changes are non-destructive to object content

**Examples:**
- **Move Tool:** Transform position, size, rotation
- **Crop Tool:** Modify image object bounds (non-destructive)
- **Align Tools:** Arrange multiple objects spatially
- **Group/Ungroup:** Manage object hierarchies

**Data Flow:**
```typescript
// Transform workflow
const selectedObjects = canvas.getSelectedObjects();
const transforms = tool.calculateTransforms(selectedObjects, userInput);
await canvas.updateObjects(transforms);
```

#### **4. Selection Tools**
**Purpose:** Create and modify pixel-level selections within image objects

**Base Class:** `SelectionTool`
**How They Work:**
- Create `PixelSelection` masks on image objects
- Use boolean operations (add, subtract, intersect)
- Selections constrain other tool operations
- Selections are temporary overlays, not permanent objects

**Examples:**
- **Marquee Tool:** Rectangular selections
- **Lasso Tool:** Freehand selections
- **Magic Wand:** Color-based selections
- **AI Selection:** Semantic object selection

**Data Flow:**
```typescript
// Selection workflow
const imageObject = canvas.getSelectedObjects()[0];
const selection = await tool.createSelection(imageObject, userInput);
await canvas.setSelection(selection);
```

#### **5. AI-Enhanced Tools (Cross-Category)**
**Purpose:** AI-powered versions of traditional tools

**How They Work:**
- Can be any of the above categories
- Use AI models to enhance or automate operations
- Accessible through both UI and chat interfaces
- Maintain same data flow patterns as base tools

**Examples:**
- **AI Background Removal:** Pixel manipulation with AI selection
- **AI Image Generation:** Object creation with AI content
- **AI Style Transfer:** Pixel manipulation with AI processing
- **AI Auto-Crop:** Transform tool with AI composition analysis

**Interface Patterns:**
```typescript
// UI activation (traditional)
toolPalette.activateTool('ai-background-removal');

// Chat activation (AI agent)
await aiAdapter.execute('removeBackground', { objectId: 'img-123' });
```

### **Tool State Machine**

**Purpose:** Prevent race conditions and ensure proper tool lifecycle.

**States:**
```typescript
enum ToolState {
  INACTIVE = 'INACTIVE',      // Tool not selected
  ACTIVATING = 'ACTIVATING',  // Tool initializing
  ACTIVE = 'ACTIVE',          // Tool ready for input
  WORKING = 'WORKING',        // Tool processing operation
  DEACTIVATING = 'DEACTIVATING' // Tool cleaning up
}
```

**State Transitions:**
- User selects tool → INACTIVE → ACTIVATING → ACTIVE
- User starts operation → ACTIVE → WORKING
- Operation completes → WORKING → ACTIVE
- User switches tools → ACTIVE → DEACTIVATING → INACTIVE

**Race Condition Prevention:**
- Mouse events ignored unless tool is ACTIVE or WORKING
- Tool activation queued if another tool is ACTIVATING
- State changes emit events for UI synchronization

## 🤖 **AI Integration Architecture**

### **AI Adapter System**

**Purpose:** Bridge between AI agents and canvas tools with type-safe parameter conversion.

**Architecture:**
```typescript
abstract class UnifiedToolAdapter<TInput, TOutput> {
  abstract toolId: string;      // Canvas tool ID
  abstract aiName: string;      // AI function name
  abstract description: string; // AI context
  abstract inputSchema: z.ZodType<TInput>; // Parameter validation
  
  abstract execute(params: TInput, context: CanvasContext): Promise<TOutput>;
}
```

**Adapter Categories:**

#### **1. Canvas Tool Adapters**
**Purpose:** Expose canvas tools to AI with natural language parameters.

**Example - Brightness Adapter:**
```typescript
class BrightnessAdapter extends UnifiedToolAdapter<BrightnessInput, BrightnessOutput> {
  aiName = 'adjustBrightness';
  description = 'Adjust image brightness. Calculate values: "brighter" → +20%, "much darker" → -40%';
  
  inputSchema = z.object({
    adjustment: z.number().min(-100).max(100).describe('Brightness adjustment percentage')
  });
  
  async execute(params: BrightnessInput, context: CanvasContext): Promise<BrightnessOutput> {
    // 1. Get target objects from context
    const images = context.targetObjects.filter(obj => obj.type === 'image');
    
    // 2. Activate brightness tool
    await this.dependencies.toolStore.activateTool('brightness');
    
    // 3. Set tool options
    const tool = this.dependencies.toolStore.getActiveTool();
    tool.setOption('adjustment', params.adjustment);
    
    // 4. Execute via command
    const command = new BrightnessCommand(images, params.adjustment);
    await this.dependencies.commandManager.execute(command);
    
    return { success: true, affectedObjects: images.length };
  }
}
```

#### **2. AI Service Adapters**
**Purpose:** Integrate external AI APIs (Replicate, OpenAI) with canvas.

**Example - Image Generation Adapter:**
```typescript
class ImageGenerationAdapter extends UnifiedToolAdapter<GenerationInput, GenerationOutput> {
  aiName = 'generateImage';
  description = 'Generate AI image from text prompt. Creates new image object on canvas.';
  
  async execute(params: GenerationInput, context: CanvasContext): Promise<GenerationOutput> {
    // 1. Call external AI service
    const imageData = await this.replicateClient.generate({
      prompt: params.prompt,
      width: params.width || 1024,
      height: params.height || 1024
    });
    
    // 2. Create canvas object
    const objectId = await context.canvas.addObject({
      type: 'image',
      x: params.position?.x || 0,
      y: params.position?.y || 0,
      width: params.width || 1024,
      height: params.height || 1024,
      data: { imageData, source: 'ai-generated' }
    });
    
    return { objectId, dimensions: { width: params.width, height: params.height } };
  }
}
```

### **Canvas Context System**

**Purpose:** Provide AI agents with complete canvas state and targeting information.

**Context Interface:**
```typescript
interface CanvasContext {
  canvas: CanvasManager;
  targetObjects: CanvasObject[];    // Objects to operate on
  targetingMode: 'selected' | 'all' | 'visible';
  dimensions: { width: number; height: number };
  hasContent: boolean;
  objectCount: number;
  pixelSelection?: Selection;
  screenshot?: string;
}
```

**Targeting Modes:**
- **Selected:** Only user-selected objects (most common)
- **All:** Every object on canvas
- **Visible:** Objects in current viewport

**Selection Enforcement:**
```typescript
// AI tools check selection before execution
if (context.objectCount > 1 && context.targetObjects.length === 0) {
  return {
    error: 'selection-required',
    message: 'Please select objects first. Multiple objects found with no selection.'
  };
}
```

### **AI Agent Execution**

**Multi-Step Workflows:**
```typescript
// Simple operations → Direct tool calls
"make it brighter" → adjustBrightness({ adjustment: 20 })

// Complex operations → Agent workflows
"improve this photo" → executeAgentWorkflow({
  request: "improve this photo",
  steps: [
    { tool: 'analyzeCanvas', params: {} },
    { tool: 'adjustBrightness', params: { adjustment: 15 } },
    { tool: 'adjustContrast', params: { adjustment: 10 } },
    { tool: 'captureAndEvaluate', params: { originalRequest: "improve this photo" } }
  ]
})
```

**Agent Result Evaluation:**
- **Screenshot Capture:** Canvas state before/after operations
- **Quality Assessment:** AI evaluation of results vs. original request
- **Iterative Improvement:** Up to 3 iterations for complex requests
- **User Approval:** Present results and ask for further refinement

## ⚙️ **Command System**

### **Command Pattern Implementation**

**Purpose:** All state changes go through commands for undo/redo and audit trail.

**Base Command:**
```typescript
abstract class Command {
  abstract execute(): Promise<void>;
  abstract undo(): Promise<void>;
  abstract canUndo(): boolean;
  abstract getDescription(): string;
}
```

**Command Categories:**

#### **1. Object Commands**
```typescript
class CreateObjectCommand extends Command {
  constructor(
    private canvasManager: CanvasManager,
    private objectData: Partial<CanvasObject>
  ) {}
  
  async execute(): Promise<void> {
    this.objectId = await this.canvasManager.addObject(this.objectData);
  }
  
  async undo(): Promise<void> {
    await this.canvasManager.removeObject(this.objectId);
  }
}
```

#### **2. Transform Commands**
```typescript
class MoveObjectCommand extends Command {
  constructor(
    private canvasManager: CanvasManager,
    private objectId: string,
    private newPosition: Point,
    private oldPosition: Point
  ) {}
  
  async execute(): Promise<void> {
    await this.canvasManager.updateObject(this.objectId, {
      x: this.newPosition.x,
      y: this.newPosition.y
    });
  }
  
  async undo(): Promise<void> {
    await this.canvasManager.updateObject(this.objectId, {
      x: this.oldPosition.x,
      y: this.oldPosition.y
    });
  }
}
```

#### **3. Composite Commands**
```typescript
class BatchModifyCommand extends Command {
  constructor(private commands: Command[]) {}
  
  async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute();
    }
  }
  
  async undo(): Promise<void> {
    // Undo in reverse order
    for (const command of this.commands.reverse()) {
      await command.undo();
    }
  }
}
```

### **Command Manager**

**Location:** `lib/editor/commands/CommandManager.ts`

**Features:**
- **Execution Queue:** Commands processed in order
- **Undo/Redo Stack:** Complete history management
- **Validation:** Pre-execution command validation
- **Middleware:** Command interception and modification
- **Events:** Command lifecycle events

**Usage:**
```typescript
// Execute single command
await commandManager.execute(new CreateObjectCommand(objectData));

// Execute batch
await commandManager.executeBatch([
  new CreateObjectCommand(frameData),
  new CreateObjectCommand(textData),
  new GroupObjectsCommand([frameId, textId])
]);

// Undo/Redo
await commandManager.undo(); // Undo last command
await commandManager.redo(); // Redo last undone command
```

## 🔌 **Plugin Architecture**

### **Plugin System Overview**

**Purpose:** Extensible architecture allowing third-party tools, filters, and functionality.

**Plugin Types:**

#### **1. Canvas Tool Plugins**
```typescript
interface CanvasToolPlugin extends Plugin {
  type: 'canvas-tool';
  tool: BaseTool;
  
  // Plugin lifecycle
  onInstall(toolPalette: ToolPalette): void;
  onUninstall(toolPalette: ToolPalette): void;
}

// Example: Advanced shape tool
class AdvancedShapePlugin implements CanvasToolPlugin {
  tool = new PolygonTool(this.dependencies);
  
  onInstall(toolPalette: ToolPalette): void {
    toolPalette.addTool(this.tool, { category: 'shapes', position: 'after:rectangle' });
  }
}
```

#### **2. AI Tool Plugins**
```typescript
interface AIToolPlugin extends Plugin {
  type: 'ai-tool';
  adapter: UnifiedToolAdapter;
  
  onInstall(adapterRegistry: AdapterRegistry): void;
  onUninstall(adapterRegistry: AdapterRegistry): void;
}

// Example: Custom AI model
class AnimeStylePlugin implements AIToolPlugin {
  adapter = new AnimeStyleAdapter();
  
  onInstall(adapterRegistry: AdapterRegistry): void {
    adapterRegistry.register(this.adapter);
  }
}
```

#### **3. Filter Plugins**
```typescript
interface FilterPlugin extends Plugin {
  type: 'filter';
  filter: WebGLFilter;
  
  onInstall(filterEngine: WebGLFilterEngine): void;
  onUninstall(filterEngine: WebGLFilterEngine): void;
}

// Example: Film grain filter
class FilmGrainPlugin implements FilterPlugin {
  filter = new FilmGrainFilter();
  
  onInstall(filterEngine: WebGLFilterEngine): void {
    filterEngine.registerFilter('film-grain', this.filter);
  }
}
```

#### **4. Export Format Plugins**
```typescript
interface ExportPlugin extends Plugin {
  type: 'export';
  format: ExportFormat;
  
  onInstall(exportManager: ExportManager): void;
}

// Example: PDF export
class PDFExportPlugin implements ExportPlugin {
  format = new PDFExportFormat();
  
  onInstall(exportManager: ExportManager): void {
    exportManager.registerFormat('pdf', this.format);
  }
}
```

### **Plugin Management**

**Plugin Manager:**
```typescript
class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  
  async installPlugin(plugin: Plugin): Promise<void> {
    // 1. Validate plugin
    await this.validatePlugin(plugin);
    
    // 2. Check dependencies
    await this.checkDependencies(plugin);
    
    // 3. Install plugin
    await plugin.onInstall(this.serviceContainer);
    
    // 4. Register plugin
    this.plugins.set(plugin.id, plugin);
    
    // 5. Emit event
    this.eventBus.emit('plugin.installed', { pluginId: plugin.id });
  }
  
  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      await plugin.onUninstall(this.serviceContainer);
      this.plugins.delete(pluginId);
      this.eventBus.emit('plugin.uninstalled', { pluginId });
    }
  }
}
```

**CLI Tool:**
```bash
# Install plugin from NPM
foto-fun plugin install @vendor/advanced-shapes

# Install from Git repository
foto-fun plugin install https://github.com/vendor/custom-filters

# List installed plugins
foto-fun plugin list

# Uninstall plugin
foto-fun plugin uninstall @vendor/advanced-shapes
```

## 🌐 **Deployment Architecture**

### **Hybrid Distribution Strategy**

#### **1. Self-Hosted Version (Primary)**
**Distribution:** NPM package
**Installation:**
```bash
npx create-foto-fun@latest my-editor
cd my-editor
bun install
bun dev
```

**Features:**
- ✅ Complete photo editing functionality
- ✅ AI features (with API keys)
- ✅ Plugin system
- ✅ Local file storage
- ❌ No user accounts/auth
- ❌ No cloud storage
- ❌ No team features

**Configuration:**
```typescript
// .env.local
OPENAI_API_KEY=sk-...          # For AI features
REPLICATE_API_KEY=r_...        # For AI models
FOTO_FUN_STORAGE=local         # local | s3 | custom
FOTO_FUN_PLUGINS_ENABLED=true  # Enable plugin system
```

#### **2. Cloud Version (Secondary)**
**Platform:** Vercel + Supabase
**URL:** `https://fotofun.ai`

**Additional Features:**
- ✅ User authentication (Supabase Auth)
- ✅ Cloud storage (Supabase Storage)
- ✅ Team workspaces
- ✅ Usage analytics
- ✅ Curated plugin marketplace
- ✅ Billing and subscriptions

**Database Schema:**
```sql
-- User management
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project storage
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  data JSONB NOT NULL,  -- Complete project state
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### **Feature Detection System**

**Purpose:** Graceful degradation based on deployment environment.

```typescript
interface FeatureFlags {
  auth: boolean;           // User authentication
  cloudStorage: boolean;   // Cloud file storage
  teams: boolean;          // Team workspaces
  analytics: boolean;      // Usage tracking
  billing: boolean;        // Subscription management
  aiFeatures: boolean;     // AI tools availability
  plugins: boolean;        // Plugin system
}

class FeatureDetector {
  static detect(): FeatureFlags {
    return {
      auth: !!process.env.SUPABASE_URL,
      cloudStorage: !!process.env.SUPABASE_URL,
      teams: !!process.env.SUPABASE_URL,
      analytics: !!process.env.ANALYTICS_URL,
      billing: !!process.env.STRIPE_SECRET_KEY,
      aiFeatures: !!(process.env.OPENAI_API_KEY || process.env.REPLICATE_API_KEY),
      plugins: process.env.FOTO_FUN_PLUGINS_ENABLED === 'true'
    };
  }
}
```

**Conditional UI:**
```typescript
const features = FeatureDetector.detect();

function App() {
  return (
    <div>
      <Canvas />
      <ToolPalette />
      <AIChat enabled={features.aiFeatures} />
      {features.auth && <UserMenu />}
      {features.teams && <WorkspaceSelector />}
      {features.billing && <SubscriptionStatus />}
    </div>
  );
}
```

## 📁 **File System Architecture**

### **Two-Tier File System**

#### **1. Project Files (.fotofun)**
**Purpose:** Complete application state for resuming work.

**Contents:**
```typescript
interface ProjectFile {
  version: string;
  metadata: {
    name: string;
    createdAt: string;
    lastModified: string;
    thumbnail?: string;
  };
  canvas: {
    objects: CanvasObject[];
    objectOrder: string[];
    camera: { x: number; y: number; zoom: number };
    selection: string[];
  };
  aiChat: {
    messages: Message[];
    history: ConversationHistory;
  };
  tools: {
    activeToolId: string;
    toolOptions: Record<string, unknown>;
    presets: ToolPreset[];
  };
  assets: {
    images: AssetReference[];
    fonts: FontReference[];
  };
}
```

**Operations:**
```typescript
// Save project
const projectData = await ProjectSerializer.serialize(canvas, aiChat, tools);
await saveProjectFile('my-project.fotofun', projectData);

// Load project
const projectData = await loadProjectFile('my-project.fotofun');
await ProjectSerializer.deserialize(projectData, canvas, aiChat, tools);
```

#### **2. Export Files (Images)**
**Purpose:** Share-ready output for specific use cases.

**Export Formats:**
- **PNG:** Lossless with transparency
- **JPEG:** Compressed for photos
- **WebP:** Modern web format
- **SVG:** Vector graphics (when applicable)
- **PDF:** Print-ready documents

**Export Options:**
```typescript
interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf';
  quality?: number;        // For lossy formats
  dpi?: number;           // For print formats
  colorSpace?: 'sRGB' | 'P3' | 'CMYK';
  bounds?: 'viewport' | 'all-objects' | 'selected' | 'frame';
  scale?: number;         // Export scale multiplier
}
```

**Smart Export Defaults:**
- **Social Media:** Square crop, sRGB, 72 DPI
- **Print:** Full resolution, CMYK, 300 DPI
- **Web:** Optimized compression, sRGB, responsive

## 🎯 **Performance Architecture**

### **Rendering Optimization**

#### **Dirty Rectangle Rendering**
```typescript
class RenderPipeline {
  private dirtyRects: Set<Rect> = new Set();
  
  markDirty(bounds: Rect): void {
    this.dirtyRects.add(bounds);
    this.scheduleRender();
  }
  
  private scheduleRender(): void {
    requestAnimationFrame(() => {
      this.renderDirtyRegions();
      this.dirtyRects.clear();
    });
  }
  
  private renderDirtyRegions(): void {
    for (const rect of this.dirtyRects) {
      this.renderRegion(rect);
    }
  }
}
```

#### **Object Pooling**
```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  
  acquire(): T {
    return this.pool.pop() || this.factory();
  }
  
  release(obj: T): void {
    this.pool.push(obj);
  }
}

// Usage for Konva nodes
const rectPool = new ObjectPool(() => new Konva.Rect());
```

#### **Virtual Scrolling for Large Canvases**
```typescript
class VirtualCanvas {
  private visibleObjects: Set<string> = new Set();
  
  updateVisibility(viewport: Rect): void {
    const newVisible = this.getObjectsInBounds(viewport);
    
    // Hide objects that went out of view
    for (const id of this.visibleObjects) {
      if (!newVisible.has(id)) {
        this.hideObject(id);
      }
    }
    
    // Show objects that came into view
    for (const id of newVisible) {
      if (!this.visibleObjects.has(id)) {
        this.showObject(id);
      }
    }
    
    this.visibleObjects = newVisible;
  }
}
```

### **Memory Management**

#### **Asset Caching**
```typescript
class AssetCache {
  private cache: Map<string, HTMLImageElement> = new Map();
  private maxSize = 100; // Maximum cached assets
  
  async getImage(url: string): Promise<HTMLImageElement> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    const image = await this.loadImage(url);
    
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(url, image);
    return image;
  }
}
```

#### **Event Batching**
```typescript
class EventBatcher {
  private batch: Event[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  
  addEvent(event: Event): void {
    this.batch.push(event);
    
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatch();
      }, 16); // 60 FPS
    }
  }
  
  private flushBatch(): void {
    if (this.batch.length > 0) {
      this.eventBus.emitBatch(this.batch);
      this.batch = [];
    }
    this.batchTimeout = null;
  }
}
```

## 🔒 **Error Handling & Validation**

### **Result Pattern**
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
async function createObject(data: ObjectData): Promise<Result<string>> {
  try {
    const objectId = await this.canvasManager.addObject(data);
    return { success: true, data: objectId };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### **Validation System**
```typescript
// Zod schemas for all inputs
const CreateObjectSchema = z.object({
  type: z.enum(['image', 'text', 'shape', 'group']),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  data: z.unknown()
});

// Validation middleware
class ValidationMiddleware {
  static validate<T>(schema: z.ZodType<T>) {
    return (data: unknown): Result<T> => {
      const result = schema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: new ValidationError(result.error) };
      }
    };
  }
}
```

### **Error Boundaries**
```typescript
class CanvasErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service
    this.errorTracker.captureException(error, {
      context: 'canvas',
      errorInfo
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

## 📊 **Monitoring & Analytics**

### **Performance Monitoring**
```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  measureOperation<T>(name: string, operation: () => T): T {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    return result;
  }
  
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
    
    // Emit performance event if threshold exceeded
    if (value > this.getThreshold(name)) {
      this.eventBus.emit('performance.threshold.exceeded', {
        operation: name,
        duration: value,
        threshold: this.getThreshold(name)
      });
    }
  }
}
```

### **Usage Analytics**
```typescript
interface AnalyticsEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

class Analytics {
  track(event: string, properties: Record<string, unknown> = {}): void {
    if (!this.features.analytics) return;
    
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };
    
    this.queue.push(analyticsEvent);
    this.scheduleFlush();
  }
}

// Usage throughout app
analytics.track('tool.activated', { toolId: 'frame', source: 'palette' });
analytics.track('ai.tool.executed', { toolName: 'generateImage', duration: 5200 });
analytics.track('export.completed', { format: 'png', objectCount: 5 });
```

## 🔄 **Migration Patterns**

### **Layer to Object Migration**
**CRITICAL:** All new code MUST use Object-based terminology.

```typescript
// ❌ LEGACY (Remove all instances)
interface Layer {
  id: string;
  type: string;
  zIndex: number;
}

// ✅ MODERN (Use everywhere)
interface CanvasObject {
  id: string;
  type: 'image' | 'text' | 'shape' | 'group';
  // Objects can be at any position in infinite space
  x: number;
  y: number;
  // Parent-child relationships instead of z-index
  parent?: string;
  children?: string[];
}
```

**Migration Rules:**
- `layer` → `object` (variables, functions, files)
- `layerId` → `objectId` (parameters, properties)
- `selectedLayers` → `selectedObjects` (arrays, collections)
- `LayerManager` → `ObjectManager` (classes, services)
- `layer.created` → `object.created` (events)

### **Singleton to DI Migration**
```typescript
// ❌ LEGACY (Remove all instances)
const eventBus = getTypedEventBus();
const canvas = CanvasManager.getInstance();

// ✅ MODERN (Use everywhere)
constructor(
  private eventBus: TypedEventBus,
  private canvasManager: CanvasManager
) {}
```

## 🎓 **Development Guidelines**

### **Code Quality Standards**
- **TypeScript Strict Mode:** 100% type coverage, no `any` types
- **ESLint:** No disabled rules without explicit approval
- **Testing:** Unit tests for all business logic
- **Documentation:** TSDoc comments for all public APIs
- **Performance:** All operations < 16ms for 60 FPS

### **Commit Standards**
```bash
# Feature commits
feat(canvas): implement frame tool with preset system

# Bug fixes
fix(ai): resolve race condition in tool activation

# Architecture improvements
refactor(tools): migrate to object-based domain model

# Performance optimizations
perf(render): implement dirty rectangle optimization
```

### **Review Checklist**
- [ ] Follows dependency injection patterns
- [ ] Uses event-driven communication
- [ ] Implements command pattern for state changes
- [ ] Uses object-based terminology (no layer references)
- [ ] Includes proper error handling
- [ ] Has performance considerations
- [ ] Includes tests for new functionality
- [ ] Updates documentation

## 🚀 **Future Roadmap**

### **Phase 1: Core Stability** (Current)
- Complete object migration
- Tool architecture refactor
- Performance optimization
- Plugin system foundation

### **Phase 2: AI Enhancement**
- Advanced AI workflows
- Custom model integration
- Intelligent automation
- Context-aware suggestions

### **Phase 3: Collaboration**
- Real-time collaboration
- Team workspaces
- Version control
- Comment system

### **Phase 4: Platform**
- Plugin marketplace
- Template library
- API for integrations
- Mobile companion app

---

## 📚 **Quick Reference**

### **Key Files**
- `lib/core/ServiceContainer.ts` - Dependency injection
- `lib/events/core/TypedEventBus.ts` - Event system
- `lib/editor/canvas/CanvasManager.ts` - Canvas operations
- `lib/editor/objects/types.ts` - Domain model
- `lib/ai/adapters/base.ts` - AI integration
- `docs/tool-refactor.md` - Tool architecture
- `docs/events-stores-migration.md` - Event system migration

### **Common Patterns**
```typescript
// Service resolution
const service = await container.get<ServiceType>('serviceName');

// Event emission
this.eventBus.emit('event.name', { data });

// Command execution
await this.commandManager.execute(new SomeCommand(params));

// Object operations
await canvas.addObject({ type: 'image', x: 0, y: 0, ... });
```

### **Architecture Violations to Avoid**
- ❌ Singleton patterns (`getInstance()`)
- ❌ Direct method calls between components
- ❌ Direct state mutation (bypass commands)
- ❌ Layer terminology in new code
- ❌ `any` types or unsafe assertions
- ❌ Hardcoded canvas dimensions
- ❌ Imports without dependency injection

---

*This document serves as the definitive architectural guide for FotoFun. All agents must follow these patterns and standards when working on the codebase.* 