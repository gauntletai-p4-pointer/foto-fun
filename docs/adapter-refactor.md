# Comprehensive AI Adapter Architecture Refactor

## 🎯 **EXECUTIVE SUMMARY**

**Primary Goal:** Implement senior-level architectural patterns across all AI adapters that bridge canvas tools with AI agents/chat.

**Foundation:** This refactor builds on the [Tool Architecture Refactor](./tool-refactor.md) and assumes all tools follow the new senior-level patterns.

**Core Problem:** Current adapters have significant architectural debt including code duplication, inconsistent patterns, manual parameter conversion, and tight coupling between AI SDK and tool implementations.

**Comprehensive Solution:** Implement dependency injection, type-safe parameter conversion, event-driven communication, composition patterns, and intelligent error handling across all adapters.

**Status:** 📋 **READY FOR IMPLEMENTATION** - Comprehensive plan with all 34 adapters identified and prioritized

---

## 🚨 **CRITICAL: Domain Model Migration Required**

**IMPORTANT**: During this adapter refactoring, we are **simultaneously migrating from Layer-based to Object-based architecture**. This affects adapter operations, parameter schemas, and target terminology.

### **Legacy (Being Removed):**
```typescript
// ❌ OLD: Layer-based adapter operations
adapter.applyToLayers(layerIds)
adapter.getSelectedLayers()
adapter.createLayer(layerData)

// ❌ OLD Parameter Schemas
interface LayerInput {
  layerId: string
  layerProperties: LayerProperties
  selectedLayers: string[]
}

// ❌ OLD Response Formats
{
  affectedLayers: string[]
  layerCount: number
  layerData: LayerData[]
}
```

### **Modern (Target Architecture):**
```typescript
// ✅ NEW: Object-based adapter operations
adapter.applyToObjects(objectIds)
adapter.getSelectedObjects()
adapter.createObject(objectData)

// ✅ NEW Parameter Schemas
interface ObjectInput {
  objectId: string
  objectProperties: ObjectProperties
  selectedObjects: string[]
}

// ✅ NEW Response Formats
{
  affectedObjects: string[]
  objectCount: number
  objectData: ObjectData[]
}
```

---

## 📊 **COMPLETE ADAPTER INVENTORY & MIGRATION CHECKLIST**

### **🎯 TOTAL: 34 ADAPTERS TO MIGRATE**

| **Category** | **Count** | **Status** | **Priority** |
|--------------|-----------|------------|--------------|
| **Canvas Tool Adapters** | 21 | ❌ Need Migration | P1-P3 |
| **AI Service Adapters** | 11 | ❌ Need Migration | P1-P3 |
| **Utility Adapters** | 2 | ❌ Need Migration | P2 |
| **TOTAL** | **34** | **0% Complete** | **Mixed** |

---

## 🔧 **PHASE 1: CANVAS TOOL ADAPTERS (21 ADAPTERS)**

### **Priority 1: Core Canvas Tools (6 adapters)**
*Essential tools that must work perfectly*

#### **✅ FRAME ADAPTER - MISSING (CRITICAL)**
- [ ] **File:** `lib/ai/adapters/tools/frame.ts` **[CREATE NEW]**
- [ ] **Tool ID:** `frame`
- [ ] **AI Name:** `createFrame`
- [ ] **Description:** Create document frames with presets (Instagram, A4, etc.)
- [ ] **Category:** Object Creation Tool
- [ ] **Status:** ❌ **MISSING** - Must be created first
- [ ] **Dependencies:** FrameTool, CreateFrameCommand, FramePresetManager
- [ ] **Parameter Schema:** `{ preset: string, width?: number, height?: number, position?: Point }`
- [ ] **Response Format:** `{ frameId: string, dimensions: Size, preset?: string }`

#### **✅ MOVE ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/move.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Issues:** Mock dependencies, no proper error handling
- [ ] **Tool ID:** `move`
- [ ] **AI Name:** `moveObjects`
- [ ] **Category:** Transform Tool
- [ ] **Dependencies:** MoveTool, MoveCommand, alignment helpers

#### **✅ CROP ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/crop.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Issues:** Complex parameter handling, no proper validation
- [ ] **Tool ID:** `crop`
- [ ] **AI Name:** `cropObjects`
- [ ] **Category:** Transform Tool
- [ ] **Dependencies:** CropTool, CropCommand

#### **✅ BRUSH ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/brush.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Issues:** Complex stroke handling, performance issues
- [ ] **Tool ID:** `brush`
- [ ] **AI Name:** `paintWithBrush`
- [ ] **Category:** Pixel Manipulation Tool
- [ ] **Dependencies:** BrushTool, drawing commands

#### **✅ ERASER ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/eraser.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Issues:** Background eraser complexity, mode handling
- [ ] **Tool ID:** `eraser`
- [ ] **AI Name:** `eraseArea`
- [ ] **Category:** Pixel Manipulation Tool
- [ ] **Dependencies:** EraserTool, erase commands

#### **✅ ADD TEXT ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/addText.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Issues:** Style preset handling, positioning logic
- [ ] **Tool ID:** `text`
- [ ] **AI Name:** `addText`
- [ ] **Category:** Object Creation Tool
- [ ] **Dependencies:** TextTool, AddTextCommand

### **Priority 2: Essential Tools (9 adapters)**
*Important tools for core functionality*

#### **✅ BRIGHTNESS ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/brightness.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `brightness`
- [ ] **AI Name:** `adjustBrightness`
- [ ] **Category:** Adjustment Tool

#### **✅ CONTRAST ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/contrast.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `contrast`
- [ ] **AI Name:** `adjustContrast`
- [ ] **Category:** Adjustment Tool

#### **✅ SATURATION ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/saturation.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `saturation`
- [ ] **AI Name:** `adjustSaturation`
- [ ] **Category:** Adjustment Tool

#### **✅ BLUR ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/blur.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `blur`
- [ ] **AI Name:** `applyBlur`
- [ ] **Category:** Filter Tool

#### **✅ RESIZE ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/resize.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `resize`
- [ ] **AI Name:** `resizeObjects`
- [ ] **Category:** Transform Tool

#### **✅ FLIP ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/flip.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `flip`
- [ ] **AI Name:** `flipObjects`
- [ ] **Category:** Transform Tool

#### **✅ ROTATE ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/rotate.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `rotate`
- [ ] **AI Name:** `rotateObjects`
- [ ] **Category:** Transform Tool

#### **✅ SHARPEN ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/sharpen.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `sharpen`
- [ ] **AI Name:** `applySharpen`
- [ ] **Category:** Filter Tool

#### **✅ GRAYSCALE ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/grayscale.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `grayscale`
- [ ] **AI Name:** `applyGrayscale`
- [ ] **Category:** Filter Tool

### **Priority 3: Secondary Tools (6 adapters)**
*Nice-to-have tools for advanced functionality*

#### **✅ GRADIENT ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/gradient.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `gradient`
- [ ] **AI Name:** `applyGradient`
- [ ] **Category:** Drawing Tool

#### **✅ HUE ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/hue.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `hue`
- [ ] **AI Name:** `adjustHue`
- [ ] **Category:** Adjustment Tool

#### **✅ EXPOSURE ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/exposure.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `exposure`
- [ ] **AI Name:** `adjustExposure`
- [ ] **Category:** Adjustment Tool

#### **✅ INVERT ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/invert.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `invert`
- [ ] **AI Name:** `invertColors`
- [ ] **Category:** Filter Tool

#### **✅ VINTAGE EFFECTS ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/vintageEffects.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `vintage-effects`
- [ ] **AI Name:** `applyVintageEffect`
- [ ] **Category:** Filter Tool

#### **✅ CANVAS SELECTION MANAGER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/canvasSelectionManager.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `canvas-selection-manager`
- [ ] **AI Name:** `manageSelection`
- [ ] **Category:** Selection Tool

---

## 🤖 **PHASE 2: AI SERVICE ADAPTERS (11 ADAPTERS)**

### **Priority 1: Core AI Tools (4 adapters)**
*Essential AI functionality*

#### **✅ IMAGE GENERATION ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/ImageGenerationAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Issues:** Mock dependencies, no proper error handling
- [ ] **Tool ID:** `ai-image-generation`
- [ ] **AI Name:** `generateImage`
- [ ] **Category:** AI-Enhanced Tool (Object Creation)
- [ ] **Dependencies:** ImageGenerationTool, ModelPreferencesManager

#### **✅ OBJECT REMOVAL ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/ObjectRemovalAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `ai-object-removal`
- [ ] **AI Name:** `removeObject`
- [ ] **Category:** AI-Enhanced Tool (Pixel Manipulation)
- [ ] **Dependencies:** ObjectRemovalTool, ReplicateClient

#### **✅ FACE ENHANCEMENT ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/FaceEnhancementAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `face-enhancement`
- [ ] **AI Name:** `enhanceFaces`
- [ ] **Category:** AI-Enhanced Tool (Pixel Manipulation)
- [ ] **Dependencies:** FaceEnhancementTool, ReplicateClient

#### **✅ UPSCALING ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/UpscalingAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `ai-upscaling`
- [ ] **AI Name:** `upscaleImage`
- [ ] **Category:** AI-Enhanced Tool (Pixel Manipulation)
- [ ] **Dependencies:** UpscalingTool, ReplicateClient

### **Priority 2: Advanced AI Tools (4 adapters)**
*Advanced AI functionality*

#### **✅ STYLE TRANSFER ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/StyleTransferAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `ai-style-transfer`
- [ ] **AI Name:** `applyStyle`
- [ ] **Category:** AI-Enhanced Tool (Pixel Manipulation)
- [ ] **Dependencies:** StyleTransferTool, ReplicateClient

#### **✅ VARIATION ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/VariationAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `ai-variation`
- [ ] **AI Name:** `createVariation`
- [ ] **Category:** AI-Enhanced Tool (Object Creation)
- [ ] **Dependencies:** VariationTool, ReplicateClient

#### **✅ INPAINTING ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/InpaintingAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `inpainting`
- [ ] **AI Name:** `inpaintArea`
- [ ] **Category:** AI-Enhanced Tool (Pixel Manipulation)
- [ ] **Dependencies:** InpaintingTool, ReplicateClient

#### **✅ OUTPAINTING ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/OutpaintingAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `outpainting`
- [ ] **AI Name:** `outpaintArea`
- [ ] **Category:** AI-Enhanced Tool (Object Creation)
- [ ] **Dependencies:** OutpaintingTool, ReplicateClient

### **Priority 3: Specialized AI Tools (3 adapters)**
*Specialized AI functionality*

#### **✅ SEMANTIC SELECTION ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/SemanticSelectionAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `ai-semantic-selection`
- [ ] **AI Name:** `selectBySemantic`
- [ ] **Category:** AI-Enhanced Tool (Selection)
- [ ] **Dependencies:** SemanticSelectionTool, ReplicateClient

#### **✅ DEPTH ESTIMATION ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/DepthEstimationAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `ai-depth-estimation`
- [ ] **AI Name:** `estimateDepth`
- [ ] **Category:** AI-Enhanced Tool (Analysis)
- [ ] **Dependencies:** DepthEstimationTool, ReplicateClient

#### **✅ RELIGHTING ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/RelightingAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `ai-relighting`
- [ ] **AI Name:** `relightImage`
- [ ] **Category:** AI-Enhanced Tool (Pixel Manipulation)
- [ ] **Dependencies:** RelightingTool, ReplicateClient

---

## 🛠️ **PHASE 3: UTILITY ADAPTERS (2 ADAPTERS)**

### **Priority 2: Analysis & Enhancement Tools**

#### **✅ ANALYZE CANVAS ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/analyzeCanvas.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `analyze-canvas`
- [ ] **AI Name:** `analyzeCanvas`
- [ ] **Category:** Analysis Tool
- [ ] **Dependencies:** CanvasAnalyzer, vision models

#### **✅ INSTRUCTION EDITING ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/InstructionEditingAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `ai-instruction-editing`
- [ ] **AI Name:** `editWithInstructions`
- [ ] **Category:** AI-Enhanced Tool (Pixel Manipulation)
- [ ] **Dependencies:** InstructionEditingTool, ReplicateClient

#### **✅ PROMPT ENHANCEMENT ADAPTER - EXISTS**
- [x] **File:** `lib/ai/adapters/tools/PromptEnhancementAdapter.ts` **[EXISTS]**
- [ ] **Migration Status:** ❌ Needs DI migration
- [ ] **Tool ID:** `prompt-enhancement`
- [ ] **AI Name:** `enhancePrompt`
- [ ] **Category:** Utility Tool
- [ ] **Dependencies:** PromptEnhancementService, language models

---

## 🚨 **CRITICAL ARCHITECTURAL ISSUES TO FIX**

### **1. Code Duplication Across Adapters (60%+ duplicate code)**

**Examples of Duplication:**
```typescript
// Repeated in 15+ adapters
const canvas = this.serviceContainer.get<CanvasManager>('canvasManager');
if (!canvas) throw new Error('Canvas not available');

// Repeated parameter validation in 20+ adapters
if (typeof brightness !== 'number') {
  throw new Error('Brightness must be a number');
}

// Repeated error handling in 25+ adapters
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: Date.now()
  };
}
```

### **2. Inconsistent Parameter Conversion Patterns**

**Current Problems:**
```typescript
// brightness.ts - Manual conversion
const brightnessValue = typeof input.brightness === 'string' 
  ? parseFloat(input.brightness) 
  : input.brightness;

// contrast.ts - Different pattern
const contrast = input.contrast ?? 0;
if (contrast < -100 || contrast > 100) {
  throw new Error('Invalid contrast range');
}

// hue.ts - Yet another pattern  
const hueShift = Math.max(-180, Math.min(180, input.hue || 0));
```

### **3. Mock Dependencies & Singleton Patterns**

**Problem:**
```typescript
// Current anti-pattern in multiple adapters
const mockPreferencesManager = {
  getToolModelTier: () => 'balanced',
  setToolModelTier: () => {}
} as any

const mockEventBus = {
  emit: () => {}
} as any
```

**Should Be:**
```typescript
// Proper dependency injection
constructor(
  private modelPreferences: ModelPreferencesManager,
  private eventBus: TypedEventBus,
  private canvasManager: CanvasManager,
  private commandManager: CommandManager
) {}
```

### **4. Manual Error Handling and Formatting**

**Current Pattern (repeated 30+ times):**
```typescript
try {
  // Tool execution
  const result = await tool.execute();
  return { success: true, result };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: Date.now()
  };
}
```

### **5. No Type Safety for AI SDK v5 Integration**

**Current Issues:**
- Manual `inputSchema` definitions (inconsistent)
- No compile-time validation of tool parameters
- Runtime type conversion scattered across adapters
- No standardized response formats

---

## 🏗️ **SENIOR-LEVEL ARCHITECTURE SOLUTION**

### **1. 🏗️ Adapter Factory with Dependency Injection**

```typescript
interface AdapterDependencies {
  canvasManager: CanvasManager;
  toolStore: ToolStore;
  commandManager: CommandManager;
  eventBus: TypedEventBus;
  resourceManager: ResourceManager;
  parameterConverter: ParameterConverter;
  responseFormatter: ResponseFormatter;
  errorHandler: ErrorHandler;
  modelPreferences: ModelPreferencesManager;
  replicateClient: ReplicateClient;
}

class AdapterFactory {
  constructor(private serviceContainer: ServiceContainer) {}
  
  createAdapter<T extends BaseAdapter>(
    AdapterClass: new (deps: AdapterDependencies) => T
  ): T {
    const dependencies = this.serviceContainer.resolveAdapterDependencies();
    return new AdapterClass(dependencies);
  }
}
```

### **2. 🎯 Type-Safe Parameter Conversion System**

```typescript
interface ParameterDefinition<T = any> {
  type: 'number' | 'string' | 'boolean' | 'color' | 'enum' | 'object';
  required?: boolean;
  default?: T;
  min?: number;
  max?: number;
  enum?: T[];
  validator?: (value: T) => boolean;
  converter?: (value: any) => T;
  description?: string;
}

interface ParameterSchema {
  [key: string]: ParameterDefinition;
}

class ParameterConverter {
  convert<T extends Record<string, any>>(
    input: any,
    schema: ParameterSchema
  ): T {
    const result = {} as T;
    
    for (const [key, definition] of Object.entries(schema)) {
      const value = this.convertParameter(input[key], definition);
      if (value !== undefined) {
        result[key as keyof T] = value;
      }
    }
    
    return result;
  }
  
  private convertParameter(value: any, definition: ParameterDefinition): any {
    // Intelligent type conversion with validation
    if (value === undefined || value === null) {
      if (definition.required) {
        throw new Error(`Required parameter missing`);
      }
      return definition.default;
    }
    
    // Use custom converter if provided
    if (definition.converter) {
      return definition.converter(value);
    }
    
    // Standard type conversion
    switch (definition.type) {
      case 'number':
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
        if (definition.min !== undefined && num < definition.min) {
          throw new Error(`Value ${num} below minimum ${definition.min}`);
        }
        if (definition.max !== undefined && num > definition.max) {
          throw new Error(`Value ${num} above maximum ${definition.max}`);
        }
        return num;
        
      case 'string':
        return String(value);
        
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
        
      case 'color':
        return this.convertColor(value);
        
      case 'enum':
        if (!definition.enum?.includes(value)) {
          throw new Error(`Invalid enum value: ${value}. Expected: ${definition.enum?.join(', ')}`);
        }
        return value;
        
      default:
        return value;
    }
  }
  
  private convertColor(value: any): string {
    // Intelligent color conversion (hex, rgb, hsl, named colors)
    if (typeof value === 'string') {
      if (value.startsWith('#')) return value;
      if (value.startsWith('rgb')) return this.rgbToHex(value);
      if (value.startsWith('hsl')) return this.hslToHex(value);
      return this.namedColorToHex(value);
    }
    throw new Error(`Invalid color format: ${value}`);
  }
}
```

### **3. 📡 Event-Driven Adapter Communication**

```typescript
interface AdapterEvent {
  type: string;
  adapterId: string;
  data: any;
  timestamp: number;
}

abstract class BaseAdapter<TInput = any, TOutput = any> {
  constructor(protected dependencies: AdapterDependencies) {}
  
  protected emitEvent(type: string, data: any): void {
    const event: AdapterEvent = {
      type,
      adapterId: this.id,
      data,
      timestamp: Date.now()
    };
    this.dependencies.eventBus.emit('adapter.event', event);
  }
  
  protected async executeWithEvents<T>(
    operation: () => Promise<T>,
    operationType: string
  ): Promise<T> {
    this.emitEvent('operation.started', { type: operationType });
    
    try {
      const result = await operation();
      this.emitEvent('operation.completed', { type: operationType, result });
      return result;
    } catch (error) {
      this.emitEvent('operation.failed', { type: operationType, error });
      throw error;
    }
  }
}
```

### **4. 🧩 Composition Pattern for Shared Behaviors**

```typescript
interface AdapterBehavior {
  id: string;
  beforeExecute?(adapter: BaseAdapter, input: any): Promise<void>;
  afterExecute?(adapter: BaseAdapter, result: any): Promise<void>;
  onError?(adapter: BaseAdapter, error: Error): Promise<void>;
}

class ValidationBehavior implements AdapterBehavior {
  id = 'validation';
  
  async beforeExecute(adapter: BaseAdapter, input: any): Promise<void> {
    // Shared validation logic
    await this.validateCanvasState(adapter);
    await this.validateSelection(adapter);
  }
  
  private async validateCanvasState(adapter: BaseAdapter): Promise<void> {
    const canvas = adapter.dependencies.canvasManager;
    if (!canvas.isReady()) {
      throw new Error('Canvas not ready for operations');
    }
  }
}

class PerformanceBehavior implements AdapterBehavior {
  id = 'performance';
  
  async beforeExecute(adapter: BaseAdapter, input: any): Promise<void> {
    adapter.emitEvent('performance.started', {
      memory: process.memoryUsage(),
      timestamp: performance.now()
    });
  }
  
  async afterExecute(adapter: BaseAdapter, result: any): Promise<void> {
    adapter.emitEvent('performance.completed', {
      memory: process.memoryUsage(),
      timestamp: performance.now()
    });
  }
}

class ErrorRecoveryBehavior implements AdapterBehavior {
  id = 'error-recovery';
  
  async onError(adapter: BaseAdapter, error: Error): Promise<void> {
    // Intelligent error recovery
    if (error.message.includes('Tool not active')) {
      await adapter.dependencies.toolStore.reactivateCurrentTool();
    }
    
    if (error.message.includes('Canvas not ready')) {
      await adapter.dependencies.canvasManager.waitForReady();
    }
  }
}
```

### **5. 🎯 Command Pattern Integration**

```typescript
interface AdapterCommand<TInput = any, TOutput = any> {
  id: string;
  input: TInput;
  execute(): Promise<TOutput>;
  canUndo(): boolean;
  undo?(): Promise<void>;
  redo?(): Promise<TOutput>;
}

class BrightnessAdapterCommand implements AdapterCommand<BrightnessInput, ToolResult> {
  constructor(
    private input: BrightnessInput,
    private brightnessTool: BrightnessTool,
    private targetObjects: CanvasObject[]
  ) {}
  
  async execute(): Promise<ToolResult> {
    return await this.brightnessTool.applyBrightness(
      this.input.brightness,
      this.targetObjects
    );
  }
  
  canUndo(): boolean {
    return true;
  }
  
  async undo(): Promise<void> {
    await this.brightnessTool.revertBrightness(this.targetObjects);
  }
}

abstract class BaseAdapter<TInput = any, TOutput = any> {
  protected createCommand<TCommand extends AdapterCommand>(
    CommandClass: new (...args: any[]) => TCommand,
    ...args: any[]
  ): TCommand {
    return new CommandClass(...args);
  }
  
  protected async executeCommand<T>(command: AdapterCommand<any, T>): Promise<T> {
    const result = await command.execute();
    
    if (command.canUndo()) {
      this.dependencies.commandManager.addToHistory(command);
    }
    
    return result;
  }
}
```

### **6. 🛡️ Intelligent Error Handling System**

```typescript
interface ErrorContext {
  adapterId: string;
  operation: string;
  input: any;
  timestamp: number;
  stackTrace: string;
  canvasState: any;
  toolState: any;
}

class ErrorHandler {
  private errorStrategies = new Map<string, ErrorStrategy>();
  
  constructor(private eventBus: TypedEventBus) {
    this.registerDefaultStrategies();
  }
  
  async handleError(error: Error, context: ErrorContext): Promise<ErrorResult> {
    const strategy = this.getStrategy(error);
    
    try {
      const result = await strategy.handle(error, context);
      
      this.eventBus.emit('error.handled', {
        error,
        context,
        result,
        strategy: strategy.id
      });
      
      return result;
    } catch (handlingError) {
      this.eventBus.emit('error.handling.failed', {
        originalError: error,
        handlingError,
        context
      });
      
      return {
        success: false,
        error: `Error handling failed: ${handlingError.message}`,
        canRetry: false,
        suggestedAction: 'Contact support'
      };
    }
  }
  
  private getStrategy(error: Error): ErrorStrategy {
    if (error.message.includes('Tool not active')) {
      return this.errorStrategies.get('tool-activation')!;
    }
    
    if (error.message.includes('Canvas not ready')) {
      return this.errorStrategies.get('canvas-not-ready')!;
    }
    
    if (error.message.includes('Invalid parameter')) {
      return this.errorStrategies.get('parameter-validation')!;
    }
    
    return this.errorStrategies.get('generic')!;
  }
}

interface ErrorStrategy {
  id: string;
  handle(error: Error, context: ErrorContext): Promise<ErrorResult>;
}

class ToolActivationErrorStrategy implements ErrorStrategy {
  id = 'tool-activation';
  
  async handle(error: Error, context: ErrorContext): Promise<ErrorResult> {
    // Attempt to reactivate the tool
    const toolStore = context.toolStore;
    await toolStore.reactivateCurrentTool();
    
    return {
      success: false,
      error: 'Tool activation issue resolved. Please try again.',
      canRetry: true,
      suggestedAction: 'retry'
    };
  }
}
```

### **7. 🚀 Performance Optimization Patterns**

```typescript
class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry>();
  private batchQueue = new Map<string, BatchOperation[]>();
  
  // Intelligent caching for expensive operations
  async memoize<T>(
    key: string,
    operation: () => Promise<T>,
    ttl = 60000
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    
    const result = await operation();
    this.cache.set(key, {
      value: result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  // Batch similar operations
  async batchOperation<T>(
    batchKey: string,
    operation: BatchOperation<T>,
    delay = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batch = this.batchQueue.get(batchKey) || [];
      batch.push({ operation, resolve, reject });
      this.batchQueue.set(batchKey, batch);
      
      // Debounced execution
      setTimeout(() => {
        this.executeBatch(batchKey);
      }, delay);
    });
  }
  
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.length === 0) return;
    
    this.batchQueue.delete(batchKey);
    
    try {
      // Execute all operations in the batch
      const results = await Promise.all(
        batch.map(item => item.operation.execute())
      );
      
      // Resolve all promises
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }
}
```

### **8. 🔌 Plugin Architecture for Adapter Extensions**

```typescript
interface AdapterPlugin {
  id: string;
  name: string;
  version: string;
  apply(adapter: BaseAdapter): void;
  remove(adapter: BaseAdapter): void;
  isCompatible(adapter: BaseAdapter): boolean;
}

class RetryPlugin implements AdapterPlugin {
  id = 'retry';
  name = 'Automatic Retry';
  version = '1.0.0';
  
  apply(adapter: BaseAdapter): void {
    const originalExecute = adapter.execute.bind(adapter);
    
    adapter.execute = async (input: any) => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          return await originalExecute(input);
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < 3 && this.shouldRetry(error)) {
            await this.delay(attempt * 1000);
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError!;
    };
  }
  
  private shouldRetry(error: Error): boolean {
    return error.message.includes('Tool not active') ||
           error.message.includes('Canvas not ready') ||
           error.message.includes('Temporary failure');
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  isCompatible(adapter: BaseAdapter): boolean {
    return true; // Compatible with all adapters
  }
}

class CachingPlugin implements AdapterPlugin {
  id = 'caching';
  name = 'Result Caching';
  version = '1.0.0';
  
  private cache = new Map<string, any>();
  
  apply(adapter: BaseAdapter): void {
    const originalExecute = adapter.execute.bind(adapter);
    
    adapter.execute = async (input: any) => {
      const cacheKey = this.generateCacheKey(adapter.id, input);
      
      if (this.cache.has(cacheKey)) {
        adapter.emitEvent('cache.hit', { key: cacheKey });
        return this.cache.get(cacheKey);
      }
      
      const result = await originalExecute(input);
      this.cache.set(cacheKey, result);
      adapter.emitEvent('cache.miss', { key: cacheKey });
      
      return result;
    };
  }
  
  private generateCacheKey(adapterId: string, input: any): string {
    return `${adapterId}:${JSON.stringify(input)}`;
  }
  
  isCompatible(adapter: BaseAdapter): boolean {
    // Only compatible with read-only operations
    return adapter.isReadOnly();
  }
}
```

---

## 🚀 **IMPLEMENTATION PLAN**

### **Phase 1: Core Adapter Infrastructure (Days 1-4)**

#### **Step 1.1: Domain Model Migration (CRITICAL FIRST STEP)**
- [ ] **Migrate Adapter Target Terminology**: Update all adapters to use Object-based terminology
  - [ ] Replace `affectedLayers` with `affectedObjects` in all adapter responses
  - [ ] Replace `layerId` with `objectId` in parameter schemas
  - [ ] Update `selectedLayers` to `selectedObjects` in input interfaces
  - [ ] Change `getSelectedLayers()` methods to `getSelectedObjects()`
  - [ ] Update `layerCount` to `objectCount` in response formats
- [ ] **Update Adapter Parameter Schemas**: Migrate all parameter interfaces
  - [ ] `LayerInput` → `ObjectInput`
  - [ ] `LayerProperties` → `ObjectProperties`
  - [ ] `LayerData` → `ObjectData`
  - [ ] `LayerTarget` → `ObjectTarget`
- [ ] **Update Adapter Method Names**: Change method signatures
  - [ ] `applyToLayers()` → `applyToObjects()`
  - [ ] `createLayer()` → `createObject()`
  - [ ] `updateLayer()` → `updateObject()`
  - [ ] `deleteLayer()` → `deleteObject()`

#### **Step 1.2: Create Core Adapter Types and Interfaces**
- [ ] Define `AdapterDependencies` interface with Object-based services
- [ ] Create `ParameterSchema` and `ParameterDefinition` types
- [ ] Add `AdapterEvent` and `AdapterBehavior` interfaces
- [ ] Define `AdapterCommand` and `ErrorStrategy` interfaces

#### **Step 1.3: Implement Parameter Conversion System**
- [ ] Create `ParameterConverter` class with intelligent type conversion
- [ ] Add support for all parameter types (number, string, boolean, color, enum)
- [ ] Implement validation and constraint checking
- [ ] Add custom converter support for complex types

#### **Step 1.4: Implement Error Handling System**
- [ ] Create `ErrorHandler` class with strategy pattern
- [ ] Implement error strategies (tool-activation, canvas-not-ready, parameter-validation)
- [ ] Add error context capture and reporting
- [ ] Create `ResponseFormatter` for standardized responses

#### **Step 1.5: Create Behavior System**
- [ ] Implement `ValidationBehavior` for common validation logic
- [ ] Create `PerformanceBehavior` for performance monitoring
- [ ] Add `ErrorRecoveryBehavior` for intelligent error recovery
- [ ] Create behavior composition system in BaseAdapter

#### **Step 1.6: Implement Performance Optimization System**
- [ ] Create `PerformanceOptimizer` with caching and batching
- [ ] Add memoization for expensive operations
- [ ] Implement batch operation queuing
- [ ] Add performance monitoring and metrics

#### **Step 1.7: Create Plugin Architecture**
- [ ] Define `AdapterPlugin` interface
- [ ] Implement `RetryPlugin` for automatic retries
- [ ] Create `CachingPlugin` for result caching
- [ ] Add plugin management system to BaseAdapter

#### **Step 1.8: Implement Enhanced BaseAdapter**
- [ ] Create complete BaseAdapter with all patterns
- [ ] Add dependency injection support
- [ ] Implement event-driven communication
- [ ] Add behavior and plugin composition

#### **Step 1.9: Create Specialized Base Classes**
- [ ] Implement `CanvasToolAdapter` for tool integration
- [ ] Create `AIServiceAdapter` for AI service integration
- [ ] Add `FilterToolAdapter` for filter-specific logic
- [ ] Implement command pattern integration

#### **Step 1.10: Create Adapter Factory System**
- [ ] Implement `AdapterFactory` with dependency injection
- [ ] Add auto-registration for all adapters
- [ ] Create factory methods for each adapter type
- [ ] Add plugin and behavior auto-application

#### **Step 1.11: Update Service Container**
- [ ] Add `resolveAdapterDependencies()` method
- [ ] Register all adapter-related services
- [ ] Add lifecycle management for adapter dependencies
- [ ] Update dependency injection patterns

### **Phase 2: Canvas Tool Adapter Migration (Days 5-8)**

#### **Step 2.1: Core Tool Adapters (Priority 1)**
**Adapters:** `frame.ts` (CREATE), `move.ts`, `crop.ts`, `brush.ts`, `eraser.ts`, `addText.ts`

- [ ] **Frame Adapter** - `lib/ai/adapters/tools/frame.ts` (FIRST ADAPTER - Document Creation)
  - [ ] **CREATE NEW FILE** - This adapter doesn't exist yet
  - [ ] **Domain Migration**: Implement as reference Object-based adapter
    - [ ] Use `createFrameObject()` instead of any layer-based operations
    - [ ] Update parameter schema to use `targetObjects` instead of `selectedLayers`
    - [ ] Change response format to include `affectedObjects` and `objectCount`
  - [ ] **Dependency Injection**: Use constructor injection for all dependencies
  - [ ] **Parameter Schema**: Define comprehensive frame creation parameters
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        preset: { type: 'enum', enum: ['A4', 'letter', 'instagram-post', 'custom'], description: 'Document preset' },
        width: { type: 'number', required: false, min: 1, max: 8000, description: 'Frame width in pixels' },
        height: { type: 'number', required: false, min: 1, max: 8000, description: 'Frame height in pixels' },
        position: { type: 'object', required: false, description: 'Frame position on canvas' },
        fill: { type: 'object', required: false, description: 'Frame fill style' },
        stroke: { type: 'object', required: false, description: 'Frame stroke style' },
        isBackground: { type: 'boolean', default: false, description: 'Create as background frame' }
      };
    }
    ```
  - [ ] **Type-Safe Input**: Convert preset descriptions and size specifications to frame parameters
  - [ ] **Command Pattern**: Create CreateFrameCommand instead of direct tool manipulation
  - [ ] **Event-Driven**: Replace direct calls with object-based event emissions
  - [ ] **Error Handling**: Use intelligent error strategies for frame creation
  - [ ] **Behavior Composition**: Add FrameBehavior for preset management and validation
  - [ ] **Performance**: Add caching for preset calculations and frame previews
  - [ ] **Advanced Features**: Support document preset library and custom preset creation
  - [ ] **Testing**: Verify frame creation with all preset types and custom parameters

- [ ] **Move Adapter** - `lib/ai/adapters/tools/move.ts`
  - [ ] **Domain Migration**: Update all Layer references to Object terminology
    - [ ] Replace `selectedLayers` with `selectedObjects` in parameter schema
    - [ ] Update `affectedLayers` to `affectedObjects` in response format
    - [ ] Change method calls from `moveLayer()` to `moveObject()`
  - [ ] **Dependency Injection**: Replace serviceContainer access with constructor injection
  - [ ] **Parameter Schema**: Define MoveTool parameter schema with Object-based constraints
  - [ ] **Type-Safe Input**: Convert manual parameter handling to type-safe conversion
  - [ ] **Command Pattern**: Create MoveObjectCommand instead of direct tool manipulation
  - [ ] **Event-Driven**: Replace direct calls with object-based event emissions
  - [ ] **Error Handling**: Use intelligent error strategies
  - [ ] **Behavior Composition**: Add TransformBehavior for shared object logic
  - [ ] **Performance**: Add batching for multiple object moves
  - [ ] **Testing**: Verify move operations with new Object-based architecture

- [ ] **Crop Adapter** - `lib/ai/adapters/tools/crop.ts`
  - [ ] **Dependency Injection**: Inject CropTool and CropCommand factory
  - [ ] **Parameter Schema**: Define crop parameters with aspect ratio constraints
  - [ ] **Command Pattern**: CropCommand with proper undo/redo support
  - [ ] **Validation**: Ensure crop bounds are within canvas dimensions
  - [ ] **Event-Driven**: Emit crop events for UI updates
  - [ ] **Performance**: Optimize crop preview calculations
  - [ ] **Testing**: Test crop operations with various aspect ratios

- [ ] **Brush Adapter** - `lib/ai/adapters/tools/brush.ts`
  - [ ] **Dependency Injection**: Inject BrushTool and drawing services
  - [ ] **Parameter Schema**: Define brush parameters with stroke handling
  - [ ] **Command Pattern**: BrushStrokeCommand with proper state management
  - [ ] **Performance**: Optimize stroke rendering and batching
  - [ ] **Event-Driven**: Real-time brush feedback
  - [ ] **Testing**: Test brush operations with various sizes and modes

- [ ] **Eraser Adapter** - `lib/ai/adapters/tools/eraser.ts`
  - [ ] **Dependency Injection**: Inject EraserTool and background eraser services
  - [ ] **Parameter Schema**: Define eraser parameters with mode handling
  - [ ] **Command Pattern**: EraseCommand with proper undo support
  - [ ] **Smart Conversion**: Handle eraser mode descriptions
  - [ ] **Event-Driven**: Erase operation feedback
  - [ ] **Testing**: Test eraser operations with different modes

- [ ] **Add Text Adapter** - `lib/ai/adapters/tools/addText.ts`
  - [ ] **Dependency Injection**: Inject TextTool and font services
  - [ ] **Parameter Schema**: Define text parameters with style presets
  - [ ] **Command Pattern**: AddTextCommand with proper state management
  - [ ] **Smart Conversion**: Handle text style descriptions
  - [ ] **Event-Driven**: Text creation notifications
  - [ ] **Testing**: Test text creation with various styles and positions

#### **Step 2.2: Adjustment Tool Adapters (Priority 2)**
**Adapters:** `brightness.ts`, `contrast.ts`, `saturation.ts`, `blur.ts`, `resize.ts`, `flip.ts`, `rotate.ts`, `sharpen.ts`, `grayscale.ts`

- [ ] **Brightness Adapter** - `lib/ai/adapters/tools/brightness.ts`
  - [ ] **Dependency Injection**: Replace direct tool access with DI
  - [ ] **Parameter Schema**: Define brightness with intelligent range conversion
  - [ ] **Smart Conversion**: Handle percentage, decimal, and keyword values
  - [ ] **Command Pattern**: BrightnessCommand with proper undo
  - [ ] **Real-time Preview**: Debounced preview updates
  - [ ] **Event-Driven**: Brightness change notifications
  - [ ] **Performance**: Batch brightness adjustments
  - [ ] **Testing**: Test various brightness input formats

- [ ] **Contrast Adapter** - `lib/ai/adapters/tools/contrast.ts`
  - [ ] **Dependency Injection**: Inject ContrastTool and histogram services
  - [ ] **Parameter Schema**: Define contrast with curve validation
  - [ ] **Smart Conversion**: Handle contrast descriptions and values
  - [ ] **Command Pattern**: ContrastCommand with curve preservation
  - [ ] **Advanced Features**: Support contrast curves and selective contrast
  - [ ] **Performance**: Optimize contrast calculations
  - [ ] **Testing**: Test contrast adjustments and curves

- [ ] **Saturation Adapter** - `lib/ai/adapters/tools/saturation.ts`
  - [ ] **Dependency Injection**: Inject SaturationTool and color services
  - [ ] **Parameter Schema**: Define saturation with HSL constraints
  - [ ] **Smart Conversion**: Handle saturation descriptions and percentages
  - [ ] **Command Pattern**: SaturationCommand with color preservation
  - [ ] **Advanced Features**: Support selective color saturation
  - [ ] **Performance**: Optimize HSL calculations
  - [ ] **Testing**: Test saturation adjustments and color preservation

- [ ] **Blur Adapter** - `lib/ai/adapters/tools/blur.ts`
  - [ ] **Dependency Injection**: Inject BlurTool and WebGL filter services
  - [ ] **Parameter Schema**: Define blur with radius and type constraints
  - [ ] **Smart Conversion**: Handle blur descriptions and quality settings
  - [ ] **Command Pattern**: BlurCommand with filter state preservation
  - [ ] **Real-time Preview**: Debounced blur preview with WebGL
  - [ ] **Performance**: Optimize blur algorithms for different radii
  - [ ] **Advanced Features**: Support different blur types
  - [ ] **Testing**: Test all blur types and radius values

- [ ] **Resize Adapter** - `lib/ai/adapters/tools/resize.ts`
  - [ ] **Dependency Injection**: Inject ResizeTool and constraint managers
  - [ ] **Parameter Schema**: Define resize parameters with proportion constraints
  - [ ] **Command Pattern**: ResizeCommand with aspect ratio handling
  - [ ] **Smart Conversion**: Support multiple resize modes and units
  - [ ] **Validation**: Ensure resize constraints are met
  - [ ] **Event-Driven**: Real-time resize feedback
  - [ ] **Performance**: Optimize resize calculations
  - [ ] **Testing**: Test all resize modes and constraint combinations

- [ ] **Flip Adapter** - `lib/ai/adapters/tools/flip.ts`
  - [ ] **Dependency Injection**: Inject FlipTool and transformation services
  - [ ] **Parameter Schema**: Define flip direction with enum validation
  - [ ] **Command Pattern**: FlipCommand with state preservation
  - [ ] **Smart Conversion**: Convert direction descriptions to enum values
  - [ ] **Event-Driven**: Flip completion notifications
  - [ ] **Batch Operations**: Support flipping multiple objects
  - [ ] **Testing**: Test all flip directions and combinations

- [ ] **Rotate Adapter** - `lib/ai/adapters/tools/rotate.ts`
  - [ ] **Dependency Injection**: Inject RotateTool and angle calculation services
  - [ ] **Parameter Schema**: Define rotation parameters with angle constraints
  - [ ] **Command Pattern**: RotateCommand with angle preservation
  - [ ] **Smart Conversion**: Convert angle descriptions to degrees
  - [ ] **Event-Driven**: Real-time rotation feedback
  - [ ] **Performance**: Memoize rotation calculations
  - [ ] **Testing**: Test rotation with various angles and snap modes

- [ ] **Sharpen Adapter** - `lib/ai/adapters/tools/sharpen.ts`
  - [ ] **Dependency Injection**: Inject SharpenTool and unsharp mask services
  - [ ] **Parameter Schema**: Define sharpening with amount and threshold
  - [ ] **Smart Conversion**: Handle sharpening intensity descriptions
  - [ ] **Command Pattern**: SharpenCommand with mask parameters
  - [ ] **Advanced Features**: Support unsharp mask parameters
  - [ ] **Performance**: Optimize sharpening algorithms
  - [ ] **Testing**: Test sharpening amounts and threshold values

- [ ] **Grayscale Adapter** - `lib/ai/adapters/tools/grayscale.ts`
  - [ ] **Dependency Injection**: Inject GrayscaleTool and color conversion services
  - [ ] **Parameter Schema**: Define grayscale with channel mixing options
  - [ ] **Smart Conversion**: Handle grayscale method descriptions
  - [ ] **Command Pattern**: GrayscaleCommand with channel weights
  - [ ] **Advanced Features**: Support custom channel mixing
  - [ ] **Performance**: Optimize color conversion algorithms
  - [ ] **Testing**: Test different grayscale conversion methods

#### **Step 2.3: Secondary Tool Adapters (Priority 3)**
**Adapters:** `gradient.ts`, `hue.ts`, `exposure.ts`, `invert.ts`, `vintageEffects.ts`, `canvasSelectionManager.ts`

- [ ] **Gradient Adapter** - `lib/ai/adapters/tools/gradient.ts`
  - [ ] **Dependency Injection**: Inject GradientTool and gradient services
  - [ ] **Parameter Schema**: Define gradient with type and color constraints
  - [ ] **Smart Conversion**: Handle gradient descriptions and color stops
  - [ ] **Command Pattern**: GradientCommand with gradient state
  - [ ] **Advanced Features**: Support custom gradient types
  - [ ] **Performance**: Optimize gradient rendering
  - [ ] **Testing**: Test gradient creation with various types

- [ ] **Hue Adapter** - `lib/ai/adapters/tools/hue.ts`
  - [ ] **Dependency Injection**: Inject HueTool and color wheel services
  - [ ] **Parameter Schema**: Define hue with color wheel constraints
  - [ ] **Smart Conversion**: Handle hue descriptions and color names
  - [ ] **Command Pattern**: HueCommand with color mapping
  - [ ] **Advanced Features**: Support hue range adjustments
  - [ ] **Performance**: Memoize hue calculations
  - [ ] **Testing**: Test hue shifts and color mapping

- [ ] **Exposure Adapter** - `lib/ai/adapters/tools/exposure.ts`
  - [ ] **Dependency Injection**: Inject ExposureTool and EV calculation services
  - [ ] **Parameter Schema**: Define exposure with EV stop constraints
  - [ ] **Smart Conversion**: Handle exposure descriptions and EV values
  - [ ] **Command Pattern**: ExposureCommand with histogram preservation
  - [ ] **Advanced Features**: Support highlight/shadow recovery
  - [ ] **Performance**: Optimize exposure calculations
  - [ ] **Testing**: Test exposure adjustments and EV conversions

- [ ] **Invert Adapter** - `lib/ai/adapters/tools/invert.ts`
  - [ ] **Dependency Injection**: Inject InvertTool and color inversion services
  - [ ] **Parameter Schema**: Define inversion with channel selection
  - [ ] **Smart Conversion**: Handle selective inversion descriptions
  - [ ] **Command Pattern**: InvertCommand with channel state
  - [ ] **Advanced Features**: Support selective channel inversion
  - [ ] **Performance**: Optimize inversion algorithms
  - [ ] **Testing**: Test full and selective inversion

- [ ] **Vintage Effects Adapter** - `lib/ai/adapters/tools/vintageEffects.ts`
  - [ ] **Dependency Injection**: Inject VintageEffectsTool and effect services
  - [ ] **Parameter Schema**: Define vintage effects with preset options
  - [ ] **Smart Conversion**: Handle vintage style descriptions
  - [ ] **Command Pattern**: VintageEffectsCommand with effect parameters
  - [ ] **Advanced Features**: Support custom vintage effect combinations
  - [ ] **Performance**: Optimize multi-effect processing
  - [ ] **Testing**: Test all vintage effect presets

- [ ] **Canvas Selection Manager** - `lib/ai/adapters/tools/canvasSelectionManager.ts`
  - [ ] **Dependency Injection**: Inject selection management services
  - [ ] **Parameter Schema**: Define selection operations with criteria
  - [ ] **Smart Conversion**: Handle selection descriptions and operations
  - [ ] **Command Pattern**: SelectionCommand with selection state management
  - [ ] **Advanced Features**: Support complex selection operations
  - [ ] **Performance**: Optimize selection algorithms
  - [ ] **Testing**: Test selection operations with various criteria

### **Phase 3: AI Service Adapter Migration (Days 9-12)**

#### **Step 3.1: Core AI Tools (Priority 1)**
**Adapters:** `ImageGenerationAdapter.ts`, `ObjectRemovalAdapter.ts`, `FaceEnhancementAdapter.ts`, `UpscalingAdapter.ts`

- [ ] **Image Generation Adapter** - `lib/ai/adapters/tools/ImageGenerationAdapter.ts`
  - [ ] **Dependency Injection**: Inject Replicate service and image management
  - [ ] **Parameter Schema**: Define comprehensive generation parameters
  - [ ] **Smart Conversion**: Parse complex prompt descriptions and style preferences
  - [ ] **Command Pattern**: ImageGenerationCommand with proper state management
  - [ ] **Progress Tracking**: Real-time generation progress events
  - [ ] **Error Recovery**: Intelligent retry for failed generations
  - [ ] **Caching**: Cache generated images for similar prompts
  - [ ] **Testing**: Test various prompts and generation parameters

- [ ] **Object Removal Adapter** - `lib/ai/adapters/tools/ObjectRemovalAdapter.ts`
  - [ ] **Dependency Injection**: Inject object removal service and selection management
  - [ ] **Parameter Schema**: Define removal parameters with mask handling
  - [ ] **Smart Conversion**: Handle object descriptions and removal preferences
  - [ ] **Command Pattern**: ObjectRemovalCommand with mask state preservation
  - [ ] **Advanced Features**: Support intelligent content-aware removal
  - [ ] **Performance**: Optimize object detection and removal pipeline
  - [ ] **Testing**: Test object removal with various object types

- [ ] **Face Enhancement Adapter** - `lib/ai/adapters/tools/FaceEnhancementAdapter.ts`
  - [ ] **Dependency Injection**: Inject face detection and enhancement services
  - [ ] **Parameter Schema**: Define enhancement parameters with detection options
  - [ ] **Smart Conversion**: Handle enhancement level descriptions
  - [ ] **Command Pattern**: FaceEnhancementCommand with face region tracking
  - [ ] **Advanced Features**: Support selective face enhancement
  - [ ] **Performance**: Optimize face detection and enhancement pipeline
  - [ ] **Testing**: Test enhancement on various face types and conditions

- [ ] **Upscaling Adapter** - `lib/ai/adapters/tools/UpscalingAdapter.ts`
  - [ ] **Dependency Injection**: Inject upscaling service and quality assessment
  - [ ] **Parameter Schema**: Define upscaling with scale factor and method
  - [ ] **Smart Conversion**: Handle scale descriptions and quality preferences
  - [ ] **Command Pattern**: UpscalingCommand with quality preservation
  - [ ] **Advanced Features**: Support different upscaling algorithms
  - [ ] **Performance**: Optimize upscaling for different image sizes
  - [ ] **Testing**: Test upscaling with various scale factors

#### **Step 3.2: Advanced AI Tools (Priority 2)**
**Adapters:** `StyleTransferAdapter.ts`, `VariationAdapter.ts`, `InpaintingAdapter.ts`, `OutpaintingAdapter.ts`

- [ ] **Style Transfer Adapter** - `lib/ai/adapters/tools/StyleTransferAdapter.ts`
  - [ ] **Dependency Injection**: Inject style transfer service and style library
  - [ ] **Parameter Schema**: Define style transfer with style selection
  - [ ] **Smart Conversion**: Handle style descriptions and strength values
  - [ ] **Command Pattern**: StyleTransferCommand with style preservation
  - [ ] **Advanced Features**: Support custom style images
  - [ ] **Performance**: Optimize style transfer processing
  - [ ] **Testing**: Test style transfer with various styles and strengths

- [ ] **Variation Adapter** - `lib/ai/adapters/tools/VariationAdapter.ts`
  - [ ] **Dependency Injection**: Inject variation service and image analysis
  - [ ] **Parameter Schema**: Define variation parameters with source image
  - [ ] **Smart Conversion**: Handle variation strength and style descriptions
  - [ ] **Command Pattern**: VariationCommand with source image preservation
  - [ ] **Advanced Features**: Support multiple variation techniques
  - [ ] **Performance**: Optimize variation processing pipeline
  - [ ] **Testing**: Test variations with different source images

- [ ] **Inpainting Adapter** - `lib/ai/adapters/tools/InpaintingAdapter.ts`
  - [ ] **Dependency Injection**: Inject inpainting service and mask management
  - [ ] **Parameter Schema**: Define inpainting with mask and prompt parameters
  - [ ] **Smart Conversion**: Handle inpainting descriptions and mask definitions
  - [ ] **Command Pattern**: InpaintingCommand with mask state preservation
  - [ ] **Advanced Features**: Support guided inpainting with prompts
  - [ ] **Performance**: Optimize inpainting processing pipeline
  - [ ] **Testing**: Test inpainting with various masks and prompts

- [ ] **Outpainting Adapter** - `lib/ai/adapters/tools/OutpaintingAdapter.ts`
  - [ ] **Dependency Injection**: Inject outpainting service and canvas extension
  - [ ] **Parameter Schema**: Define outpainting with direction and size parameters
  - [ ] **Smart Conversion**: Handle expansion descriptions and direction preferences
  - [ ] **Command Pattern**: OutpaintingCommand with canvas state management
  - [ ] **Advanced Features**: Support intelligent boundary blending
  - [ ] **Performance**: Optimize outpainting for large expansions
  - [ ] **Testing**: Test outpainting in all directions with various sizes

#### **Step 3.3: Specialized AI Tools (Priority 3)**
**Adapters:** `SemanticSelectionAdapter.ts`, `DepthEstimationAdapter.ts`, `RelightingAdapter.ts`

- [ ] **Semantic Selection Adapter** - `lib/ai/adapters/tools/SemanticSelectionAdapter.ts`
  - [ ] **Dependency Injection**: Inject semantic analysis and selection services
  - [ ] **Parameter Schema**: Define semantic selection with object descriptions
  - [ ] **Smart Conversion**: Handle object descriptions and selection criteria
  - [ ] **Command Pattern**: SemanticSelectionCommand with selection state
  - [ ] **Advanced Features**: Support multi-object semantic selection
  - [ ] **Performance**: Optimize semantic analysis pipeline
  - [ ] **Testing**: Test semantic selection with various object descriptions

- [ ] **Depth Estimation Adapter** - `lib/ai/adapters/tools/DepthEstimationAdapter.ts`
  - [ ] **Dependency Injection**: Inject depth estimation and 3D services
  - [ ] **Parameter Schema**: Define depth estimation with output preferences
  - [ ] **Smart Conversion**: Handle depth map descriptions and quality settings
  - [ ] **Command Pattern**: DepthEstimationCommand with depth data management
  - [ ] **Advanced Features**: Support depth-based effects
  - [ ] **Performance**: Optimize depth estimation algorithms
  - [ ] **Testing**: Test depth estimation with various image types

- [ ] **Relighting Adapter** - `lib/ai/adapters/tools/RelightingAdapter.ts`
  - [ ] **Dependency Injection**: Inject relighting service and lighting analysis
  - [ ] **Parameter Schema**: Define relighting with lighting parameters
  - [ ] **Smart Conversion**: Handle lighting descriptions and intensity values
  - [ ] **Command Pattern**: RelightingCommand with lighting state preservation
  - [ ] **Advanced Features**: Support multiple light sources
  - [ ] **Performance**: Optimize relighting processing
  - [ ] **Testing**: Test relighting with various lighting conditions

### **Phase 4: Utility Adapter Migration (Days 13-14)**

#### **Step 4.1: Analysis & Enhancement Tools**
**Adapters:** `analyzeCanvas.ts`, `InstructionEditingAdapter.ts`, `PromptEnhancementAdapter.ts`

- [ ] **Analyze Canvas Adapter** - `lib/ai/adapters/tools/analyzeCanvas.ts`
  - [ ] **Dependency Injection**: Inject canvas analysis and reporting services
  - [ ] **Parameter Schema**: Define analysis parameters with detail levels
  - [ ] **Smart Conversion**: Handle analysis request descriptions
  - [ ] **Read-Only Pattern**: Implement as read-only adapter with caching
  - [ ] **Advanced Features**: Support comprehensive canvas analysis
  - [ ] **Performance**: Cache analysis results for similar requests
  - [ ] **Testing**: Test analysis with various canvas states

- [ ] **Instruction Editing Adapter** - `lib/ai/adapters/tools/InstructionEditingAdapter.ts`
  - [ ] **Dependency Injection**: Inject instruction parsing and editing services
  - [ ] **Parameter Schema**: Define instruction editing with natural language
  - [ ] **Smart Conversion**: Parse complex editing instructions
  - [ ] **Command Pattern**: InstructionEditingCommand with instruction history
  - [ ] **Advanced Features**: Support multi-step instruction sequences
  - [ ] **Performance**: Optimize instruction parsing and execution
  - [ ] **Testing**: Test instruction editing with various command types

- [ ] **Prompt Enhancement Adapter** - `lib/ai/adapters/tools/PromptEnhancementAdapter.ts`
  - [ ] **Dependency Injection**: Inject prompt analysis and enhancement services
  - [ ] **Parameter Schema**: Define prompt enhancement with improvement options
  - [ ] **Smart Conversion**: Analyze and enhance prompt descriptions
  - [ ] **Read-Only Pattern**: Implement as read-only adapter with intelligent caching
  - [ ] **Advanced Features**: Support context-aware prompt enhancement
  - [ ] **Performance**: Cache enhanced prompts for similar inputs
  - [ ] **Testing**: Test prompt enhancement with various input types

### **Phase 5: Integration & Validation (Days 15-16)**

#### **Step 5.1: Adapter Registry and Auto-Discovery**
- [ ] Update adapter registry to use new base classes
- [ ] Implement auto-discovery for all 34 adapters
- [ ] Add adapter capability detection and routing
- [ ] Test adapter registration and discovery

#### **Step 5.2: AI SDK v5 Integration**
- [ ] Update all adapters to use proper AI SDK v5 patterns
- [ ] Ensure consistent `inputSchema` definitions
- [ ] Validate tool call and result formats
- [ ] Test AI SDK integration with new adapters

#### **Step 5.3: Performance Testing**
- [ ] Benchmark adapter execution times
- [ ] Test caching and batching performance
- [ ] Validate memory usage patterns
- [ ] Optimize bottlenecks identified

#### **Step 5.4: Integration Testing**
- [ ] Test all 34 adapters with AI chat
- [ ] Verify tool execution through adapters
- [ ] Test error handling and recovery
- [ ] Validate event-driven communication

#### **Step 5.5: Documentation and Examples**
- [ ] Update adapter documentation
- [ ] Create examples for each adapter pattern
- [ ] Document parameter schemas and conversion
- [ ] Add troubleshooting guides

---

## 📊 **PROGRESS TRACKING**

### **Overall Progress: 0%** 🚀
- [ ] Current state analysis completed
- [ ] Migration plan documented
- [ ] Phase 1: Core Infrastructure (0/11 tasks)
- [ ] Phase 2: Canvas Tool Adapters (0/21 adapters)
- [ ] Phase 3: AI Service Adapters (0/11 adapters)
- [ ] Phase 4: Utility Adapters (0/2 adapters)
- [ ] Phase 5: Integration & Validation (0/5 tasks)

### **Phase 1 Progress: 0%**
- [ ] Task 1.1: Domain migration (0%)
- [ ] Task 1.2: Core types (0%)
- [ ] Task 1.3: Parameter conversion (0%)
- [ ] Task 1.4: Error handling (0%)
- [ ] Task 1.5: Behavior system (0%)
- [ ] Task 1.6: Performance optimization (0%)
- [ ] Task 1.7: Plugin architecture (0%)
- [ ] Task 1.8: Enhanced BaseAdapter (0%)
- [ ] Task 1.9: Specialized base classes (0%)
- [ ] Task 1.10: Adapter factory (0%)
- [ ] Task 1.11: Service container updates (0%)

### **Phase 2 Progress: 0%**
- **Priority 1 (6 adapters):** 0/6 complete (0%)
- **Priority 2 (9 adapters):** 0/9 complete (0%)
- **Priority 3 (6 adapters):** 0/6 complete (0%)

### **Phase 3 Progress: 0%**
- **Priority 1 (4 adapters):** 0/4 complete (0%)
- **Priority 2 (4 adapters):** 0/4 complete (0%)
- **Priority 3 (3 adapters):** 0/3 complete (0%)

### **Phase 4 Progress: 0%**
- **Utility Adapters (2 adapters):** 0/2 complete (0%)

### **Phase 5 Progress: 0%**
- [ ] Adapter registry updates (0%)
- [ ] AI SDK v5 integration (0%)
- [ ] Performance testing (0%)
- [ ] Integration testing (0%)
- [ ] Documentation (0%)

### **Critical Metrics** 📈
- **Total Adapters**: 34 adapters to migrate
- **Completed**: 0/34 (0%)
- **In Progress**: 0/34 (0%)
- **Infrastructure Steps**: 0/11 (0%)
- **Integration Steps**: 0/5 (0%)

### **Success Criteria Checklist**
- [ ] **Zero TypeScript errors** in adapter files
- [ ] **Zero ESLint errors** in adapter files
- [ ] **Zero `any` types** in adapter code
- [ ] **100% test coverage** for new domain services

### **Architecture Consistency (100% Required)**
- [ ] **All adapters** use unified dependency injection pattern
- [ ] **All parameter conversion** goes through ParameterConverter
- [ ] **Zero code duplication** in adapter logic
- [ ] **Consistent error handling** with intelligent strategies

### **Domain Model Purity (100% Required)**
- [ ] **Zero layer references** in TypeScript files (except CSS/styling)
- [ ] **All parameter schemas** use object-based terminology
- [ ] **All response formats** use object-based naming
- [ ] **File structure** reflects object-based architecture

### **Performance Standards (100% Required)**
- [ ] **Adapter execution** < 50ms for simple operations
- [ ] **Parameter conversion** < 5ms for typical inputs
- [ ] **Memory usage** stable over 8+ hour sessions
- [ ] **Zero memory leaks** in adapter system

### **Senior-Level Patterns (100% Required)**
- [ ] **Dependency injection** for all services (no singletons)
- [ ] **Event-driven communication** (no direct method calls)
- [ ] **Command pattern** for all state changes
- [ ] **Factory pattern** for object creation
- [ ] **Composition over inheritance** in adapter design

---

## 🎯 **SUCCESS CRITERIA**

### **Primary Goals (Architectural Improvements)**
- ✅ 100% dependency injection compliance (zero singleton access)
- ✅ Type-safe parameter conversion across all 34 adapters
- ✅ Consistent error handling and recovery patterns
- ✅ Event-driven communication throughout adapter system
- ✅ Command pattern integration for all canvas operations

### **Secondary Goals (Code Quality)**
- ✅ 60%+ reduction in code duplication across adapters
- ✅ Consistent patterns and interfaces across all adapters
- ✅ Comprehensive error handling with intelligent recovery
- ✅ Performance optimization through caching and batching
- ✅ Plugin architecture for extensibility

### **Integration Goals**
- ✅ Seamless AI SDK v5 integration with type safety
- ✅ Reliable tool execution through adapter layer
- ✅ Proper event propagation and state management
- ✅ Performance maintained or improved
- ✅ Zero breaking changes to existing functionality

### **Developer Experience Goals**
- ✅ Easy to create new adapters following established patterns
- ✅ Clear documentation and examples for all patterns
- ✅ Predictable behavior and debugging capabilities
- ✅ Comprehensive testing and validation tools
- ✅ Hot-reload friendly architecture

---

## 🚨 **RISK MITIGATION**

### **High-Risk Changes**
1. **BaseAdapter Complete Refactor** - Affects all 34 adapters
   - **Mitigation**: 
     - Parallel development with feature flags
     - Adapter-by-adapter migration with validation
     - Comprehensive unit tests for base classes
     - Integration tests for each migrated adapter

2. **Parameter Conversion System** - Changes input handling
   - **Mitigation**:
     - Backwards compatibility during transition
     - Extensive testing with various input types
     - Fallback to manual conversion if needed
     - Gradual rollout with monitoring

3. **Dependency Injection Refactor** - Changes service access patterns
   - **Mitigation**:
     - ServiceContainer backwards compatibility
     - Gradual migration of adapter dependencies
     - Factory pattern for smooth transition
     - Comprehensive DI testing

4. **AI SDK Integration Changes** - Critical for AI functionality
   - **Mitigation**:
     - Maintain existing SDK patterns during transition
     - Extensive testing with AI chat system
     - Rollback capability for SDK integration
     - User acceptance testing

### **Medium-Risk Changes**
1. **Error Handling System** - New error strategies
2. **Event-Driven Communication** - New communication patterns
3. **Performance Optimization** - Caching and batching systems
4. **Plugin Architecture** - Additional complexity

### **Rollback Plan**
- **Feature Flags**: All major systems can be toggled
- **Adapter-Level Rollback**: Individual adapter reversion
- **System-Level Rollback**: Complete architecture rollback
- **Gradual Migration**: Mix old and new systems during transition
- **Git Strategy**: Maintain working branches for each phase

### **Monitoring and Validation**
- **Performance Monitoring**: Adapter execution times, memory usage
- **Error Tracking**: Conversion failures, dependency issues
- **Integration Monitoring**: AI SDK communication, tool execution
- **Code Quality**: Test coverage, type safety, pattern compliance

---

## 🎯 **DEFINITION OF DONE**

The migration is ONLY complete when:

### **Code Quality (100% Required)**
- [ ] **Zero TypeScript errors** in adapter files
- [ ] **Zero ESLint errors** in adapter files
- [ ] **Zero `any` types** in adapter code
- [ ] **100% test coverage** for new domain services

### **Architecture Consistency (100% Required)**
- [ ] **All adapters** use unified dependency injection pattern
- [ ] **All parameter conversion** goes through ParameterConverter
- [ ] **Zero code duplication** in adapter logic
- [ ] **Consistent error handling** with intelligent strategies

### **Domain Model Purity (100% Required)**
- [ ] **Zero layer references** in TypeScript files (except CSS/styling)
- [ ] **All parameter schemas** use object-based terminology
- [ ] **All response formats** use object-based naming
- [ ] **File structure** reflects object-based architecture

### **Performance Standards (100% Required)**
- [ ] **Adapter execution** < 50ms for simple operations
- [ ] **Parameter conversion** < 5ms for typical inputs
- [ ] **Memory usage** stable over 8+ hour sessions
- [ ] **Zero memory leaks** in adapter system

### **Senior-Level Patterns (100% Required)**
- [ ] **Dependency injection** for all services (no singletons)
- [ ] **Event-driven communication** (no direct method calls)
- [ ] **Command pattern** for all state changes
- [ ] **Factory pattern** for object creation
- [ ] **Composition over inheritance** in adapter design

---

*This document will be updated in real-time as implementation progresses.* 