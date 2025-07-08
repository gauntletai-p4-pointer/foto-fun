# FotoFun AI System - Canonical Reference

## Table of Contents
1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [Tool System](#tool-system)
4. [Object & Region Detection](#object--region-detection)
5. [Orchestration & Intent Recognition](#orchestration--intent-recognition)
6. [Visual Feedback & Approval](#visual-feedback--approval)
7. [Quality Control & Evaluation](#quality-control--evaluation)
8. [Advanced Features](#advanced-features)
9. [Integration Patterns](#integration-patterns)
10. [Implementation Timeline](#implementation-timeline)

## Overview

The FotoFun AI system is built on AI SDK v5 beta and implements a comprehensive photo editing assistant that can understand natural language requests, identify objects and regions in images, and execute complex multi-step editing workflows.

### Key Capabilities
- **Natural Language Understanding**: Parse user requests into actionable intents
- **Semantic Object Detection**: Identify and locate specific objects ("the hat", "his shirt")
- **Spatial Awareness**: Understand relative positions ("on the left", "below the logo")
- **Multi-Step Orchestration**: Execute complex workflows with dependency management
- **Visual Feedback**: Preview changes before applying
- **Quality Assurance**: AI-powered evaluation of edits
- **Autonomous Editing**: Self-correcting agents that iterate until satisfied

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

### Tool Factory Pattern (Epic 5)

The tool factory creates standardized tools that work with AI SDK v5:

```typescript
interface FotoFunTool {
  name: string
  category: 'filter' | 'transform' | 'edit' | 'selection' | 'text' | 'generation'
  description: string
  inputSchema: z.ZodType
  outputSchema: z.ZodType
  executionSide: 'client' | 'server' | 'both'
  requiresCanvas: boolean
  requiresSelection?: boolean
  confidenceThreshold?: number
  
  clientExecutor?: (input: unknown, context: ToolExecutionContext) => Promise<unknown>
  serverExecutor?: (input: unknown, context: ToolExecutionContext) => Promise<unknown>
  previewGenerator?: (input: unknown, context: ToolExecutionContext) => Promise<PreviewResult>
}
```

### Tool Categories

#### Basic Tools (Epic 5)
- **Adjustments**: brightness, contrast, saturation, exposure, highlights/shadows
- **Filters**: blur, sharpen, noise reduction, black & white, vintage
- **Transforms**: crop, resize, rotate, flip
- **Target Areas**: whole-image, selection, layer

#### Semantic Tools (Epic 9)
- **semanticErase**: Erase objects by description ("remove the hat")
- **semanticText**: Add text with intelligent placement ("add 'SALE' on his shirt")
- **semanticTransform**: Transform specific objects ("make the car bigger")
- **aiSelect**: Select objects by description ("select all people")

### Tool Execution Flow

```
User Request → Intent Recognition → Tool Selection → Parameter Extraction
     ↓                                                      ↓
Preview Generation ← Confidence Check ← Tool Execution ← Validation
     ↓
User Approval → Canvas Update → State Update
```

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

### Intent Recognition (Epic 6)

```typescript
IntentSchema = {
  primaryIntent: 'adjust-colors' | 'apply-effects' | 'semantic-edit' | ...
  confidence: number
  entities: {
    targets: ['specific-object', ...]
    objects: ["hat", "person's shirt"]
    spatialReferences: ["on the left", "below the logo"]
    adjustments: ["brightness", "contrast"]
    parameters: { amount: 50 }
  }
  suggestedTools: ["semanticErase", "adjustBrightness"]
  complexity: 'simple' | 'moderate' | 'complex'
}
```

### Orchestrator-Worker Pattern

The orchestrator coordinates complex multi-step operations:

1. **Intent Recognition**: Parse user request
2. **Task Planning**: Generate execution plan with dependencies
3. **Dependency Resolution**: Topological sort for parallel execution
4. **Worker Assignment**: Distribute tasks to specialized workers
5. **Progress Tracking**: Monitor and report progress
6. **Result Aggregation**: Combine outputs

### Workflow Examples

```typescript
// Simple workflow: "Make it brighter"
{
  steps: [
    { id: "1", tool: "adjustBrightness", params: { amount: 20 } }
  ]
}

// Complex workflow: "Remove the hat and add 'SALE' text on his shirt"
{
  steps: [
    { id: "1", tool: "semanticErase", params: { target: "the hat" } },
    { id: "2", tool: "semanticText", params: { text: "SALE", placement: "on his shirt" }, dependencies: ["1"] }
  ]
}
```

## Visual Feedback & Approval

### Generation + Verification Pattern (Epic 7)

All significant edits follow this pattern:
1. **Generate Preview**: Create before/after comparison
2. **Present Options**: Show multiple variations if applicable
3. **Get Approval**: User confirms or adjusts
4. **Apply Changes**: Execute on canvas

### Comparison Modes

```typescript
interface ComparisonMode {
  'side-by-side': { before: Image, after: Image }
  'overlay': { base: Image, overlay: Image, opacity: number }
  'difference': { diff: Image, highlights: Region[] }
  'slider': { images: [Image, Image], position: number }
}
```

### Confidence-Based Routing

- **High confidence (>0.8)**: Apply with quick preview
- **Medium confidence (0.5-0.8)**: Show detailed comparison
- **Low confidence (<0.5)**: Request clarification

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