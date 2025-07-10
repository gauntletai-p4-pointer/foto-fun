# FotoFun Terminology Guide

This document establishes consistent terminology and naming conventions for the FotoFun codebase.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                           │
│                   (Canvas, Chat, Tools)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                        Agents                                │
│              (Workflow Orchestrators)                        │
│    SequentialEditingAgent, MasterRoutingAgent, etc.         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     Agent Steps                              │
│               (Workflow Building Blocks)                     │
│        ToolStep, EvaluationStep, PlanningStep, etc.         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Tool Adapters                             │
│              (AI Compatibility Layer)                        │
│     Makes any tool AI-compatible with schemas               │
└─────────────┬─────────────────────────┬─────────────────────┘
              │                         │
┌─────────────▼──────────┐ ┌───────────▼─────────────────────┐
│    Canvas Tools        │ │      AI-Native Tools            │
│  (Canvas Manipulation) │ │    (External AI APIs)           │
│  cropTool, moveTool    │ │  InpaintingTool, GenTool       │
└────────────────────────┘ └─────────────────────────────────┘
```

## Component Definitions

### 1. Canvas Tools
**Definition**: Core tools that directly manipulate the Fabric.js canvas through user interaction or programmatic control.

**Characteristics**:
- Implement the base `Tool` interface
- Can be used directly in the UI
- Handle mouse/keyboard events
- Manipulate canvas objects

**Location**: `lib/editor/tools/`

**Naming Convention**: `[action]Tool` (camelCase, exported as singleton instances)

**Examples**:
```typescript
export const cropTool = new CropTool()
export const brightnessTool = new BrightnessTool()
export const moveTool = new MoveTool()
```

### 2. Tool Adapters
**Definition**: Wrappers that make any tool (Canvas or AI-Native) compatible with the AI system by adding input schemas, natural language descriptions, and execution logic.

**Characteristics**:
- Extend `BaseToolAdapter<TInput, TOutput>`
- Define Zod schemas for validation
- Provide AI-friendly descriptions
- Handle both server-side planning and client-side execution

**Location**: `lib/ai/adapters/tools/`

**Naming Convention**: `[ToolName]Adapter` (PascalCase classes)

**Examples**:
```typescript
export class CropToolAdapter extends BaseToolAdapter<CropInput, CropOutput> { }
export class BrightnessToolAdapter extends BaseToolAdapter<BrightnessInput, BrightnessOutput> { }
export class InpaintingToolAdapter extends BaseToolAdapter<InpaintInput, InpaintOutput> { }
```

### 3. AI-Native Tools
**Definition**: Tools that exist purely for AI functionality, typically calling external AI services like Replicate, OpenAI, or other APIs.

**Characteristics**:
- Don't directly manipulate canvas
- Make API calls to AI services
- Return results that need canvas integration
- Also require Tool Adapters for AI chat

**Location**: `lib/ai/tools/`

**Naming Convention**: `[Action]Tool` (PascalCase classes)

**Examples**:
```typescript
export class InpaintingTool { }      // Calls Replicate API
export class ImageGenerationTool { } // Calls DALL-E
export class BackgroundRemovalTool { } // Calls remove.bg
```

### 4. Agent Steps
**Definition**: Individual, atomic units of work within an agent workflow. Each step has a specific purpose and can be executed independently.

**Characteristics**:
- Implement the `AgentStep` interface
- Have a single responsibility
- Can generate previews
- May require approval
- Can inject dynamic next steps

**Location**: `lib/ai/agents/steps/`

**Naming Convention**: `[Type]Step` (PascalCase classes)

**Types**:
- `ToolStep`: Executes a tool (via adapter)
- `EvaluationStep`: Assesses quality or results
- `PlanningStep`: Determines next actions
- `RoutingStep`: Chooses execution path

**Examples**:
```typescript
const cropStep = new ToolStep({
  tool: 'cropImage',
  params: { x: 0, y: 0, width: 100, height: 100 }
})

const evaluateStep = new EvaluationStep({
  metric: 'image-quality',
  threshold: 0.8
})
```

### 5. Agents
**Definition**: High-level orchestrators that plan and execute multi-step workflows. They implement the Karpathy framework principles.

**Characteristics**:
- Extend `BaseAgent`
- Plan workflows from natural language
- Manage execution with verification
- Handle approvals and alternatives
- Maintain workflow memory

**Location**: `lib/ai/agents/`

**Naming Convention**: `[Pattern/Purpose]Agent` (PascalCase classes)

**Examples**:
```typescript
export class SequentialEditingAgent extends BaseAgent { }
export class EvaluatorOptimizerAgent extends BaseAgent { }
export class MasterRoutingAgent extends BaseAgent { }
```

### 6. Workflows
**Definition**: The execution plan created by an agent, consisting of steps, dependencies, and metadata.

**Characteristics**:
- Not a class, but a data structure
- Contains ordered steps
- Defines dependencies
- Includes checkpoints
- Specifies approval requirements

**Structure**:
```typescript
interface Workflow {
  id: string
  description: string
  steps: AgentStep[]
  dependencies: Map<string, string[]>
  checkpoints: string[]
  estimatedDuration: number
  complexity: 'simple' | 'moderate' | 'complex'
}
```

## Directory Structure

```
lib/
├── editor/
│   └── tools/                    # Canvas Tools
│       ├── base/
│       │   └── BaseTool.ts
│       ├── transform/
│       │   ├── cropTool.ts
│       │   └── rotateTool.ts
│       └── adjustments/
│           └── brightnessTool.ts
│
└── ai/
    ├── adapters/                 # Tool Adapters
    │   ├── base.ts              # BaseToolAdapter
    │   ├── registry.ts          # Adapter registry
    │   └── tools/
    │       ├── crop.ts          # Canvas tool adapters
    │       ├── brightness.ts
    │       └── inpainting.ts    # AI-native tool adapters
    │
    ├── tools/                   # AI-Native Tools
    │   ├── base.ts             # BaseAITool
    │   ├── inpainting.ts
    │   └── generation.ts
    │
    ├── agents/                  # Agents
    │   ├── base.ts             # BaseAgent
    │   ├── factory.ts
    │   ├── SequentialEditingAgent.ts
    │   └── MasterRoutingAgent.ts
    │
    └── steps/                   # Agent Steps
        ├── base.ts             # BaseStep
        ├── ToolStep.ts
        └── EvaluationStep.ts
```

## Usage Examples

### Canvas Tool → Adapter → AI
```typescript
// 1. Canvas tool exists
const cropTool = new CropTool()

// 2. Adapter makes it AI-compatible
const cropAdapter = new CropToolAdapter()
cropAdapter.tool = cropTool

// 3. Register for AI use
adapterRegistry.register(cropAdapter)

// 4. AI can now use it
"crop the image to square" → AI selects 'cropImage' → executes via adapter
```

### AI-Native Tool → Adapter → AI
```typescript
// 1. AI-native tool for external API
const inpaintingTool = new InpaintingTool()

// 2. Adapter integrates with canvas
const inpaintAdapter = new InpaintingToolAdapter()
inpaintAdapter.tool = inpaintingTool

// 3. Register (same as canvas tools!)
adapterRegistry.register(inpaintAdapter)

// 4. AI uses it identically
"remove the car" → AI selects 'inpaintImage' → executes via adapter
```

### Agent Workflow
```typescript
// User request
"Make this photo look vintage with a warm sunset feel"

// Agent plans workflow
const agent = new SequentialEditingAgent()
const workflow = await agent.plan(request)

// Workflow contains steps
[
  new ToolStep({ tool: 'adjustSaturation', params: { amount: -30 } }),
  new ToolStep({ tool: 'adjustColorTemperature', params: { warmth: 60 } }),
  new ToolStep({ tool: 'applyVintageFilter', params: { style: 'sepia' } }),
  new EvaluationStep({ metric: 'aesthetic-quality' })
]
```

## Best Practices

1. **Consistent Naming**: Always follow the established conventions
2. **Single Responsibility**: Each component should do one thing well
3. **Adapter Pattern**: All AI-accessible tools must have adapters
4. **Type Safety**: Use TypeScript generics for input/output types
5. **Documentation**: Include clear descriptions for AI understanding

## Future Considerations

As we add more AI services and capabilities:

1. **New AI Services**: Create as AI-Native Tools with Adapters
2. **Complex Workflows**: Create new Agent types
3. **New Step Types**: Extend the step system as needed
4. **External Integrations**: Follow the same adapter pattern

This terminology guide should be updated as the system evolves to maintain consistency across the growing codebase. 