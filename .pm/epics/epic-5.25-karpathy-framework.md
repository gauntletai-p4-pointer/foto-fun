# Epic 5.25: Karpathy Agent Design Framework Integration

## Overview

This epic implements Andrej Karpathy's agent design framework principles into FotoFun, building upon the existing foundation from Epics 1, 2, and 5. The goal is to create a production-ready AI photo editing system that emphasizes human-AI collaboration through intelligent context management, generation with verification, and adjustable autonomy.

## Assignment Requirements

### The Agent Design Framework
Using Karpathy's insights, your agent should:

1. **Context Management**: Solve the "anterograde amnesia" problem by maintaining relevant context across workflows
2. **Generation + Verification**: AI handles the heavy lifting, humans verify and guide decisions
3. **Incremental Processing**: Work in small, manageable chunks that humans can easily review
4. **Visual Interface**: Create interfaces that make verification fast and intuitive
5. **Partial Autonomy**: Build "autonomy sliders" - let users control how much the agent does independently

### Technical Requirements
- **Context Management**: Intelligent handling of relevant information across multi-step workflows
- **Generation + Verification Pattern**: AI generates, humans verify and guide
- **Incremental Processing**: Break complex tasks into reviewable chunks
- **Visual Verification Interface**: Make human oversight fast and intuitive
- **Partial Autonomy Controls**: Allow users to adjust how much the agent does independently
- **Clean, well-documented code with proper GitHub repository**
- **Open source license (MIT, Apache 2.0, etc.)**

## Current State Assessment

### What We Have (from Epics 1, 2, and 5)

#### ✅ Completed Components
1. **Foundation (Epic 1)**
   - BaseTool architecture with lifecycle management
   - Command pattern for undo/redo
   - Layer system with full integration
   - Selection system with pixel-based masks
   - 12 working canvas tools

2. **AI Integration (Epic 5)**
   - Tool adapter pattern for AI compatibility
   - Client-server execution separation
   - Natural language parameter resolution
   - 9+ AI-compatible tools working (crop, brightness, contrast, saturation, hue, exposure, color temperature, rotate, flip, resize, blur)
   - Canvas context passing with messages
   - Tool execution visualization in chat

3. **Text Tools (Epic 2 - Partial)**
   - BaseTextTool class structure
   - Font management system planning
   - Text command infrastructure

#### ⏳ After Epic 5.25 Simplified Implementation
1. **Context Management**
   - ✅ Basic workflow state tracking in canvas store
   - ✅ Simple operation history in localStorage
   - ❌ No advanced user preference learning (deferred)

2. **Generation + Verification**
   - ✅ Enhanced preview generation in all adapters
   - ✅ Basic confidence scoring (simple threshold)
   - ✅ Approval dialog with slider comparison
   - ❌ No alternative parameter suggestions (deferred)

3. **Incremental Processing**
   - ✅ Simple task breakdown for multi-step operations
   - ✅ Checkpoint system using existing commands
   - ✅ Basic progress visualization
   - ❌ No complex dependency management (deferred)

4. **Visual Interface**
   - ✅ Slider comparison view
   - ✅ Before/after preview
   - ✅ Confidence indicator
   - ❌ No multiple comparison modes (deferred)
   - ❌ No diff visualization (deferred)

5. **Partial Autonomy**
   - ✅ Simple confidence threshold slider
   - ✅ Basic approval rate tracking
   - ❌ No per-operation policies (deferred)
   - ❌ No sophisticated learning system (deferred)

## Refined Implementation Plan (What We're Doing Now)

### Phase 1: Visual Approval System (2 days) 🎯 **HIGHEST IMPACT**

#### 1.1 Enhance Preview Generation in Adapters
- Extend all existing tool adapters with proper preview generation
- Add confidence calculation (simple threshold-based)
- Return preview results with before/after images

#### 1.2 Create Simple Approval Dialog
- Single comparison mode (slider)
- Show confidence percentage
- Approve/Cancel buttons
- Clean, minimal UI

#### 1.3 Integrate with AI Chat
- Modify onToolCall to check confidence
- Show approval dialog when confidence < threshold
- Execute on approval, cancel on rejection

### Phase 2: Basic Context & Workflow Tracking (1.5 days)

#### 2.1 Add Workflow State to Canvas Store
- Track current multi-step operation
- Store completed steps
- Simple checkpoint creation

#### 2.2 Simple Progress UI
- Show current step number
- List of steps with checkmarks
- Progress bar

#### 2.3 Context-Aware Quick Actions 🆕
- **Smart Suggestions Based on Context**
  - Analyze current canvas content (image properties, existing edits)
  - Track user's most frequently used tools
  - Consider time of day and editing patterns
  - Show relevant suggestions based on workflow stage
  
- **Implementation Details**
  ```typescript
  interface ContextualQuickActions {
    // Track usage patterns
    toolUsageHistory: Map<string, number>
    lastUsedTools: string[]
    
    // Analyze current state
    currentImageAnalysis: {
      brightness: 'dark' | 'normal' | 'bright'
      hasColor: boolean
      isBlurry: boolean
      hasEdits: boolean
    }
    
    // Generate suggestions
    getSuggestions(): string[]
  }
  ```

- **Context Factors**
  - Image brightness → suggest brightness/exposure adjustments
  - Color presence → suggest saturation/hue adjustments
  - No edits yet → suggest common starting operations
  - Previous edits → suggest complementary operations
  - Time patterns → morning edits vs evening edits
  - User expertise level → basic vs advanced suggestions

### Phase 3: Simple Multi-Step Processing (1.5 days)

#### 3.1 Basic Task Planner
- Use AI to break down complex requests
- Return simple step list
- No complex dependency graphs

#### 3.2 Step-by-Step Execution
- Execute steps in order
- Create checkpoint after each step
- Show progress between steps

### Phase 4: Basic Autonomy Controls (1 day)

#### 4.1 Simple Settings
- Single confidence threshold slider
- Store in localStorage
- Add to AI Chat panel

#### 4.2 Basic Decision Tracking
- Track approve/reject in localStorage
- Calculate simple approval rates
- No complex learning

## Deferred Implementation (Future Phases)

### Advanced Context Management
- **Workflow State Manager Class** - Full workflow orchestration
- **Enhanced Memory System** - IndexedDB storage, pattern recognition
- **User Preference Learning** - ML-based preference detection
- **Operation History Persistence** - Long-term storage and analysis

### Advanced Generation + Verification
- **Multi-Factor Confidence Scoring** - Complex confidence calculation
- **Alternative Suggestions** - Multiple parameter options
- **Multiple Comparison Modes** - Side-by-side, overlay, difference
- **Parameter Adjustment UI** - Real-time parameter tweaking
- **Diff Visualization** - Heatmaps and change highlighting

### Advanced Incremental Processing
- **Complex Task Planning** - Dependency graphs, parallel execution
- **Step Dependencies** - Complex workflow management
- **Batch Processing** - Multiple operations in parallel
- **Advanced Checkpointing** - Selective state restoration

### Advanced Visual Interface
- **Rich Comparison Views** - Multiple visualization modes
- **Change Highlighting** - Visual diff algorithms
- **Real-time Preview Updates** - Live parameter adjustment
- **Professional Progress UI** - Detailed step information

### Advanced Autonomy
- **Per-Operation Policies** - Granular control per tool type
- **Learning System** - Adapt from user decisions over time
- **Operation Risk Assessment** - Automatic risk categorization
- **Batch vs Single Rules** - Different autonomy for batch operations

## Technical Architecture (Simplified)

### Core Components to Build Now

```
┌─────────────────────────────────────────────────────────────┐
│              Simplified Epic 5.25 Components                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ Simple Workflow │  │ Approval Dialog  │                 │
│  │    Tracking     │  │  (Slider Only)   │                 │
│  └────────┬────────┘  └────────┬─────────┘                 │
│           │                    │                             │
│  ┌────────▼────────────────────▼───────────────────────┐   │
│  │            Enhanced Tool Execution Flow              │   │
│  │  - Basic Confidence Check (threshold)                │   │
│  │  - Simple Preview Generation                         │   │
│  │  - Approval/Reject Flow                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points (Simplified)

1. **AI Chat Component** 
   - Add approval dialog state
   - Simple confidence check
   - Basic workflow progress

2. **Tool Adapters**
   - Enhance preview generation
   - Add confidence calculation

3. **Canvas Store**
   - Add simple workflow state
   - Basic checkpoint support

4. **LocalStorage**
   - User preferences
   - Decision history
   - Approval rates

## Implementation Code (Simplified Versions)

### Simple Approval Dialog
```typescript
// components/editor/ApprovalDialog/index.tsx
export function ApprovalDialog({ request, onDecision }) {
  if (!request) return null
  
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review: {request.toolName}</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Confidence: {Math.round(request.confidence * 100)}%
          </div>
        </DialogHeader>
        
        <SliderComparison 
          before={request.preview.before}
          after={request.preview.after}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onDecision('reject')}>
            Cancel
          </Button>
          <Button onClick={() => onDecision('approve')}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Enhanced Tool Adapter
```typescript
// Add to BaseToolAdapter
async generatePreview(params: TInput, canvas: Canvas): Promise<PreviewResult> {
  const before = canvas.toDataURL()
  
  // Clone canvas for preview
  const tempCanvas = cloneCanvas(canvas)
  await this.execute(params, { canvas: tempCanvas })
  const after = tempCanvas.toDataURL()
  
  // Simple confidence (can be overridden by specific adapters)
  const confidence = 0.85 // Default high confidence
  
  return { before, after, confidence }
}
```

### Simple Workflow Tracking
```typescript
// Add to canvasStore.ts
interface CanvasState {
  // ... existing
  currentWorkflow: {
    id: string
    steps: string[]
    currentStep: number
    userRequest: string
  } | null
  
  startWorkflow: (request: string, steps: string[]) => void
  nextWorkflowStep: () => void
  clearWorkflow: () => void
}
```

### Basic Autonomy Settings
```typescript
// components/editor/AutonomySettings.tsx
export function AutonomySettings() {
  const [threshold, setThreshold] = useState(() => {
    return parseFloat(localStorage.getItem('ai-confidence-threshold') || '0.8')
  })
  
  const handleChange = (value: number) => {
    setThreshold(value)
    localStorage.setItem('ai-confidence-threshold', value.toString())
  }
  
  return (
    <div className="p-3 space-y-2 border-t">
      <Label className="text-xs">AI Confidence Threshold</Label>
      <Slider
        value={[threshold * 100]}
        onValueChange={([v]) => handleChange(v / 100)}
        max={100}
        step={5}
      />
      <p className="text-xs text-muted-foreground">
        Auto-approve when confidence > {Math.round(threshold * 100)}%
      </p>
    </div>
  )
}
```

### Context-Aware Quick Actions 🆕
```typescript
// lib/ai/context/quick-actions.ts
export class ContextualQuickActions {
  private toolUsage: Map<string, number> = new Map()
  private recentTools: string[] = []
  private readonly MAX_RECENT = 10
  
  constructor() {
    this.loadHistory()
  }
  
  private loadHistory() {
    const saved = localStorage.getItem('tool-usage-history')
    if (saved) {
      this.toolUsage = new Map(JSON.parse(saved))
    }
  }
  
  private saveHistory() {
    localStorage.setItem('tool-usage-history', 
      JSON.stringify(Array.from(this.toolUsage.entries()))
    )
  }
  
  recordToolUse(toolName: string) {
    const count = this.toolUsage.get(toolName) || 0
    this.toolUsage.set(toolName, count + 1)
    
    this.recentTools.unshift(toolName)
    if (this.recentTools.length > this.MAX_RECENT) {
      this.recentTools.pop()
    }
    
    this.saveHistory()
  }
  
  private analyzeImage(canvas: Canvas): ImageAnalysis {
    const objects = canvas.getObjects()
    const images = objects.filter(obj => obj.type === 'image')
    
    if (images.length === 0) {
      return { brightness: 'normal', hasColor: true, isBlurry: false, hasEdits: false }
    }
    
    // Simple analysis based on filters applied
    const hasFilters = images.some(img => img.filters && img.filters.length > 0)
    
    return {
      brightness: this.detectBrightness(images[0]),
      hasColor: !this.hasGrayscaleFilter(images[0]),
      isBlurry: this.hasBlurFilter(images[0]),
      hasEdits: hasFilters
    }
  }
  
  getSuggestions(canvas: Canvas): string[] {
    const analysis = this.analyzeImage(canvas)
    const suggestions: string[] = []
    
    // Context-based suggestions
    if (analysis.brightness === 'dark') {
      suggestions.push("Make it brighter", "Increase exposure")
    } else if (analysis.brightness === 'bright') {
      suggestions.push("Make it darker", "Reduce exposure")
    }
    
    if (!analysis.hasColor) {
      suggestions.push("Restore color", "Add sepia tone")
    } else {
      suggestions.push("Enhance colors", "Convert to black & white")
    }
    
    if (!analysis.hasEdits) {
      // First-time suggestions
      suggestions.push("Auto enhance", "Crop image")
    } else {
      // Follow-up suggestions based on recent tools
      if (this.recentTools.includes('adjustBrightness')) {
        suggestions.push("Adjust contrast", "Fine-tune exposure")
      }
      if (this.recentTools.includes('applyBlur')) {
        suggestions.push("Sharpen details", "Adjust focus")
      }
    }
    
    // Add frequently used tools
    const topTools = Array.from(this.toolUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tool]) => this.toolToSuggestion(tool))
      .filter(Boolean)
    
    suggestions.push(...topTools)
    
    // Remove duplicates and limit to 4
    return [...new Set(suggestions)].slice(0, 4)
  }
  
  private toolToSuggestion(toolName: string): string {
    const mappings: Record<string, string> = {
      adjustBrightness: "Adjust brightness",
      adjustContrast: "Adjust contrast", 
      adjustSaturation: "Enhance colors",
      applyBlur: "Add blur effect",
      applyGrayscale: "Convert to black & white",
      cropImage: "Crop image",
      rotateImage: "Rotate image"
    }
    return mappings[toolName] || ""
  }
}
```

### Enhanced AI Chat Component
```typescript
// components/editor/Panels/AIChat/index.tsx
import { ContextualQuickActions } from '@/lib/ai/context/quick-actions'

export function AIChat() {
  const [quickActions, setQuickActions] = useState<string[]>([])
  const contextualActions = useRef(new ContextualQuickActions())
  const { fabricCanvas } = useCanvasStore()
  
  // Update quick actions when canvas changes
  useEffect(() => {
    if (!fabricCanvas) return
    
    const updateSuggestions = () => {
      const suggestions = contextualActions.current.getSuggestions(fabricCanvas)
      setQuickActions(suggestions)
    }
    
    // Update on canvas changes
    fabricCanvas.on('object:modified', updateSuggestions)
    fabricCanvas.on('path:created', updateSuggestions)
    
    // Initial suggestions
    updateSuggestions()
    
    return () => {
      fabricCanvas.off('object:modified', updateSuggestions)
      fabricCanvas.off('path:created', updateSuggestions)
    }
  }, [fabricCanvas])
  
  // Track tool usage in chat
  const handleToolExecution = useCallback((toolName: string) => {
    contextualActions.current.recordToolUse(toolName)
  }, [])
  
  // ... rest of component
}
```

## Success Metrics (Simplified)

1. **Visual Approval**: 100% of operations show preview before applying
2. **Confidence Display**: Users see confidence for every operation
3. **Simple Autonomy**: Users can adjust confidence threshold
4. **Progress Tracking**: Multi-step operations show progress
5. **Decision History**: System tracks approval/rejection rates
6. **Context Awareness**: Quick actions adapt to user behavior and image content 🆕

## Deliverables (Current Phase)

### Core Systems
- [x] Enhanced preview generation in tool adapters
- [x] Simple approval dialog with slider comparison
- [x] Basic confidence scoring
- [x] Simple workflow state tracking
- [x] LocalStorage-based preferences
- [x] Basic decision tracking

### UI Components
- [x] ApprovalDialog (simplified)
- [x] SliderComparison component
- [x] WorkflowProgress (basic)
- [x] AutonomySettings (single slider)
- [x] ContextualQuickActions (smart suggestions) 🆕

### Integration
- [x] Modified AI chat with approval flow
- [x] Enhanced tool adapters
- [x] Canvas store workflow support
- [x] LocalStorage integration

## Timeline (Simplified)

- **Days 1-2**: Visual Approval System
- **Day 3**: Basic Context & Workflow (including Context-Aware Quick Actions)
- **Day 4**: Simple Multi-Step Processing
- **Day 5**: Basic Autonomy Controls
- **Day 6**: Integration & Testing

Total: 6 days of focused development

## Technical Debt & Future Considerations

1. **Advanced State Management**: Current localStorage approach works but should migrate to IndexedDB
2. **Comparison Modes**: Slider is good for MVP, but users may want side-by-side
3. **Learning System**: Simple approval tracking works, but ML would be better
4. **Complex Workflows**: Current linear approach works, but parallel execution would be faster

## Conclusion

This refined implementation focuses on delivering immediate value with minimal complexity. It implements all five Karpathy principles in their simplest form, creating a solid foundation that can be enhanced later. The emphasis is on user-visible features that build trust and control in AI operations. 