# Comprehensive AI Adapter Architecture Refactor

## Overview

**Primary Goal:** Implement senior-level architectural patterns across all 30+ AI adapters that bridge canvas tools with AI agents/chat.

**Foundation:** This refactor builds on the [Tool Architecture Refactor](./tool-refactor.md) and assumes all tools follow the new senior-level patterns.

**Core Problem:** Current adapters have significant architectural debt including code duplication, inconsistent patterns, manual parameter conversion, and tight coupling between AI SDK and tool implementations.

**Comprehensive Solution:** Implement dependency injection, type-safe parameter conversion, event-driven communication, composition patterns, and intelligent error handling across all adapters.

## Current Adapter Architecture Analysis

### **Adapter Categories (30+ Adapters)**

#### **1. Canvas Tool Adapters (15 adapters)**
- **Transform:** `move.ts`, `crop.ts`, `rotate.ts`, `flip.ts`, `resize.ts`
- **Adjustment:** `brightness.ts`, `contrast.ts`, `saturation.ts`, `hue.ts`, `exposure.ts`
- **Filter:** `blur.ts`, `sharpen.ts`, `grayscale.ts`, `invert.ts`, `vintageEffects.ts`

#### **2. AI Service Adapters (11 adapters)**
- **Generation:** `ImageGenerationAdapter.ts`, `VariationAdapter.ts`
- **Enhancement:** `FaceEnhancementAdapter.ts`, `UpscalingAdapter.ts`, `StyleTransferAdapter.ts`
- **Editing:** `InpaintingAdapter.ts`, `OutpaintingAdapter.ts`, `ObjectRemovalAdapter.ts`
- **Selection:** `SemanticSelectionAdapter.ts`
- **Advanced:** `DepthEstimationAdapter.ts`, `InstructionEditingAdapter.ts`

#### **3. Utility Adapters (4 adapters)**
- **Canvas:** `analyzeCanvas.ts`, `canvasSelectionManager.ts`
- **Execution:** `ChainAdapter.ts`
- **Enhancement:** `PromptEnhancementAdapter.ts`

### **Current Base Classes**
- `BaseToolAdapter` (legacy, being phased out)
- `UnifiedToolAdapter` (current standard)
- `CanvasToolAdapter` (specialized for canvas ops)
- `FilterToolAdapter` (specialized for filters)

## Critical Architectural Issues

### **🚨 Issue 1: Code Duplication Across Adapters (60%+ duplicate code)**

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

### **🚨 Issue 2: Inconsistent Parameter Conversion Patterns**

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

### **🚨 Issue 3: Tight Coupling Between AI SDK and Tools**

**Problem:**
```typescript
// Adapters directly manipulate tool internals
const tool = this.serviceContainer.get<BrightnessTool>('brightnessTool');
tool.brightness = brightnessValue; // Direct property access
tool.apply(); // Direct method call
```

**Should Be:**
```typescript
// Proper abstraction with commands
const command = this.commandFactory.createBrightnessCommand({
  brightness: brightnessValue,
  target: selectedObjects
});
await this.commandManager.execute(command);
```

### **🚨 Issue 4: Manual Error Handling and Formatting**

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

### **🚨 Issue 5: No Type Safety for AI SDK v5 Integration**

**Current Issues:**
- Manual `inputSchema` definitions (inconsistent)
- No compile-time validation of tool parameters
- Runtime type conversion scattered across adapters
- No standardized response formats

### **🚨 Issue 6: Singleton Service Access Pattern**

**Current Anti-Pattern:**
```typescript
// Direct singleton access in adapters
const canvas = this.serviceContainer.get<CanvasManager>('canvasManager');
const toolStore = this.serviceContainer.get<ToolStore>('toolStore');
```

**Should Be:**
```typescript
// Dependency injection
constructor(
  private canvasManager: CanvasManager,
  private toolStore: ToolStore,
  private commandManager: CommandManager
) {}
```

## Senior-Level Architecture Solutions

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

## Enhanced Base Adapter Architecture

### **1. Universal Base Adapter**

```typescript
export abstract class BaseAdapter<TInput = any, TOutput = any> {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract version: string;
  
  // Dependencies (injected, not imported)
  protected dependencies!: AdapterDependencies;
  
  // Behaviors and plugins
  private behaviors = new Map<string, AdapterBehavior>();
  private plugins = new Map<string, AdapterPlugin>();
  
  // Performance optimization
  private performanceOptimizer: PerformanceOptimizer;
  
  constructor(dependencies?: AdapterDependencies) {
    if (dependencies) {
      this.setDependencies(dependencies);
    }
    this.performanceOptimizer = new PerformanceOptimizer();
  }
  
  // Dependency injection
  setDependencies(dependencies: AdapterDependencies): void {
    this.dependencies = dependencies;
    this.initializeAdapter();
  }
  
  // Abstract methods for subclasses
  protected abstract getParameterSchema(): ParameterSchema;
  protected abstract getInputSchema(): any; // AI SDK v5 schema
  protected abstract executeOperation(input: TInput): Promise<TOutput>;
  
  // Optional methods
  protected setupAdapter(): void {}
  protected cleanupAdapter(): void {}
  protected validateInput(input: TInput): void {}
  protected formatOutput(result: TOutput): any { return result; }
  
  // Main execution method
  async execute(rawInput: any): Promise<any> {
    const context: ErrorContext = {
      adapterId: this.id,
      operation: 'execute',
      input: rawInput,
      timestamp: Date.now(),
      stackTrace: new Error().stack || '',
      canvasState: this.dependencies.canvasManager.getState(),
      toolState: this.dependencies.toolStore.getState()
    };
    
    try {
      // 1. Parameter conversion with type safety
      const convertedInput = this.dependencies.parameterConverter.convert<TInput>(
        rawInput,
        this.getParameterSchema()
      );
      
      // 2. Input validation
      this.validateInput(convertedInput);
      
      // 3. Execute behaviors (beforeExecute)
      await this.executeBehaviors('beforeExecute', convertedInput);
      
      // 4. Main operation with performance tracking
      const result = await this.executeWithEvents(
        () => this.executeOperation(convertedInput),
        'main-operation'
      );
      
      // 5. Execute behaviors (afterExecute)
      await this.executeBehaviors('afterExecute', result);
      
      // 6. Format output
      const formattedResult = this.formatOutput(result);
      
      // 7. Return standardized response
      return this.dependencies.responseFormatter.success(formattedResult);
      
    } catch (error) {
      // Execute error behaviors
      await this.executeBehaviors('onError', error);
      
      // Handle error with intelligent strategies
      const errorResult = await this.dependencies.errorHandler.handleError(
        error as Error,
        context
      );
      
      return this.dependencies.responseFormatter.error(errorResult);
    }
  }
  
  // Behavior management
  addBehavior(behavior: AdapterBehavior): void {
    this.behaviors.set(behavior.id, behavior);
  }
  
  private async executeBehaviors(method: keyof AdapterBehavior, ...args: any[]): Promise<void> {
    for (const behavior of this.behaviors.values()) {
      const fn = behavior[method];
      if (fn) await fn(this, ...args);
    }
  }
  
  // Plugin management
  addPlugin(plugin: AdapterPlugin): void {
    if (plugin.isCompatible(this)) {
      this.plugins.set(plugin.id, plugin);
      plugin.apply(this);
    }
  }
  
  // Event emission
  protected emitEvent(type: string, data: any): void {
    const event: AdapterEvent = {
      type,
      adapterId: this.id,
      data,
      timestamp: Date.now()
    };
    this.dependencies.eventBus.emit('adapter.event', event);
  }
  
  // Performance helpers
  protected async memoize<T>(
    key: string,
    operation: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    return this.performanceOptimizer.memoize(key, operation, ttl);
  }
  
  protected async batchOperation<T>(
    batchKey: string,
    operation: BatchOperation<T>,
    delay?: number
  ): Promise<T> {
    return this.performanceOptimizer.batchOperation(batchKey, operation, delay);
  }
  
  // Lifecycle methods
  private initializeAdapter(): void {
    this.setupAdapter();
    
    // Add default behaviors
    this.addBehavior(new ValidationBehavior());
    this.addBehavior(new PerformanceBehavior());
    this.addBehavior(new ErrorRecoveryBehavior());
  }
  
  destroy(): void {
    // Remove all plugins
    for (const plugin of this.plugins.values()) {
      plugin.remove(this);
    }
    this.plugins.clear();
    
    // Clear behaviors
    this.behaviors.clear();
    
    // Cleanup adapter-specific resources
    this.cleanupAdapter();
  }
  
  // Utility methods
  isReadOnly(): boolean {
    return false; // Override in read-only adapters
  }
  
  requiresSelection(): boolean {
    return false; // Override in adapters that need selection
  }
  
  getCapabilities(): string[] {
    return []; // Override to specify adapter capabilities
  }
}
```

### **2. Specialized Adapter Base Classes**

```typescript
// For canvas tool adapters
export abstract class CanvasToolAdapter<TInput = any, TOutput = any> extends BaseAdapter<TInput, TOutput> {
  protected abstract getToolId(): string;
  
  protected async executeOperation(input: TInput): Promise<TOutput> {
    // Get the tool through dependency injection
    const tool = await this.dependencies.toolStore.getTool(this.getToolId());
    
    if (!tool) {
      throw new Error(`Tool ${this.getToolId()} not found`);
    }
    
    // Ensure tool is active
    if (tool.state !== ToolState.ACTIVE) {
      await this.dependencies.toolStore.activateTool(this.getToolId());
    }
    
    // Create and execute command
    const command = this.createToolCommand(tool, input);
    return await this.executeCommand(command);
  }
  
  protected abstract createToolCommand(tool: BaseTool, input: TInput): AdapterCommand<TInput, TOutput>;
}

// For AI service adapters
export abstract class AIServiceAdapter<TInput = any, TOutput = any> extends BaseAdapter<TInput, TOutput> {
  protected abstract getServiceName(): string;
  
  protected async executeOperation(input: TInput): Promise<TOutput> {
    const service = this.dependencies.aiServiceManager.getService(this.getServiceName());
    
    if (!service) {
      throw new Error(`AI service ${this.getServiceName()} not available`);
    }
    
    // Execute with retry and error recovery
    return await this.executeWithRetry(
      () => service.execute(input),
      3, // max retries
      1000 // base delay
    );
  }
  
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    baseDelay: number
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries && this.shouldRetry(error)) {
          await this.delay(baseDelay * Math.pow(2, attempt - 1));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError!;
  }
  
  private shouldRetry(error: Error): boolean {
    return error.message.includes('rate limit') ||
           error.message.includes('temporary') ||
           error.message.includes('timeout');
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// For filter adapters
export abstract class FilterToolAdapter<TInput = any> extends CanvasToolAdapter<TInput, ToolResult> {
  protected requiresSelection(): boolean {
    return true;
  }
  
  protected validateInput(input: TInput): void {
    super.validateInput(input);
    
    // Validate selection exists
    const selection = this.dependencies.canvasManager.getSelection();
    if (!selection || selection.isEmpty()) {
      throw new Error('Filter operations require a selection');
    }
  }
}
```

## Implementation Plan

### Phase 1: Core Adapter Infrastructure (Days 1-4)

#### Step 1.1: Create Core Adapter Types and Interfaces
- [ ] Define `AdapterDependencies` interface
- [ ] Create `ParameterSchema` and `ParameterDefinition` types
- [ ] Add `AdapterEvent` and `AdapterBehavior` interfaces
- [ ] Define `AdapterCommand` and `ErrorStrategy` interfaces

#### Step 1.2: Implement Parameter Conversion System
- [ ] Create `ParameterConverter` class with intelligent type conversion
- [ ] Add support for all parameter types (number, string, boolean, color, enum)
- [ ] Implement validation and constraint checking
- [ ] Add custom converter support for complex types

#### Step 1.3: Implement Error Handling System
- [ ] Create `ErrorHandler` class with strategy pattern
- [ ] Implement error strategies (tool-activation, canvas-not-ready, parameter-validation)
- [ ] Add error context capture and reporting
- [ ] Create `ResponseFormatter` for standardized responses

#### Step 1.4: Create Behavior System
- [ ] Implement `ValidationBehavior` for common validation logic
- [ ] Create `PerformanceBehavior` for performance monitoring
- [ ] Add `ErrorRecoveryBehavior` for intelligent error recovery
- [ ] Create behavior composition system in BaseAdapter

#### Step 1.5: Implement Performance Optimization System
- [ ] Create `PerformanceOptimizer` with caching and batching
- [ ] Add memoization for expensive operations
- [ ] Implement batch operation queuing
- [ ] Add performance monitoring and metrics

#### Step 1.6: Create Plugin Architecture
- [ ] Define `AdapterPlugin` interface
- [ ] Implement `RetryPlugin` for automatic retries
- [ ] Create `CachingPlugin` for result caching
- [ ] Add plugin management system to BaseAdapter

#### Step 1.7: Implement Enhanced BaseAdapter
- [ ] Create complete BaseAdapter with all patterns
- [ ] Add dependency injection support
- [ ] Implement event-driven communication
- [ ] Add behavior and plugin composition

#### Step 1.8: Create Specialized Base Classes
- [ ] Implement `CanvasToolAdapter` for tool integration
- [ ] Create `AIServiceAdapter` for AI service integration
- [ ] Add `FilterToolAdapter` for filter-specific logic
- [ ] Implement command pattern integration

#### Step 1.9: Create Adapter Factory System
- [ ] Implement `AdapterFactory` with dependency injection
- [ ] Add auto-registration for all adapters
- [ ] Create factory methods for each adapter type
- [ ] Add plugin and behavior auto-application

#### Step 1.10: Update Service Container
- [ ] Add `resolveAdapterDependencies()` method
- [ ] Register all adapter-related services
- [ ] Add lifecycle management for adapter dependencies
- [ ] Update dependency injection patterns

### Phase 2: Canvas Tool Adapter Migration (Days 5-8)

#### Step 2.1: Transform Tool Adapters (Priority 1)
**Adapters:** `move.ts`, `crop.ts`, `rotate.ts`, `flip.ts`, `resize.ts`

- [ ] **Move Adapter** - `lib/ai/adapters/tools/move.ts`
  - [ ] **Dependency Injection**: Replace serviceContainer access with constructor injection
  - [ ] **Parameter Schema**: Define MoveTool parameter schema with constraints
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        deltaX: { type: 'number', required: true, description: 'Horizontal movement in pixels' },
        deltaY: { type: 'number', required: true, description: 'Vertical movement in pixels' },
        targetObjects: { type: 'object', required: false, description: 'Objects to move' }
      };
    }
    ```
  - [ ] **Type-Safe Input**: Convert manual parameter handling to type-safe conversion
  - [ ] **Command Pattern**: Create MoveCommand instead of direct tool manipulation
  - [ ] **Event-Driven**: Replace direct calls with event emissions
  - [ ] **Error Handling**: Use intelligent error strategies
  - [ ] **Behavior Composition**: Add TransformBehavior for shared logic
  - [ ] **Performance**: Add batching for multiple object moves
  - [ ] **Testing**: Verify move operations with new architecture

- [ ] **Crop Adapter** - `lib/ai/adapters/tools/crop.ts`
  - [ ] **Dependency Injection**: Inject CropTool and CropCommand factory
  - [ ] **Parameter Schema**: Define crop parameters with aspect ratio constraints
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        x: { type: 'number', required: true, min: 0 },
        y: { type: 'number', required: true, min: 0 },
        width: { type: 'number', required: true, min: 1 },
        height: { type: 'number', required: true, min: 1 },
        maintainAspectRatio: { type: 'boolean', default: false }
      };
    }
    ```
  - [ ] **Command Pattern**: CropCommand with proper undo/redo support
  - [ ] **Validation**: Ensure crop bounds are within canvas dimensions
  - [ ] **Event-Driven**: Emit crop events for UI updates
  - [ ] **Performance**: Optimize crop preview calculations
  - [ ] **Testing**: Test crop operations with various aspect ratios

- [ ] **Rotate Adapter** - `lib/ai/adapters/tools/rotate.ts`
  - [ ] **Dependency Injection**: Inject RotateTool and angle calculation services
  - [ ] **Parameter Schema**: Define rotation parameters with angle constraints
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        angle: { type: 'number', required: true, min: -360, max: 360 },
        center: { type: 'object', required: false, description: 'Rotation center point' },
        snapToAngles: { type: 'boolean', default: false }
      };
    }
    ```
  - [ ] **Command Pattern**: RotateCommand with angle preservation
  - [ ] **Smart Conversion**: Convert angle descriptions to degrees
  - [ ] **Event-Driven**: Real-time rotation feedback
  - [ ] **Performance**: Memoize rotation calculations
  - [ ] **Testing**: Test rotation with various angles and snap modes

- [ ] **Flip Adapter** - `lib/ai/adapters/tools/flip.ts`
  - [ ] **Dependency Injection**: Inject FlipTool and transformation services
  - [ ] **Parameter Schema**: Define flip direction with enum validation
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        direction: { 
          type: 'enum', 
          required: true, 
          enum: ['horizontal', 'vertical', 'both'],
          description: 'Flip direction'
        },
        targetObjects: { type: 'object', required: false }
      };
    }
    ```
  - [ ] **Command Pattern**: FlipCommand with state preservation
  - [ ] **Smart Conversion**: Convert direction descriptions to enum values
  - [ ] **Event-Driven**: Flip completion notifications
  - [ ] **Batch Operations**: Support flipping multiple objects
  - [ ] **Testing**: Test all flip directions and combinations

- [ ] **Resize Adapter** - `lib/ai/adapters/tools/resize.ts`
  - [ ] **Dependency Injection**: Inject ResizeTool and constraint managers
  - [ ] **Parameter Schema**: Define resize parameters with proportion constraints
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        width: { type: 'number', required: false, min: 1 },
        height: { type: 'number', required: false, min: 1 },
        scale: { type: 'number', required: false, min: 0.01, max: 10 },
        maintainAspectRatio: { type: 'boolean', default: true },
        resizeMode: { type: 'enum', enum: ['absolute', 'relative', 'scale'], default: 'absolute' }
      };
    }
    ```
  - [ ] **Command Pattern**: ResizeCommand with aspect ratio handling
  - [ ] **Smart Conversion**: Support multiple resize modes and units
  - [ ] **Validation**: Ensure resize constraints are met
  - [ ] **Event-Driven**: Real-time resize feedback
  - [ ] **Performance**: Optimize resize calculations
  - [ ] **Testing**: Test all resize modes and constraint combinations

#### Step 2.2: Adjustment Tool Adapters (Priority 2)
**Adapters:** `brightness.ts`, `contrast.ts`, `saturation.ts`, `hue.ts`, `exposure.ts`

- [ ] **Brightness Adapter** - `lib/ai/adapters/tools/brightness.ts`
  - [ ] **Dependency Injection**: Replace direct tool access with DI
  - [ ] **Parameter Schema**: Define brightness with intelligent range conversion
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        brightness: { 
          type: 'number', 
          required: true, 
          min: -100, 
          max: 100,
          converter: (value) => this.convertBrightnessValue(value),
          description: 'Brightness adjustment (-100 to 100)'
        }
      };
    }
    ```
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

#### Step 2.3: Filter Tool Adapters (Priority 3)
**Adapters:** `blur.ts`, `sharpen.ts`, `grayscale.ts`, `invert.ts`, `vintageEffects.ts`

- [ ] **Blur Adapter** - `lib/ai/adapters/tools/blur.ts`
  - [ ] **Dependency Injection**: Inject BlurTool and WebGL filter services
  - [ ] **Parameter Schema**: Define blur with radius and type constraints
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        radius: { type: 'number', required: true, min: 0, max: 100 },
        blurType: { type: 'enum', enum: ['gaussian', 'motion', 'radial'], default: 'gaussian' },
        quality: { type: 'enum', enum: ['low', 'medium', 'high'], default: 'medium' }
      };
    }
    ```
  - [ ] **Smart Conversion**: Handle blur descriptions and quality settings
  - [ ] **Command Pattern**: BlurCommand with filter state preservation
  - [ ] **Real-time Preview**: Debounced blur preview with WebGL
  - [ ] **Performance**: Optimize blur algorithms for different radii
  - [ ] **Advanced Features**: Support different blur types
  - [ ] **Testing**: Test all blur types and radius values

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

### Phase 3: AI Service Adapter Migration (Days 9-12)

#### Step 3.1: Image Generation Adapters (Priority 1)
**Adapters:** `ImageGenerationAdapter.ts`, `VariationAdapter.ts`

- [ ] **Image Generation Adapter** - `lib/ai/adapters/tools/ImageGenerationAdapter.ts`
  - [ ] **Dependency Injection**: Inject Replicate service and image management
  - [ ] **Parameter Schema**: Define comprehensive generation parameters
    ```typescript
    getParameterSchema(): ParameterSchema {
      return {
        prompt: { type: 'string', required: true, description: 'Image generation prompt' },
        width: { type: 'number', default: 512, min: 64, max: 2048 },
        height: { type: 'number', default: 512, min: 64, max: 2048 },
        style: { type: 'enum', enum: ['photorealistic', 'artistic', 'cartoon', 'sketch'] },
        quality: { type: 'enum', enum: ['draft', 'standard', 'high'], default: 'standard' },
        seed: { type: 'number', required: false, description: 'Random seed for reproducibility' }
      };
    }
    ```
  - [ ] **Smart Conversion**: Parse complex prompt descriptions and style preferences
  - [ ] **Command Pattern**: ImageGenerationCommand with proper state management
  - [ ] **Progress Tracking**: Real-time generation progress events
  - [ ] **Error Recovery**: Intelligent retry for failed generations
  - [ ] **Caching**: Cache generated images for similar prompts
  - [ ] **Testing**: Test various prompts and generation parameters

- [ ] **Variation Adapter** - `lib/ai/adapters/tools/VariationAdapter.ts`
  - [ ] **Dependency Injection**: Inject variation service and image analysis
  - [ ] **Parameter Schema**: Define variation parameters with source image
  - [ ] **Smart Conversion**: Handle variation strength and style descriptions
  - [ ] **Command Pattern**: VariationCommand with source image preservation
  - [ ] **Advanced Features**: Support multiple variation techniques
  - [ ] **Performance**: Optimize variation processing pipeline
  - [ ] **Testing**: Test variations with different source images

#### Step 3.2: Enhancement Adapters (Priority 2)
**Adapters:** `FaceEnhancementAdapter.ts`, `UpscalingAdapter.ts`, `StyleTransferAdapter.ts`

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

- [ ] **Style Transfer Adapter** - `lib/ai/adapters/tools/StyleTransferAdapter.ts`
  - [ ] **Dependency Injection**: Inject style transfer service and style library
  - [ ] **Parameter Schema**: Define style transfer with style selection
  - [ ] **Smart Conversion**: Handle style descriptions and strength values
  - [ ] **Command Pattern**: StyleTransferCommand with style preservation
  - [ ] **Advanced Features**: Support custom style images
  - [ ] **Performance**: Optimize style transfer processing
  - [ ] **Testing**: Test style transfer with various styles and strengths

#### Step 3.3: Editing Adapters (Priority 3)
**Adapters:** `InpaintingAdapter.ts`, `OutpaintingAdapter.ts`, `ObjectRemovalAdapter.ts`

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

- [ ] **Object Removal Adapter** - `lib/ai/adapters/tools/ObjectRemovalAdapter.ts`
  - [ ] **Dependency Injection**: Inject object detection and removal services
  - [ ] **Parameter Schema**: Define object removal with selection and method
  - [ ] **Smart Conversion**: Handle object descriptions and removal preferences
  - [ ] **Command Pattern**: ObjectRemovalCommand with object state tracking
  - [ ] **Advanced Features**: Support intelligent content-aware removal
  - [ ] **Performance**: Optimize object detection and removal pipeline
  - [ ] **Testing**: Test object removal with various object types

#### Step 3.4: Selection and Advanced Adapters (Priority 4)
**Adapters:** `SemanticSelectionAdapter.ts`, `DepthEstimationAdapter.ts`, `InstructionEditingAdapter.ts`

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

- [ ] **Instruction Editing Adapter** - `lib/ai/adapters/tools/InstructionEditingAdapter.ts`
  - [ ] **Dependency Injection**: Inject instruction parsing and editing services
  - [ ] **Parameter Schema**: Define instruction editing with natural language
  - [ ] **Smart Conversion**: Parse complex editing instructions
  - [ ] **Command Pattern**: InstructionEditingCommand with instruction history
  - [ ] **Advanced Features**: Support multi-step instruction sequences
  - [ ] **Performance**: Optimize instruction parsing and execution
  - [ ] **Testing**: Test instruction editing with various command types

### Phase 4: Utility Adapter Migration (Days 13-14)

#### Step 4.1: Canvas Utility Adapters
**Adapters:** `analyzeCanvas.ts`, `canvasSelectionManager.ts`

- [ ] **Analyze Canvas Adapter** - `lib/ai/adapters/tools/analyzeCanvas.ts`
  - [ ] **Dependency Injection**: Inject canvas analysis and reporting services
  - [ ] **Parameter Schema**: Define analysis parameters with detail levels
  - [ ] **Smart Conversion**: Handle analysis request descriptions
  - [ ] **Read-Only Pattern**: Implement as read-only adapter with caching
  - [ ] **Advanced Features**: Support comprehensive canvas analysis
  - [ ] **Performance**: Cache analysis results for similar requests
  - [ ] **Testing**: Test analysis with various canvas states

- [ ] **Canvas Selection Manager Adapter** - `lib/ai/adapters/tools/canvasSelectionManager.ts`
  - [ ] **Dependency Injection**: Inject selection management services
  - [ ] **Parameter Schema**: Define selection operations with criteria
  - [ ] **Smart Conversion**: Handle selection descriptions and operations
  - [ ] **Command Pattern**: SelectionCommand with selection state management
  - [ ] **Advanced Features**: Support complex selection operations
  - [ ] **Performance**: Optimize selection algorithms
  - [ ] **Testing**: Test selection operations with various criteria

#### Step 4.2: Execution and Enhancement Adapters
**Adapters:** `ChainAdapter.ts`, `PromptEnhancementAdapter.ts`

- [ ] **Chain Adapter** - `lib/ai/adapters/tools/ChainAdapter.ts`
  - [ ] **Dependency Injection**: Inject chain execution and orchestration services
  - [ ] **Parameter Schema**: Define chain parameters with step definitions
  - [ ] **Smart Conversion**: Parse complex chain descriptions
  - [ ] **Command Pattern**: ChainCommand with step-by-step execution
  - [ ] **Advanced Features**: Support conditional and parallel execution
  - [ ] **Performance**: Optimize chain execution pipeline
  - [ ] **Testing**: Test chain execution with various step combinations

- [ ] **Prompt Enhancement Adapter** - `lib/ai/adapters/tools/PromptEnhancementAdapter.ts`
  - [ ] **Dependency Injection**: Inject prompt analysis and enhancement services
  - [ ] **Parameter Schema**: Define prompt enhancement with improvement options
  - [ ] **Smart Conversion**: Analyze and enhance prompt descriptions
  - [ ] **Read-Only Pattern**: Implement as read-only adapter with intelligent caching
  - [ ] **Advanced Features**: Support context-aware prompt enhancement
  - [ ] **Performance**: Cache enhanced prompts for similar inputs
  - [ ] **Testing**: Test prompt enhancement with various input types

### Phase 5: Integration & Validation (Days 15-16)

#### Step 5.1: Adapter Registry and Auto-Discovery
- [ ] Update adapter registry to use new base classes
- [ ] Implement auto-discovery for all 30+ adapters
- [ ] Add adapter capability detection and routing
- [ ] Test adapter registration and discovery

#### Step 5.2: AI SDK v5 Integration
- [ ] Update all adapters to use proper AI SDK v5 patterns
- [ ] Ensure consistent `inputSchema` definitions
- [ ] Validate tool call and result formats
- [ ] Test AI SDK integration with new adapters

#### Step 5.3: Performance Testing
- [ ] Benchmark adapter execution times
- [ ] Test caching and batching performance
- [ ] Validate memory usage patterns
- [ ] Optimize bottlenecks identified

#### Step 5.4: Integration Testing
- [ ] Test all 30+ adapters with AI chat
- [ ] Verify tool execution through adapters
- [ ] Test error handling and recovery
- [ ] Validate event-driven communication

#### Step 5.5: Documentation and Examples
- [ ] Update adapter documentation
- [ ] Create examples for each adapter pattern
- [ ] Document parameter schemas and conversion
- [ ] Add troubleshooting guides

## Testing Strategy

### Unit Testing
- [ ] **Parameter Conversion**: Test all parameter types and conversions
- [ ] **Error Handling**: Test all error strategies and recovery
- [ ] **Behavior Composition**: Test behavior execution and composition
- [ ] **Plugin System**: Test plugin application and removal
- [ ] **Command Pattern**: Test command creation and execution

### Integration Testing
- [ ] **Tool Integration**: Test adapter-tool communication
- [ ] **AI Service Integration**: Test adapter-service communication
- [ ] **Event System**: Test event emission and handling
- [ ] **Dependency Injection**: Test service resolution and injection
- [ ] **Performance**: Test caching, batching, and optimization

### End-to-End Testing
- [ ] **AI Chat Integration**: Test complete chat-to-tool flow
- [ ] **Error Scenarios**: Test error handling in real scenarios
- [ ] **Performance**: Test under load with multiple adapters
- [ ] **User Experience**: Test responsiveness and reliability

### Regression Testing
- [ ] **Existing Functionality**: Ensure no breaking changes
- [ ] **API Compatibility**: Maintain AI SDK compatibility
- [ ] **Performance**: Ensure no performance regressions
- [ ] **Memory Usage**: Validate memory usage patterns

## Success Criteria

### Primary Goals (Architectural Improvements)
- ✅ 100% dependency injection compliance (zero singleton access)
- ✅ Type-safe parameter conversion across all 30+ adapters
- ✅ Consistent error handling and recovery patterns
- ✅ Event-driven communication throughout adapter system
- ✅ Command pattern integration for all canvas operations

### Secondary Goals (Code Quality)
- ✅ 60%+ reduction in code duplication across adapters
- ✅ Consistent patterns and interfaces across all adapters
- ✅ Comprehensive error handling with intelligent recovery
- ✅ Performance optimization through caching and batching
- ✅ Plugin architecture for extensibility

### Integration Goals
- ✅ Seamless AI SDK v5 integration with type safety
- ✅ Reliable tool execution through adapter layer
- ✅ Proper event propagation and state management
- ✅ Performance maintained or improved
- ✅ Zero breaking changes to existing functionality

### Developer Experience Goals
- ✅ Easy to create new adapters following established patterns
- ✅ Clear documentation and examples for all patterns
- ✅ Predictable behavior and debugging capabilities
- ✅ Comprehensive testing and validation tools
- ✅ Hot-reload friendly architecture

## Risk Mitigation

### High-Risk Changes
1. **BaseAdapter Complete Refactor** - Affects all 30+ adapters
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

### Medium-Risk Changes
1. **Error Handling System** - New error strategies
2. **Event-Driven Communication** - New communication patterns
3. **Performance Optimization** - Caching and batching systems
4. **Plugin Architecture** - Additional complexity

### Rollback Plan
- **Feature Flags**: All major systems can be toggled
- **Adapter-Level Rollback**: Individual adapter reversion
- **System-Level Rollback**: Complete architecture rollback
- **Gradual Migration**: Mix old and new systems during transition
- **Git Strategy**: Maintain working branches for each phase

### Monitoring and Validation
- **Performance Monitoring**: Adapter execution times, memory usage
- **Error Tracking**: Conversion failures, dependency issues
- **Integration Monitoring**: AI SDK communication, tool execution
- **Code Quality**: Test coverage, type safety, pattern compliance

## Progress Tracking

### Phase 1: Core Infrastructure (Days 1-4)
**Progress:** 0/10 steps complete (0%)
- [ ] Core types and interfaces (0%)
- [ ] Parameter conversion system (0%)
- [ ] Error handling system (0%)
- [ ] Behavior system (0%)
- [ ] Performance optimization (0%)
- [ ] Plugin architecture (0%)
- [ ] Enhanced BaseAdapter (0%)
- [ ] Specialized base classes (0%)
- [ ] Adapter factory system (0%)
- [ ] Service container updates (0%)

### Phase 2: Canvas Tool Adapters (Days 5-8)
**Progress:** 0/15 adapters migrated (0%)
- **Transform Adapters (5):** 0/5 complete (0%)
- **Adjustment Adapters (5):** 0/5 complete (0%)
- **Filter Adapters (5):** 0/5 complete (0%)

### Phase 3: AI Service Adapters (Days 9-12)
**Progress:** 0/11 adapters migrated (0%)
- **Generation Adapters (2):** 0/2 complete (0%)
- **Enhancement Adapters (3):** 0/3 complete (0%)
- **Editing Adapters (3):** 0/3 complete (0%)
- **Advanced Adapters (3):** 0/3 complete (0%)

### Phase 4: Utility Adapters (Days 13-14)
**Progress:** 0/4 adapters migrated (0%)
- **Canvas Utilities (2):** 0/2 complete (0%)
- **Execution Utilities (2):** 0/2 complete (0%)

### Phase 5: Integration & Validation (Days 15-16)
**Progress:** 0/5 steps complete (0%)
- [ ] Adapter registry updates (0%)
- [ ] AI SDK v5 integration (0%)
- [ ] Performance testing (0%)
- [ ] Integration testing (0%)
- [ ] Documentation (0%)

### Overall Progress Metrics
- **Total Adapters:** 30 adapters to migrate
- **Completed:** 0/30 (0%)
- **In Progress:** 0/30 (0%)
- **Infrastructure Steps:** 0/10 (0%)
- **Integration Steps:** 0/5 (0%)

### Quality Gates
- [ ] **Gate 1:** Core infrastructure compiles and passes tests
- [ ] **Gate 2:** First 5 adapters migrated and functional
- [ ] **Gate 3:** All canvas tool adapters working with new architecture
- [ ] **Gate 4:** All AI service adapters integrated and tested
- [ ] **Gate 5:** Performance benchmarks met or exceeded
- [ ] **Gate 6:** Full integration testing passed
- [ ] **Gate 7:** Production deployment ready

### Success Metrics
- **Code Duplication Reduction:** 60%+ reduction in duplicate code
- **Type Safety:** 100% type-safe parameter conversion
- **Performance:** Adapter execution time < 50ms, memory usage stable
- **Error Handling:** 95%+ error recovery success rate
- **Developer Experience:** New adapter creation time reduced by 70%

---

*Last Updated: [Date]*
*Next Review: [Date]* 