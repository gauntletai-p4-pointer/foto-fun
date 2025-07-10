# Epic 15: Macros, Scripts & Batch Processing

## Overview
This epic implements a comprehensive macro recording system, JavaScript-based scripting engine, and batch processing pipeline for FotoFun. Users can record, create, and apply complex editing workflows to single images or entire folders. Works for both self-hosted and cloud deployments.

## Goals
1. **Macro recording** - Record and replay editing sequences
2. **Script engine** - JavaScript API for custom automation
3. **Batch processing** - Apply edits to multiple images
4. **AI-powered macros** - Generate scripts from natural language
5. **Pipeline builder** - Visual workflow creation

## Current State Analysis

### Existing Foundation
- **Command Pattern**: All edits are commands in `lib/editor/commands/`
- **AI Tools**: Adapter system in `lib/ai/adapters/`
- **Tool Registry**: Pattern for registering tools dynamically
- **History Store**: Records all executed commands
- **No automation** currently exists

### Leverageable Components
- Commands are already serializable (from Epic 14)
- AI can generate tool calls with parameters
- Command pattern enables replay functionality

## Technical Approach

### Phase 1: Macro System

Define macro types and storage:

```typescript
// lib/macros/types.ts
export interface Macro {
  id: string
  name: string
  description: string
  category: string
  icon: string
  
  // Macro content
  commands: SerializedCommand[]
  parameters: MacroParameter[]
  
  // Metadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
  
  // Usage stats
  usageCount: number
  lastUsedAt?: Date
  
  // Sharing
  isPublic: boolean
  tags: string[]
}

export interface MacroParameter {
  id: string
  name: string
  type: 'number' | 'string' | 'color' | 'boolean' | 'select'
  defaultValue: any
  required: boolean
  
  // For dynamic values
  expression?: string // JS expression
  
  // For select type
  options?: Array<{ label: string; value: any }>
  
  // UI hints
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

export interface MacroExecution {
  macroId: string
  parameters: Record<string, any>
  targetCanvas: Canvas
  options?: {
    preview?: boolean
    stopOnError?: boolean
  }
}
```

### Phase 2: Macro Store

Create macro management store:

```typescript
// store/macroStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Macro, MacroExecution } from '@/lib/macros/types'

interface MacroState {
  // Macro library
  macros: Map<string, Macro>
  categories: string[]
  
  // Recording state
  isRecording: boolean
  recordingCommands: SerializedCommand[]
  recordingStartTime: number | null
  
  // Execution state
  isExecuting: boolean
  executionProgress: number
  executionErrors: Error[]
  
  // Actions
  startRecording: () => void
  stopRecording: (name: string, description: string) => Macro
  pauseRecording: () => void
  resumeRecording: () => void
  
  // Macro management
  saveMacro: (macro: Macro) => void
  deleteMacro: (macroId: string) => void
  importMacro: (macroData: string) => Macro
  exportMacro: (macroId: string) => string
  
  // Execution
  executeMacro: (execution: MacroExecution) => Promise<void>
  previewMacro: (execution: MacroExecution) => Promise<Canvas>
  
  // AI generation
  generateMacroFromPrompt: (prompt: string) => Promise<Macro>
}

export const useMacroStore = create<MacroState>()(
  persist(
    (set, get) => ({
      macros: new Map(),
      categories: ['Color Correction', 'Effects', 'Transform', 'Custom'],
      isRecording: false,
      recordingCommands: [],
      recordingStartTime: null,
      isExecuting: false,
      executionProgress: 0,
      executionErrors: [],
      
      startRecording: () => {
        set({
          isRecording: true,
          recordingCommands: [],
          recordingStartTime: Date.now()
        })
        
        // Subscribe to history changes
        const unsubscribe = useHistoryStore.subscribe(
          state => state.history,
          (history) => {
            if (!get().isRecording) {
              unsubscribe()
              return
            }
            
            const latestCommand = history[history.length - 1]
            if (latestCommand) {
              set(state => ({
                recordingCommands: [
                  ...state.recordingCommands,
                  latestCommand.command.serialize()
                ]
              }))
            }
          }
        )
      },
      
      stopRecording: (name, description) => {
        const { recordingCommands } = get()
        
        const macro: Macro = {
          id: nanoid(),
          name,
          description,
          category: 'Custom',
          icon: 'Play',
          commands: recordingCommands,
          parameters: extractParameters(recordingCommands),
          createdBy: getCurrentUserId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          isPublic: false,
          tags: []
        }
        
        set({
          isRecording: false,
          recordingCommands: [],
          recordingStartTime: null
        })
        
        get().saveMacro(macro)
        return macro
      },
      
      executeMacro: async ({ macroId, parameters, targetCanvas, options }) => {
        const macro = get().macros.get(macroId)
        if (!macro) throw new Error('Macro not found')
        
        set({ isExecuting: true, executionProgress: 0, executionErrors: [] })
        
        try {
          // Apply parameter substitution
          const commands = substituteParameters(macro.commands, parameters)
          
          // Execute commands
          for (let i = 0; i < commands.length; i++) {
            const command = deserializeCommand(commands[i], targetCanvas)
            
            try {
              await useHistoryStore.getState().executeCommand(command)
            } catch (error) {
              if (options?.stopOnError) throw error
              
              set(state => ({
                executionErrors: [...state.executionErrors, error as Error]
              }))
            }
            
            set({ executionProgress: ((i + 1) / commands.length) * 100 })
          }
          
          // Update usage stats
          macro.usageCount++
          macro.lastUsedAt = new Date()
          get().saveMacro(macro)
          
        } finally {
          set({ isExecuting: false })
        }
      }
    }),
    {
      name: 'macro-store',
      partialize: (state) => ({
        macros: Array.from(state.macros.entries())
      })
    }
  )
)
```

### Phase 3: Script Engine

JavaScript API for custom scripts:

```typescript
// lib/scripts/ScriptEngine.ts
import { VM } from 'vm2' // Secure sandbox

export interface ScriptAPI {
  // Canvas operations
  canvas: {
    getWidth(): number
    getHeight(): number
    getObjects(): ScriptObject[]
    getActiveObject(): ScriptObject | null
    setActiveObject(obj: ScriptObject): void
  }
  
  // Tool operations
  tools: {
    brightness(value: number): Promise<void>
    contrast(value: number): Promise<void>
    saturation(value: number): Promise<void>
    crop(x: number, y: number, width: number, height: number): Promise<void>
    rotate(angle: number): Promise<void>
    // ... all other tools
  }
  
  // Selection operations
  selection: {
    selectAll(): void
    deselect(): void
    invert(): void
    expand(pixels: number): void
    contract(pixels: number): void
  }
  
  // Utility functions
  utils: {
    wait(ms: number): Promise<void>
    log(message: string): void
    alert(message: string): void
    confirm(message: string): Promise<boolean>
  }
  
  // AI operations
  ai: {
    enhance(prompt: string): Promise<void>
    generate(prompt: string): Promise<void>
    remove(objectDescription: string): Promise<void>
  }
}

export class ScriptEngine {
  private vm: VM
  private api: ScriptAPI
  
  constructor(private canvas: Canvas) {
    this.vm = new VM({
      timeout: 30000, // 30 second timeout
      sandbox: this.createSandbox()
    })
  }
  
  async execute(script: string, parameters?: Record<string, any>): Promise<any> {
    // Inject parameters
    const fullScript = `
      const params = ${JSON.stringify(parameters || {})};
      ${script}
    `
    
    try {
      return await this.vm.run(fullScript)
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`)
    }
  }
  
  private createSandbox(): any {
    return {
      // Expose safe API
      canvas: this.api.canvas,
      tools: this.api.tools,
      selection: this.api.selection,
      utils: this.api.utils,
      ai: this.api.ai,
      
      // Math and utilities
      Math,
      Date,
      JSON,
      
      // Async support
      Promise,
      setTimeout: (fn: Function, ms: number) => {
        return setTimeout(() => this.vm.run(fn), ms)
      }
    }
  }
}
```

### Phase 4: Batch Processing Pipeline

Queue and process multiple images:

```typescript
// lib/batch/BatchProcessor.ts
export interface BatchJob {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  
  // Input/output
  inputFiles: File[]
  outputFormat: 'png' | 'jpg' | 'webp'
  outputQuality: number
  outputDirectory?: string
  
  // Processing
  pipeline: ProcessingPipeline
  
  // Progress
  totalFiles: number
  processedFiles: number
  currentFile?: string
  errors: Array<{ file: string; error: string }>
  
  // Timing
  startedAt?: Date
  completedAt?: Date
  estimatedTimeRemaining?: number
}

export interface ProcessingPipeline {
  id: string
  name: string
  steps: PipelineStep[]
}

export interface PipelineStep {
  id: string
  type: 'macro' | 'script' | 'ai-tool'
  enabled: boolean
  
  // For macro
  macroId?: string
  macroParams?: Record<string, any>
  
  // For script
  script?: string
  scriptParams?: Record<string, any>
  
  // For AI tool
  aiTool?: string
  aiPrompt?: string
  
  // Conditions
  condition?: {
    type: 'filesize' | 'dimensions' | 'filename' | 'custom'
    operator: 'equals' | 'contains' | 'greater' | 'less'
    value: any
  }
}

export class BatchProcessor {
  private queue: BatchJob[] = []
  private isProcessing = false
  private workers: Worker[] = []
  
  constructor(private workerCount: number = 4) {
    // Initialize worker pool
    for (let i = 0; i < workerCount; i++) {
      this.workers.push(new Worker('/workers/image-processor.js'))
    }
  }
  
  async addJob(job: BatchJob): Promise<void> {
    this.queue.push(job)
    if (!this.isProcessing) {
      this.processQueue()
    }
  }
  
  private async processQueue(): Promise<void> {
    this.isProcessing = true
    
    while (this.queue.length > 0) {
      const job = this.queue.shift()!
      await this.processJob(job)
    }
    
    this.isProcessing = false
  }
  
  private async processJob(job: BatchJob): Promise<void> {
    job.status = 'processing'
    job.startedAt = new Date()
    
    // Process files in parallel using workers
    const chunks = this.chunkArray(job.inputFiles, this.workerCount)
    const promises = chunks.map((chunk, index) => 
      this.processChunk(chunk, job, this.workers[index])
    )
    
    await Promise.all(promises)
    
    job.status = job.errors.length === 0 ? 'completed' : 'failed'
    job.completedAt = new Date()
  }
}
```

### Phase 5: Visual Pipeline Builder

UI for creating processing pipelines:

```typescript
// components/editor/PipelineBuilder/index.tsx
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

export function PipelineBuilder() {
  const [pipeline, setPipeline] = useState<ProcessingPipeline>({
    id: nanoid(),
    name: 'New Pipeline',
    steps: []
  })
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="pipeline-builder">
        <ToolPalette />
        
        <PipelineCanvas
          pipeline={pipeline}
          onUpdate={setPipeline}
        />
        
        <StepProperties
          step={selectedStep}
          onUpdate={updateStep}
        />
        
        <TestRunner
          pipeline={pipeline}
          sampleImage={sampleImage}
        />
      </div>
    </DndProvider>
  )
}

// Draggable pipeline step
function PipelineStep({ step, index, onUpdate, onDelete }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'step',
    item: { step, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })
  
  return (
    <div 
      ref={drag}
      className={`pipeline-step ${isDragging ? 'dragging' : ''}`}
    >
      <StepIcon type={step.type} />
      <div className="step-content">
        <h4>{getStepTitle(step)}</h4>
        <p>{getStepDescription(step)}</p>
      </div>
      <StepControls
        enabled={step.enabled}
        onToggle={() => onUpdate({ ...step, enabled: !step.enabled })}
        onDelete={onDelete}
      />
    </div>
  )
}
```

## Implementation Plan

### Week 1: Macro Recording
- [ ] Implement macro types and storage
- [ ] Create macro recording system
- [ ] Add parameter extraction
- [ ] Build macro playback engine

### Week 2: Script Engine
- [ ] Set up VM2 sandbox
- [ ] Implement Script API
- [ ] Create tool bindings
- [ ] Add error handling and validation

### Week 3: Batch Processing
- [ ] Create batch job queue
- [ ] Implement worker pool
- [ ] Add progress tracking
- [ ] Build file I/O system

### Week 4: Pipeline Builder
- [ ] Create visual pipeline UI
- [ ] Implement drag-and-drop
- [ ] Add step configuration
- [ ] Build test runner

### Week 5: AI Integration
- [ ] AI macro generation
- [ ] Natural language to script
- [ ] Smart batch processing
- [ ] Performance optimization

## Example Use Cases

### 1. Product Photo Pipeline
```javascript
// Resize to standard dimensions
await tools.resize(1000, 1000)

// Remove background
await ai.remove("background")

// Add white background
await canvas.setBackgroundColor("#FFFFFF")

// Adjust brightness for e-commerce
await tools.brightness(10)
await tools.contrast(5)

// Add watermark
await tools.addText({
  text: "© MyStore",
  x: canvas.getWidth() - 100,
  y: canvas.getHeight() - 30,
  fontSize: 12,
  opacity: 0.5
})
```

### 2. Social Media Batch
```javascript
// Create multiple sizes
const sizes = [
  { name: "instagram", width: 1080, height: 1080 },
  { name: "facebook", width: 1200, height: 630 },
  { name: "twitter", width: 1200, height: 675 }
]

for (const size of sizes) {
  await tools.resize(size.width, size.height)
  await utils.saveAs(`${params.filename}-${size.name}.jpg`)
}
```

## Testing Strategy

1. **Macro System**
   - Record/playback accuracy
   - Parameter substitution
   - Error handling

2. **Script Engine**
   - Sandbox security
   - API completeness
   - Performance limits

3. **Batch Processing**
   - Large folder handling
   - Memory management
   - Error recovery

## Deployment Considerations

### Self-Hosted
- Local file system access
- No processing limits
- Custom script freedom
- Full CPU utilization

### Cloud Version
- Cloud storage integration
- Processing quotas by plan
- Curated script library
- Distributed processing

## Success Metrics
- < 2s per image in batch mode
- 100% macro playback accuracy
- < 500ms script compilation
- Support 1000+ image batches

## Risks & Mitigations
1. **Script security** → VM2 sandbox, API limits
2. **Memory usage** → Streaming processing, worker pool
3. **Long-running jobs** → Progress saving, resumable
4. **Script complexity** → Visual builder, AI assistance

---

**Status**: 📋 Planned
**Estimated Duration**: 5 weeks
**Dependencies**: Epic 14 (command serialization) 