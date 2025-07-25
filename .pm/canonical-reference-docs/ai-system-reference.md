# FotoFun AI System - Canonical Reference

## Table of Contents
1. [Overview](#overview)
2. [Terminology and Architecture](#terminology-and-architecture)
3. [Karpathy Framework Implementation](#karpathy-framework-implementation)
4. [Core Architecture](#core-architecture)
5. [Tool System](#tool-system)
6. [Object & Region Detection](#object--region-detection)
7. [Orchestration & Intent Recognition](#orchestration--intent-recognition)
8. [Visual Feedback & Approval](#visual-feedback--approval)
9. [Quality Control & Evaluation](#quality-control--evaluation)
10. [Advanced Features](#advanced-features)
11. [Integration Patterns](#integration-patterns)
12. [Implementation Timeline](#implementation-timeline)

## Overview

The FotoFun AI system is built on AI SDK v5 beta and implements a comprehensive photo editing assistant that can understand natural language requests, identify objects and regions in images, and execute complex multi-step editing workflows. The system is designed following Andrej Karpathy's agent design framework, emphasizing human-AI collaboration through intelligent context management, generation with verification, and adjustable autonomy.

### Key Capabilities
- **Natural Language Understanding**: Parse user requests into actionable intents
- **Semantic Object Detection**: Identify and locate specific objects ("the hat", "his shirt")
- **Spatial Awareness**: Understand relative positions ("on the left", "below the logo")
- **Multi-Step Orchestration**: Execute complex workflows with dependency management
- **Visual Feedback**: Preview changes before applying
- **Quality Assurance**: AI-powered evaluation of edits
- **Autonomous Editing**: Self-correcting agents that iterate until satisfied

## Terminology and Architecture

### Established Nomenclature

The FotoFun codebase uses consistent terminology to maintain clarity across all components:

#### Component Hierarchy

1. **Canvas Tools** (Base Layer)
   - **Definition**: Core tools that directly manipulate the Fabric.js canvas
   - **Location**: `lib/editor/tools/`
   - **Examples**: `cropTool`, `brightnessTool`, `moveTool`
   - **Naming**: `[action]Tool` (camelCase, singleton instances)

2. **Tool Adapters** (AI Integration Layer)
   - **Definition**: Wrappers that make any tool AI-compatible by adding schemas and natural language understanding
   - **Location**: `lib/ai/adapters/tools/`
   - **Examples**: `CropToolAdapter`, `BrightnessToolAdapter`, `InpaintingToolAdapter`
   - **Naming**: `[ToolName]Adapter` (PascalCase classes)
   - **Key Feature**: Works for both Canvas Tools and AI-Native Tools

3. **AI-Native Tools** (External API Tools)
   - **Definition**: Tools that call external AI services (Replicate, DALL-E, etc.)
   - **Location**: `lib/ai/tools/`
   - **Examples**: `InpaintingTool`, `ImageGenerationTool`, `BackgroundRemovalTool`
   - **Naming**: `[Action]Tool` (PascalCase classes)
   - **Integration**: Also use Tool Adapters for AI chat compatibility

4. **Agent Steps** (Workflow Units)
   - **Definition**: Individual executable units within an agent workflow
   - **Location**: `lib/ai/agents/steps/`
   - **Types**: `ToolStep`, `EvaluationStep`, `PlanningStep`, `RoutingStep`
   - **Naming**: `[Type]Step` (PascalCase classes)

5. **Agents** (Workflow Orchestrators)
   - **Definition**: High-level coordinators that plan and execute multi-step workflows
   - **Location**: `lib/ai/agents/`
   - **Examples**: `SequentialEditingAgent`, `MasterRoutingAgent`
   - **Naming**: `[Pattern/Purpose]Agent` (PascalCase classes)

### Unified Adapter Pattern

The key architectural insight is that both Canvas Tools and AI-Native Tools use the exact same adapter pattern:

```typescript
// Canvas Tool Adapter
export class CropToolAdapter extends BaseToolAdapter<CropInput, CropOutput> {
  tool = cropTool  // References canvas tool
  aiName = 'cropImage'
  
  async execute(params: CropInput, context: { canvas: Canvas }) {
    // Manipulates canvas directly
    return this.tool.execute(params)
  }
}

// AI-Native Tool Adapter
export class InpaintingToolAdapter extends BaseToolAdapter<InpaintInput, InpaintOutput> {
  tool = new InpaintingTool()  // References AI service tool
  aiName = 'inpaintImage'
  
  async execute(params: InpaintInput, context: { canvas: Canvas }) {
    // 1. Extract image from canvas
    // 2. Call AI service
    // 3. Apply result to canvas
    const result = await this.tool.execute(params)
    return this.applyToCanvas(result, context.canvas)
  }
}

// Both register identically
adapterRegistry.register(new CropToolAdapter())
adapterRegistry.register(new InpaintingToolAdapter())
```

This unified approach means:
- The AI system doesn't need to know if a tool manipulates canvas or calls an API
- All tools follow the same registration and execution patterns
- New AI services can be added without changing core architecture
- Type safety is maintained throughout the system

## Karpathy Framework Implementation

Our system implements all five key principles from Andrej Karpathy's agent design framework:

### 1. Context Management - Solving "Anterograde Amnesia"

The system maintains comprehensive context across all operations to prevent the AI from "forgetting" important information:

```typescript
interface ToolExecutionContext {
  canvas: fabric.Canvas           // Current canvas state
  selection: fabric.Object[]      // Active selections
  conversation: Message[]         // Full chat history
  workflowState: {
    currentStep: number
    completedSteps: Step[]
    pendingSteps: Step[]
    results: Map<string, any>   // Results from previous steps
  }
  userPreferences: {
    autoApprovalThreshold: number
    preferredComparisonMode: ComparisonMode
    historicalChoices: Decision[]
  }
  imageAnalysis: {
    detectedObjects: DetectedObject[]
    semanticRegions: ImageRegions
    lastAnalyzedAt: number
  }
}
```

**Key Features:**
- **Workflow Memory**: Tracks all steps in multi-step operations
- **Object Persistence**: Remembers detected objects across operations
- **User Learning**: Adapts based on historical user decisions
- **State Preservation**: Maintains canvas state between operations

### 2. Generation + Verification Pattern

Every AI operation follows a strict generate-then-verify flow:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│ AI Generate │ --> │ Preview Gen  │ --> │ User Review │ --> │   Apply    │
│  Solution   │     │ + Confidence │     │ & Approve   │     │  Changes   │
└─────────────┘     └──────────────┘     └─────────────┘     └────────────┘
       │                                          │
       └──────────── Alternative ─────────────────┘
                    Suggestions
```

**Implementation Details:**
- **Preview Generation**: Every tool includes `previewGenerator` function
- **Confidence Scoring**: Operations include confidence levels
- **Alternative Paths**: AI suggests multiple approaches when confidence is low
- **Parameter Adjustment**: Users can fine-tune before applying

### 3. Incremental Processing

Complex tasks are automatically broken into reviewable chunks:

```typescript
// Example: "Make the photo look vintage and add text"
{
  steps: [
    {
      id: "1",
      tool: "adjustSaturation",
      params: { amount: -30 },
      checkpoint: true  // Create restore point
    },
    {
      id: "2", 
      tool: "applyVintageFilter",
      params: { style: "sepia" },
      dependencies: ["1"],
      requiresApproval: true  // Force user review
    },
    {
      id: "3",
      tool: "semanticText",
      params: { text: "Memories", placement: "bottom-right" },
      dependencies: ["2"]
    }
  ]
}
```

**Features:**
- **Step Dependencies**: Ensures logical order
- **Checkpoints**: Create restore points at critical stages
- **Progress Tracking**: Visual indicators for each step
- **Partial Execution**: Can pause/resume workflows

### 4. Visual Interface & Diff Visualization

Rich visual feedback makes verification fast and intuitive:

#### Comparison Modes
1. **Side-by-Side**: Classic before/after view
2. **Overlay**: Adjustable opacity overlay
3. **Difference Map**: Heatmap highlighting changes
4. **Interactive Slider**: Drag to reveal changes

#### Diff Visualization System
```typescript
class DiffGenerator {
  static async generateDiff(before: ImageData, after: ImageData): Promise<DiffResult> {
    return {
      pixelDiff: // Pixel-level changes
      structuralDiff: // SSIM-based structural changes
      perceptualDiff: // Human-perceptible differences
      changedRegions: // Bounding boxes of modified areas
      diffHeatmap: // Visual heatmap of changes
    }
  }
}
```

**Visual Elements:**
- **Real-time Preview Updates**: Parameter changes instantly update preview
- **Confidence Indicators**: Visual representation of AI confidence
- **Change Highlighting**: Clearly marks what will be modified
- **Progress Visualization**: Step-by-step progress bars

### 5. Partial Autonomy Controls - "Autonomy Sliders"

Users have granular control over AI independence:

```typescript
interface AutonomySettings {
  // Global Settings
  autoApprovalThreshold: number  // 0.0 - 1.0
  maxAutonomousSteps: number     // How many steps without approval
  
  // Per-Operation Settings
  operationPolicies: {
    'color-adjustment': 'auto-approve' | 'always-ask' | 'ask-if-unsure'
    'object-removal': 'always-ask'
    'text-addition': 'ask-if-unsure'
    'generation': 'always-ask'
  }
  
  // Learning Settings
  adaptFromHistory: boolean      // Learn from past decisions
  suggestionCount: 1 | 3 | 5     // How many alternatives to show
}
```

**Autonomy Features:**
- **Confidence-Based Routing**: Different thresholds for different operations
- **Operation-Specific Rules**: Set autonomy per operation type
- **Learning Mode**: System adapts based on approval/rejection patterns
- **Batch Autonomy**: Different rules for batch vs single operations
- **Emergency Stop**: Cancel all autonomous operations instantly

## Core Architecture

### Technology Stack
- **AI SDK**: v5 beta (with TypeScript)
- **LLM**: OpenAI GPT-4o for reasoning, GPT-4V for vision
- **Image Generation**: DALL-E 3 for generation, DALL-E 2 for editing
- **Canvas**: Fabric.js for manipulation
- **State Management**: Zustand
- **Framework**: Next.js 15 with React 19

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Canvas    │  │   AI Chat    │  │  Tool Palette    │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
┌─────────▼────────────────▼────────────────────▼─────────────┐
│                      AI Orchestration Layer                   │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────────┐    │
│  │   Intent   │  │    Task     │  │    Execution      │    │
│  │ Recognizer │  │   Planner   │  │   Coordinator     │    │
│  └────────────┘  └─────────────┘  └───────────────────┘    │
└──────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────┐
│                        Tool System                            │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────────┐    │
│  │    Tool    │  │    Tool     │  │   Tool Registry   │    │
│  │  Factory   │  │  Executors  │  │   & Discovery     │    │
│  └────────────┘  └─────────────┘  └───────────────────┘    │
└──────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────┐
│                    Vision & Detection Layer                   │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────────┐    │
│  │   Object   │  │  Semantic   │  │    Placement      │    │
│  │  Detector  │  │  Analyzer   │  │     Advisor       │    │
│  └────────────┘  └─────────────┘  └───────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Tool System

### Tool Adapter Architecture (Epic 5 - NEW)

The FotoFun AI system uses a scalable adapter pattern to make canvas tools AI-compatible:

```
┌─────────────────────────────────────────────────────────────┐
│                     Canvas Tools (UI)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │ Crop Tool  │  │ Move Tool  │  │ Brightness Tool    │    │
│  └──────┬─────┘  └────────────┘  └────────┬───────────┘    │
│         │                                  │                  │
│         ▼                                  ▼                  │
│  ┌─────────────────┐              ┌──────────────────┐      │
│  │ CropToolAdapter │              │ BrightnessAdapter│      │
│  └─────────┬───────┘              └────────┬─────────┘      │
│            │                                │                 │
└────────────┼────────────────────────────────┼─────────────────┘
             │                                │
┌────────────▼────────────────────────────────▼─────────────────┐
│                      Adapter Registry                          │
│  - Auto-registration of adapters                              │
│  - Dynamic tool discovery                                     │
│  - Unified tool interface                                     │
└────────────────────────────────────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────────────────────┐
│                      Tool Registry                             │
│  - Single source of truth for all AI tools                    │
│  - Both native AI tools and adapted canvas tools              │
│  - Consistent execution interface                             │
└────────────────────────────────────────────────────────────────┘
```

#### Key Design Principles

1. **DRY (Don't Repeat Yourself)**: Canvas tools work for both UI and AI
2. **Scalability**: Each tool adapter is independent
3. **Type Safety**: Full TypeScript support with generics
4. **Auto-discovery**: Tools automatically available to AI
5. **Consistent Interface**: All tools follow BaseToolAdapter pattern

#### Creating Tool Adapters

```typescript
// Step 1: Create adapter file
// lib/ai/adapters/tools/[toolname].ts

export class MyToolAdapter extends BaseToolAdapter<InputType, OutputType> {
  tool = myCanvasTool           // Reference to the actual canvas tool
  aiName = 'myAIToolName'       // Name AI will use
  aiDescription = '...'         // Help AI understand when to use it
  
  inputSchema = z.object({...}) // Zod schema for validation (AI SDK v5)
  outputSchema = z.object({...}) // Expected output structure
  
  async execute(params: InputType, canvas: Canvas): Promise<OutputType> {
    // Implementation that uses the canvas tool programmatically
  }
  
  // Optional methods
  canExecute?(canvas: Canvas): boolean
  generatePreview?(params: InputType, canvas: Canvas): Promise<PreviewResult>
}

// Step 2: Register in autoDiscoverAdapters()
adapterRegistry.register(new MyToolAdapter())
```

#### AI-Compatible vs Non-Compatible Tools

**AI-Compatible Tools** (parameter-based):
- ✅ **Crop Tool**: Takes x, y, width, height parameters
- ✅ **Brightness/Contrast**: Adjustment values
- ✅ **Filters**: Filter type and intensity
- ✅ **Resize**: Target dimensions
- ✅ **Rotate**: Angle in degrees
- ✅ **Color Adjustments**: HSL/RGB values

**Non-AI-Compatible Tools** (require mouse interaction):
- ❌ **Selection Tools**: Need mouse path drawing
- ❌ **Brush/Pencil**: Need freehand paths
- ❌ **Move Tool**: Needs object selection first
- ❌ **Hand/Zoom**: Navigation only
- ❌ **Pen Tool**: Vector path creation

The key distinction: AI can use tools that accept discrete parameters, not tools that require continuous mouse input.

#### Parameter Resolvers (Epic 5 Enhancement)

To bridge the gap between natural language and exact parameters, we introduce **Parameter Resolvers**:

```typescript
// Natural language input
"Crop 10% from all sides"
     ↓
CropParameterResolver
     ↓
// Resolved parameters
{ x: 100, y: 80, width: 800, height: 640 }
     ↓
CropToolAdapter.execute()
```

**Benefits:**
- Tools work with both natural language and exact parameters
- No need to wait for Epic 6's full orchestration
- Each tool can have its own resolver logic
- Progressive enhancement - add resolvers as needed

**Example Resolver Patterns:**
- **Percentage**: "crop 10%" → calculate from canvas dimensions
- **Relative**: "make it brighter" → adjustment: +20
- **Aspect Ratio**: "crop to square" → calculate center square
- **Semantic**: "crop to the person" → use object detection

### AI SDK v5 Tool Integration (Epic 5)

We use the AI SDK v5's native `tool()` function with our adapter pattern:

```typescript
// AI SDK v5 tool structure
import { tool } from 'ai'

const aiTool = tool({
  description: 'Clear description for AI',
  inputSchema: z.object({  // AI SDK v5 uses 'inputSchema'
    // Zod schema with explicit units
    value: z.number().min(0).max(100).describe('Value in percentage')
  }),
  execute: async (params) => {
    // Execution logic with canvas context
    const context = CanvasToolBridge.getCanvasContext()
    return adapter.execute(params, { canvas: context.canvas })
  }
})

// Our adapter pattern wraps this for consistency
export abstract class BaseToolAdapter<TInput, TOutput> {
  abstract inputSchema: z.ZodType<TInput>  // AI SDK v5 uses 'inputSchema'
  abstract description: string              // Clear, helpful description
  abstract execute(params: TInput, context: { canvas: Canvas }): Promise<TOutput>
  
  toAITool() {
    return tool({
      description: this.description,
      inputSchema: this.inputSchema,  // AI SDK v5 naming
      execute: async (params) => {
        // Bridge to canvas context
        const context = CanvasToolBridge.getCanvasContext()
        if (!context?.canvas) throw new Error('Canvas not available')
        return this.execute(params, { canvas: context.canvas })
      }
    }) as unknown as Tool<unknown, unknown>  // TypeScript workaround
  }
}
```

#### Key Learnings from Implementation

1. **Parameter Naming**: AI SDK v5 uses `inputSchema` not `parameters`
2. **TypeScript Challenges**: The `tool()` function has complex overloads requiring type casting
3. **Canvas Context**: Must be passed with every message, not just once
4. **Natural Language**: Let the AI model handle calculations, don't build resolvers

### Implementation Challenges & Solutions

#### 1. Canvas Initialization Race Condition

**Challenge**: The most significant issue discovered was a race condition between canvas initialization and AI tool execution. The canvas would report as "ready" but still be null when accessed.

**Root Cause**: 
- Asynchronous state updates in Zustand
- Multiple state updates during initialization
- Promises capturing stale closures
- Mixing imperative (promises) and declarative (state) patterns

**Solution Attempts**:
```typescript
// Atomic state updates
set({
  fabricCanvas: canvas,
  selectionManager: manager,
  selectionRenderer: renderer,
  isReady: true  // All in one update
})

// Better ready checking
waitForReady: async () => {
  const state = get()
  if (state.isReady && state.fabricCanvas) {
    return Promise.resolve()
  }
  // ... wait logic with timeout
}
```

**Architectural Recommendation**: Move to a state machine pattern for initialization rather than boolean flags.

#### 2. Natural Language Parameter Resolution

**Challenge**: Users expect to say "crop 50%" but tools need exact pixel coordinates.

**Initial Approach**: Build parameter resolvers for each tool
```typescript
// We tried this but abandoned it
class CropParameterResolver {
  resolve(input: string, canvas: Canvas) {
    // Complex parsing logic
  }
}
```

**Final Solution**: Use AI model's capability
```typescript
// In system prompt
`Current canvas: ${width}x${height} pixels
Examples:
- "crop 50%": For 1000x800 → x:250, y:200, width:500, height:400`
```

**Learning**: Don't fight the AI model - it's already good at math and understanding context.

#### 3. Tool Discovery & Registration

**Challenge**: Managing tool registration across the codebase without circular dependencies.

**Solution**: Dynamic imports with auto-discovery
```typescript
async function autoDiscoverAdapters() {
  const adapters = [
    import('./tools/crop'),
    import('./tools/brightness'),
    // ... more adapters
  ]
  
  for (const adapterImport of adapters) {
    const { default: Adapter } = await adapterImport
    adapterRegistry.register(new Adapter())
  }
}
```

#### 4. Message Format Complexity

**Challenge**: AI SDK v5 beta has various message part formats for tool invocations.

**Solution**: Defensive parsing
```typescript
if (part.type === 'tool-invocation' || 
    part.type?.startsWith('tool-') || 
    (part as any).toolInvocation) {
  // Handle all possible formats
}
```

#### 5. Canvas Context Persistence

**Challenge**: Canvas context was lost between messages, causing AI to lose track of image dimensions.

**Solution**: Include context with every message
```typescript
sendMessage(
  { text: input },
  { body: { canvasContext: {
    dimensions: { width, height },
    hasContent: true
  }}}
)
```

### Best Practices Established

1. **Extensive Logging**: Essential for debugging async issues
   ```typescript
   console.log('[Component] State:', {
     isReady: state.isReady,
     hasCanvas: !!state.fabricCanvas,
     timestamp: Date.now()
   })
   ```

2. **Defensive Programming**: Always verify canvas state
   ```typescript
   if (!canvas) throw new Error('Canvas not available')
   if (canvas.getObjects().length === 0) throw new Error('No image loaded')
   ```

3. **User-Friendly Errors**: 
   ```typescript
   // ❌ "Canvas is null"
   // ✅ "Please load an image before using AI tools"
   ```

4. **Singleton Tools**: Export instances, not classes
   ```typescript
   export const cropTool = new CropTool()  // ✅
   export class CropTool { }  // ❌
   ```

### Architecture Insights

The current architecture reveals several patterns:

**What Works Well**:
- Adapter pattern for tool integration
- Separation of AI and canvas concerns
- Auto-discovery for scalability
- Single implementation for UI and AI

**What Needs Improvement**:
- Canvas initialization state management
- Promise-based initialization pattern
- Multiple sources of truth for "ready" state
- Lack of state machine for initialization flow

**Recommendations for Future Epics**:
1. Consider state machines for complex flows
2. Implement transaction patterns for multi-step operations
3. Add operation queuing for better control
4. Build proper abstraction over canvas operations

### Tool Categories

#### Parameter-Based Tools (AI Compatible)
Tools that accept discrete parameters and can be controlled by AI:
- **Adjustments**: brightness, contrast, saturation, exposure, highlights/shadows
- **Filters**: blur, sharpen, noise reduction, black & white, vintage
- **Transforms**: crop, resize, rotate, flip
- **Colors**: hue/saturation/lightness, color balance, vibrance
- **Text**: add text with position and style
- **Shapes**: rectangles, circles, polygons with dimensions

#### Interactive Tools (Not AI Compatible)
Tools requiring mouse/touch interaction:
- **Selection**: marquee, lasso, magic wand (require drawing paths)
- **Drawing**: brush, pencil, eraser (require freehand input)
- **Navigation**: hand, zoom (viewport control only)
- **Vector**: pen tool, bezier curves (require path creation)

#### Future Semantic Tools (Epic 9)
- **semanticErase**: Erase objects by description ("remove the hat")
- **semanticText**: Add text with intelligent placement ("add 'SALE' on his shirt")
- **semanticTransform**: Transform specific objects ("make the car bigger")
- **aiSelect**: Select objects by description ("select all people")

### Tool Execution Flow

```
User Request → AI Chat → Tool Selection → Parameter Validation
     ↓                                            ↓
Canvas Bridge ← Tool Adapter ← AI SDK v5 Tool ← Zod Schema
     ↓
Canvas Update → Result → AI Response → User
```

### Creating AI-Compatible Tools (Epic 5 Pattern)

1. **Create Canvas Tool** (if not exists)
   ```typescript
   // lib/tools/brightnessTool.ts
   export const brightnessTool: Tool = {
     id: 'brightness',
     name: 'Brightness',
     // ... standard tool implementation
   }
   ```

2. **Create Tool Adapter**
   ```typescript
   // lib/ai/adapters/tools/brightness.ts
   export class BrightnessToolAdapter extends BaseToolAdapter<Input, Output> {
     tool = brightnessTool
     aiName = 'adjustBrightness'
     description = 'Adjust brightness from -100 (darkest) to 100 (brightest)'
           inputSchema = z.object({
        adjustment: z.number().min(-100).max(100)
          .describe('Brightness adjustment value')
      })
     
     async execute(params, context) {
       // Implementation using canvas
     }
   }
   ```

3. **Register Adapter**
   ```typescript
   // In autoDiscoverAdapters()
   adapterRegistry.register(new BrightnessToolAdapter())
   ```

4. **Tool Available in AI Chat**
   - AI automatically knows about the tool
   - Descriptions included in system prompt
   - Type-safe parameter validation

## Object & Region Detection

### Two-Tier Detection System

#### Tier 1: Basic Target Areas (Epic 5)
Simple targeting for basic operations:
- `whole-image`: Apply to entire canvas
- `selection`: Apply to current selection
- `layer`: Apply to specific layer

#### Tier 2: Semantic Detection (Epic 9)
Advanced AI-powered detection using GPT-4V:

```typescript
// Object Detection
ObjectDetector.detectObjects(image, "the red hat")
// Returns: [{
//   id: "obj_1",
//   label: "red baseball cap",
//   confidence: 0.92,
//   bounds: { x: 120, y: 50, width: 80, height: 60 },
//   polygon: [{ x: 120, y: 50 }, ...],
//   attributes: { color: "red", type: "baseball cap" }
// }]

// Semantic Analysis
SemanticAnalyzer.analyzeImageRegions(image)
// Returns comprehensive breakdown:
// - people: [{ id, bounds, parts: { face, shirt, ... } }]
// - objects: [{ id, type, wornBy, color, ... }]
// - text: [{ content, bounds, fontSize, ... }]
// - emptyAreas: [{ bounds, suitableFor: ['text', 'logo'] }]
```

### Spatial Understanding

The system understands:
- **Possessive references**: "his shirt", "the person's hat"
- **Relative positions**: "on the left", "below the logo", "next to the car"
- **Object relationships**: Tracks which objects belong to which people
- **Contextual placement**: Suggests appropriate locations for additions

## Orchestration & Intent Recognition

### Context-Aware Intent Recognition (Epic 6)

The system maintains full context to understand complex, multi-part requests:

```typescript
interface IntentWithContext {
  // What the user wants
  primaryIntent: 'adjust-colors' | 'apply-effects' | 'semantic-edit' | ...
  confidence: number
  
  // Extracted entities with context
  entities: {
    targets: ['specific-object', ...]
    objects: ["hat", "person's shirt"]  // With ownership relationships
    spatialReferences: ["on the left", "below the logo"]
    adjustments: ["brightness", "contrast"]
    parameters: { amount: 50 }
  }
  
  // Context from conversation
  referenceContext: {
    pronounReferences: Map<string, string>  // "it" -> "the hat"
    previousOperations: Operation[]         // What we did before
    userCorrections: Correction[]           // Learning from mistakes
  }
  
  suggestedTools: ["semanticErase", "adjustBrightness"]
  complexity: 'simple' | 'moderate' | 'complex'
}
```

### Incremental Processing with Orchestrator-Worker Pattern

The orchestrator breaks complex tasks into manageable, reviewable chunks:

```typescript
class FotoFunOrchestrator {
  async orchestrate(request: string, context: CanvasContext) {
    // 1. Parse into incremental steps
    const plan = await this.createIncrementalPlan(request, context)
    
    // 2. Present plan for review (optional based on complexity)
    if (plan.complexity === 'complex') {
      await this.presentPlanForApproval(plan)
    }
    
    // 3. Execute incrementally
    for (const batch of plan.batches) {
      // Execute parallel operations in batch
      const results = await this.executeBatch(batch)
      
      // Checkpoint after each batch
      await this.createCheckpoint(batch.id)
      
      // Update context for next batch
      context = this.updateContext(context, results)
      
      // Allow user intervention between batches
      if (batch.requiresReview) {
        await this.pauseForReview(results)
      }
    }
  }
  
  private createIncrementalPlan(request: string, context: CanvasContext) {
    // Break into logical chunks
    return {
      batches: [
        {
          id: 'prepare',
          steps: [/* preparation steps */],
          canRunInParallel: true,
          requiresReview: false
        },
        {
          id: 'main-edit',
          steps: [/* main editing steps */],
          canRunInParallel: false,
          requiresReview: true
        },
        {
          id: 'finishing',
          steps: [/* finishing touches */],
          canRunInParallel: true,
          requiresReview: false
        }
      ],
      complexity: this.assessComplexity(request),
      estimatedDuration: this.estimateDuration(request)
    }
  }
}
```

### Workflow Memory & State Management

```typescript
interface WorkflowState {
  id: string
  startedAt: number
  
  // Maintain complete history
  history: {
    steps: ExecutedStep[]
    decisions: UserDecision[]
    rollbacks: Rollback[]
  }
  
  // Current state
  current: {
    step: number
    batch: number
    results: Map<string, any>
    detectedObjects: DetectedObject[]  // Persisted across steps
  }
  
  // Future steps with context
  pending: {
    steps: PlannedStep[]
    dependencies: DependencyGraph
    alternatives: Map<string, Alternative[]>
  }
  
  // Checkpoints for rollback
  checkpoints: {
    id: string
    step: number
    canvasState: string
    timestamp: number
  }[]
}
```

### Example: Complex Workflow with Context Preservation

```typescript
// User: "Remove all the people except the one in the middle, then make it look like sunset"
{
  batches: [
    {
      id: 'analyze',
      steps: [
        { 
          tool: 'semanticAnalyze',
          purpose: 'Identify all people and determine middle person'
        }
      ]
    },
    {
      id: 'remove-people',
      steps: [
        { 
          tool: 'semanticErase',
          params: { target: 'person-1' },
          context: { preserving: 'person-middle' }
        },
        { 
          tool: 'semanticErase',
          params: { target: 'person-3' },
          context: { preserving: 'person-middle' }
        }
      ],
      requiresReview: true  // Show user what will be removed
    },
    {
      id: 'sunset-effect',
      steps: [
        { tool: 'adjustColorTemperature', params: { warmth: 80 } },
        { tool: 'adjustExposure', params: { amount: -20 } },
        { tool: 'addGradientOverlay', params: { colors: ['orange', 'purple'] } }
      ],
      requiresReview: true
    }
  ]
}
```

## Visual Feedback & Approval

### Generation + Verification Pattern (Epic 7)

This is the core implementation of Karpathy's generation + verification principle:

#### Approval Dialog System
```typescript
interface ApprovalRequest {
  id: string
  operation: string
  params: any
  confidence: number
  preview: {
    before: string      // base64
    after: string       // base64
    diff?: string       // base64 difference map
  }
  alternatives?: Alternative[]
  explanation: string   // Human-readable explanation
  estimatedImpact: {
    pixelsAffected: number
    percentageChanged: number
    reversible: boolean
  }
}
```

#### Visual Comparison Implementation

```typescript
// Four distinct comparison modes for different verification needs
interface ComparisonMode {
  'side-by-side': { 
    before: Image, 
    after: Image,
    syncZoom: boolean,      // Synchronized zoom/pan
    highlightDiffs: boolean // Outline changed areas
  }
  'overlay': { 
    base: Image, 
    overlay: Image, 
    opacity: number,        // 0-100 slider
    blendMode: BlendMode    // normal, difference, etc.
  }
  'difference': { 
    diff: Image,            // Heatmap of changes
    highlights: Region[],   // Specific areas changed
    threshold: number       // Sensitivity setting
  }
  'slider': { 
    images: [Image, Image], 
    position: number,       // 0-100 slider position
    orientation: 'vertical' | 'horizontal'
  }
}
```

#### Interactive Parameter Adjustment
```typescript
// Real-time parameter updates with instant preview
export function ParameterAdjustment({ tool, params, onChange }) {
  const [preview, setPreview] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Debounced preview generation
  const updatePreview = useDebouncedCallback(async (newParams) => {
    setIsUpdating(true)
    const newPreview = await tool.previewGenerator(newParams, context)
    setPreview(newPreview)
    setIsUpdating(false)
  }, 300)
  
  return (
    <div className="space-y-4">
      {/* Dynamic UI based on tool schema */}
      {Object.entries(tool.inputSchema.shape).map(([key, schema]) => (
        <ParameterField
          key={key}
          schema={schema}
          value={params[key]}
          onChange={(value) => {
            const newParams = { ...params, [key]: value }
            onChange(newParams)
            updatePreview(newParams)
          }}
        />
      ))}
      
      {/* Live preview update indicator */}
      {isUpdating && <LoadingSpinner />}
    </div>
  )
}
```

### Confidence-Based Routing

Intelligent routing based on multiple factors:

```typescript
class ConfidenceRouter {
  route(operation: string, params: any, confidence: number): RoutingDecision {
    // Multi-factor decision making
    const factors = {
      operationRisk: this.assessOperationRisk(operation),
      parameterMagnitude: this.assessParameterImpact(params),
      userHistory: this.getUserTrustLevel(operation),
      imageComplexity: this.assessImageComplexity()
    }
    
    // Weighted decision
    if (confidence > 0.8 && factors.operationRisk < 0.3) {
      return { action: 'auto-approve', showQuickPreview: true }
    } else if (confidence > 0.5) {
      return { action: 'show-comparison', suggestAlternatives: false }
    } else {
      return { action: 'require-approval', suggestAlternatives: true }
    }
  }
}
```

## Quality Control & Evaluation

### AI-Powered Quality Assessment (Epic 8)

```typescript
class QualityEvaluator {
  static async evaluate(
    before: string,
    after: string,
    intent: string,
    operations: string[]
  ): Promise<QualityScore> {
    // Uses GPT-4V to assess:
    // - Technical quality (sharpness, artifacts, color accuracy)
    // - Aesthetic quality (composition, balance, appeal)
    // - Intent fulfillment (did we achieve the goal?)
    // - Coherence (does it look natural?)
  }
}
```

### Iterative Optimization

The system can automatically iterate to improve results:
1. Apply initial parameters
2. Evaluate quality
3. Adjust parameters based on evaluation
4. Repeat until quality threshold met or max iterations

### A/B Testing System

For operations with multiple approaches:
- Generate variations with different parameters
- Present to user for selection
- Learn from choices to improve future suggestions

## Advanced Features

### Image Generation (Epic 9)
- **Text-to-Image**: Generate new images from descriptions
- **Inpainting**: Fill selected areas with AI-generated content
- **Outpainting**: Extend image boundaries
- **Style Transfer**: Apply artistic styles to photos

### Autonomous Agents (Epic 9)
Self-correcting agents that:
1. Plan approach based on goal
2. Execute operations
3. Evaluate results using computer vision
4. Adjust and retry if needed
5. Learn from successes/failures

### Batch Processing (Epic 9)
Process multiple images with:
- Parallel execution with concurrency control
- Progress tracking
- Quality checks
- Failure recovery
- Consistent results across batch

## Integration Patterns

### API Route Integration

```typescript
// app/api/ai/chat/route.ts
const result = streamText({
  model: openai('gpt-4o'),
  messages,
  tools: {
    ...toolRegistry.toAISDKTools(),
    orchestrate: orchestrationTool,
    computerUse: computerUseTool,
    generateImage: imageGenerationTool
  },
  maxSteps: 10,
  system: enhancedSystemPrompt
})
```

### Client-Side Execution

```typescript
// Handle tool execution on client
const ClientToolExecutor = {
  execute: async (toolName, params, context) => {
    const tool = toolRegistry.get(toolName)
    
    // Validate canvas state
    if (tool.requiresCanvas && !context.canvas) {
      throw new Error('Canvas required')
    }
    
    // Execute with progress tracking
    return await tool.clientExecutor(params, context)
  }
}
```

### State Management Integration

```typescript
// Zustand stores coordinate between AI and UI
useCanvasStore.setState({ 
  isAIProcessing: true,
  aiOperation: 'Removing hat...'
})
```

## Implementation Timeline

### Phase 1: Foundation (Epic 5)
- Tool factory pattern
- Basic adjustment tools
- Canvas integration
- **Status**: Ready to implement

### Phase 2: Orchestration (Epic 6)
- Intent recognition
- Multi-step workflows
- Dependency management
- **Dependencies**: Epic 5

### Phase 3: Visual Feedback (Epic 7)
- Preview generation
- Approval dialogs
- Comparison modes
- **Dependencies**: Epic 5

### Phase 4: Quality Control (Epic 8)
- AI evaluation
- Iterative optimization
- A/B testing
- **Dependencies**: Epic 5, 6

### Phase 5: Advanced Features (Epic 9)
- Semantic detection
- Image generation
- Autonomous agents
- **Dependencies**: Epic 5, 6
- **Effort**: 10-12 days (increased due to semantic features)

### Phase 6: Production Readiness (Epic 10)
- Error handling
- Rate limiting
- Caching
- Monitoring
- **Dependencies**: All previous epics

## Best Practices

### Tool Development
1. Always include confidence scoring
2. Implement preview generation for visual changes
3. Handle edge cases gracefully
4. Provide meaningful error messages
5. Support cancellation for long operations

### Vision Integration
1. Use GPT-4V for complex understanding
2. Cache detection results when possible
3. Provide fallbacks for detection failures
4. Validate bounds before applying operations

### Performance Optimization
1. Execute operations in parallel when possible
2. Use web workers for heavy computations
3. Implement progressive rendering
4. Stream results when applicable

### Error Handling
1. Validate inputs at every layer
2. Provide recovery mechanisms
3. Log errors for debugging
4. Degrade gracefully

## Security Considerations

### Input Validation
- Sanitize all user inputs
- Validate image dimensions
- Check file sizes
- Prevent prompt injection

### API Security
- Rate limit AI API calls
- Monitor usage patterns
- Implement cost controls
- Secure API keys

### Content Moderation
- Filter inappropriate requests
- Validate generated content
- Implement user reporting
- Maintain audit logs

## Summary: Karpathy Framework Compliance

Our FotoFun AI system fully implements Andrej Karpathy's agent design framework:

### ✅ Context Management
- **Comprehensive context preservation** across all operations
- **Workflow memory** maintains state between steps
- **Object persistence** remembers detected items
- **Learning from history** adapts to user preferences

### ✅ Generation + Verification
- **Every operation previewed** before applying
- **Multiple comparison modes** for easy verification
- **Alternative suggestions** when confidence is low
- **Real-time parameter adjustment** with instant preview

### ✅ Incremental Processing
- **Complex tasks broken down** into reviewable batches
- **Checkpoints** at critical stages
- **Dependencies managed** automatically
- **Pause/resume** capabilities

### ✅ Visual Interface
- **Rich diff visualization** with heatmaps
- **Interactive comparison tools** (slider, overlay, side-by-side)
- **Progress indicators** for transparency
- **Confidence visualization** for trust building

### ✅ Partial Autonomy
- **Adjustable autonomy levels** globally and per-operation
- **Learning from decisions** to improve over time
- **Emergency stop** for user control
- **Batch vs. single operation** different rules

The system goes beyond basic requirements by adding semantic understanding, quality evaluation, and production-ready features while maintaining the human-in-the-loop philosophy central to Karpathy's vision.

### Client-Server Tool Execution Architecture

#### The Dual Execution Pattern

The AI SDK v5 executes tools in two phases:

1. **Server-Side (Planning Phase)**:
   - AI decides which tool to use
   - Validates parameters against schema
   - Returns tool selection to client
   - Does NOT perform actual canvas operations

2. **Client-Side (Execution Phase)**:
   - Receives tool selection from server
   - Executes actual canvas manipulation
   - Has access to DOM and Fabric.js
   - Returns results to user

#### Implementation Pattern

```typescript
// Server-side adapter registration (for AI understanding)
// app/api/ai/chat/route.ts
await autoDiscoverAdapters()
const tools = adapterRegistry.getAITools()

// Client-side adapter registration (for execution)
// lib/ai/client/tool-executor.ts
await autoDiscoverAdapters()
const tool = adapterRegistry.get(toolName)
```

#### Why This Architecture?

1. **Canvas requires DOM**: Fabric.js needs browser environment
2. **AI needs tool schemas**: Server must know available tools
3. **Separation of concerns**: AI decides, client executes
4. **Type safety**: Both sides use same adapter definitions

#### Common Pitfalls

1. **Don't execute canvas operations on server** - Return placeholder
2. **Register adapters on both sides** - Same registry, different instances
3. **Pass canvas context with messages** - AI needs dimensions
4. **Use fresh state in callbacks** - Avoid React stale closures 