# Epic 7: Visual Feedback & Approval System

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-7-visual-feedback`
2. **Base Branch**: Branch off from `main` 
3. **Commits**: Use conventional commits (e.g., `feat: add approval dialog`, `fix: diff visualization performance`)
4. **Pull Request**: 
   - Title: "Epic 7: Visual Feedback & Approval System"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**: 
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   - Ensure Epic 5 (Core Tools) is available for integration
   
2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed
   
3. **Testing Requirements**:
   - Test all comparison modes (side-by-side, overlay, diff, slider)
   - Test confidence-based routing logic
   - Test parameter adjustment UI with various tools
   - Test alternative suggestions generation
   - Test visual feedback performance
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Coordination
- Check #dev-canvas channel in Slack/Discord for updates
- Don't modify files being worked on in other epics
- If you need changes in shared files (e.g., constants, types), coordinate with team

### Epic Start Process

Before implementing visual feedback:

1. **Deep Dive Analysis** (Required)
   - Study existing UI component patterns
   - Analyze current dialog/modal systems
   - Understand image comparison approaches
   - Document UI state management patterns
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study Photoshop's preview systems
   - Research diff visualization algorithms
   - Investigate slider comparison UIs
   - Compare approval flow patterns

3. **Gap Identification**
   - Image comparison components
   - Diff generation algorithms
   - Parameter adjustment UI system
   - Confidence visualization design

### Epic End Process

1. **Quality Validation**
   - All comparison modes smooth
   - Diff visualization accurate
   - Parameter updates real-time
   - Approval flow intuitive

2. **Integration Testing**
   - Test with various image sizes
   - Test all comparison modes
   - Test parameter adjustment ranges
   - Verify performance metrics

3. **Documentation**
   - UI component library docs
   - Diff algorithm explanation
   - Visual feedback patterns

---

## Overview
This epic implements the generation + verification pattern from Karpathy's agent design framework. We'll build a comprehensive visual feedback system with approval dialogs, confidence-based routing, diff visualization, and parameter adjustment capabilities.

## References
- [AI SDK v5 Streaming](https://v5.ai-sdk.dev/docs/ai-sdk-core/streaming)
- [Tool States](https://v5.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-states)
- [Karpathy's Agent Design Framework](https://www.youtube.com/watch?v=sal78ACtGTc) - Generation + Verification

## Key Implementation Details

### 1. Approval Dialog Component

**File to Create**: `components/editor/dialogs/ApprovalDialog.tsx`
```typescript
import { Dialog } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { VisualComparison } from '../VisualComparison'

interface ApprovalDialogProps {
  request: ApprovalRequest
  onApprove: () => void
  onReject: () => void
  onModify: (params: any) => void
  onRequestAlternative: () => void
}

export function ApprovalDialog({
  request,
  onApprove,
  onReject,
  onModify,
  onRequestAlternative
}: ApprovalDialogProps) {
  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{request.operation} - Confidence: {(request.confidence * 100).toFixed(0)}%</DialogTitle>
          <DialogDescription>{request.explanation}</DialogDescription>
        </DialogHeader>
        
        <VisualComparison
          before={request.preview.before}
          after={request.preview.after}
          diff={request.preview.diff}
          mode={comparisonMode}
          onModeChange={setComparisonMode}
        />
        
        <ParameterAdjustment
          tool={request.tool}
          params={request.params}
          onChange={onModify}
        />
        
        {request.alternatives && (
          <AlternativeSuggestions
            alternatives={request.alternatives}
            onSelect={onModify}
          />
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onReject}>
            Reject
          </Button>
          <Button variant="outline" onClick={onRequestAlternative}>
            Try Different Approach
          </Button>
          <Button onClick={onApprove}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 2. Visual Comparison Component

**File to Create**: `components/editor/VisualComparison/index.tsx`
```typescript
export type ComparisonMode = 'sideBySide' | 'overlay' | 'diff' | 'slider'

interface VisualComparisonProps {
  before: string // base64
  after: string  // base64
  diff?: string  // base64
  mode: ComparisonMode
  onModeChange: (mode: ComparisonMode) => void
  onRegionSelect?: (region: Region) => void
}

export function VisualComparison({
  before,
  after,
  diff,
  mode,
  onModeChange,
  onRegionSelect
}: VisualComparisonProps) {
  // Implementation for different comparison modes
}
```

**File to Create**: `components/editor/VisualComparison/SliderView.tsx`
```typescript
export function SliderView({ before, after }: SliderViewProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  
  return (
    <div className="relative overflow-hidden">
      <img src={before} className="absolute inset-0" />
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img src={after} className="absolute inset-0" />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={(e) => setSliderPosition(Number(e.target.value))}
        className="absolute inset-x-0 bottom-4"
      />
    </div>
  )
}
```

### 3. Confidence-Based Routing System

**File to Create**: `lib/ai/approval/confidence-router.ts`
```typescript
import { z } from 'zod'

const RoutingRuleSchema = z.object({
  condition: z.enum(['confidence_below', 'operation_type', 'value_exceeds', 'first_time']),
  threshold: z.any(),
  action: z.enum(['require_approval', 'auto_approve', 'suggest_alternatives'])
})

export class ConfidenceRouter {
  private rules: RoutingRule[] = [
    { condition: 'confidence_below', threshold: 0.7, action: 'require_approval' },
    { condition: 'operation_type', threshold: ['delete', 'crop', 'transform'], action: 'require_approval' },
    { condition: 'value_exceeds', threshold: { brightness: 50, saturation: 50 }, action: 'require_approval' },
    { condition: 'first_time', threshold: null, action: 'require_approval' }
  ]
  
  async routeOperation(
    operation: string,
    params: any,
    confidence: number,
    userHistory: UserHistory
  ): Promise<RoutingDecision> {
    // Check all rules
    for (const rule of this.rules) {
      if (this.evaluateRule(rule, operation, params, confidence, userHistory)) {
        return {
          action: rule.action,
          reason: this.explainRule(rule)
        }
      }
    }
    
    return { action: 'auto_approve', reason: 'High confidence and safe operation' }
  }
  
  updateRulesFromFeedback(feedback: UserFeedback) {
    // Learn from user approvals/rejections
  }
}
```

### 4. Diff Visualization System

**File to Create**: `lib/ai/visualization/diff-generator.ts`
```typescript
export class DiffGenerator {
  static async generateDiff(
    before: ImageData,
    after: ImageData,
    options: DiffOptions = {}
  ): Promise<DiffResult> {
    const diff = new ImageData(before.width, before.height)
    
    // Pixel-by-pixel comparison
    for (let i = 0; i < before.data.length; i += 4) {
      const rDiff = Math.abs(before.data[i] - after.data[i])
      const gDiff = Math.abs(before.data[i + 1] - after.data[i + 1])
      const bDiff = Math.abs(before.data[i + 2] - after.data[i + 2])
      
      // Visualize differences
      if (options.mode === 'heatmap') {
        // Red for differences
        diff.data[i] = rDiff + gDiff + bDiff
        diff.data[i + 1] = 0
        diff.data[i + 2] = 0
        diff.data[i + 3] = 255
      }
    }
    
    return {
      image: diff,
      metrics: {
        pixelDifference: this.calculatePixelDiff(before, after),
        structuralSimilarity: await this.calculateSSIM(before, after),
        perceptualDifference: await this.calculatePerceptualDiff(before, after)
      },
      regions: await this.identifyChangedRegions(diff)
    }
  }
}
```

### 5. Alternative Suggestions System

**File to Create**: `lib/ai/suggestions/alternative-generator.ts`
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const AlternativesSchema = z.object({
  alternatives: z.array(z.object({
    description: z.string(),
    params: z.any(),
    reasoning: z.string(),
    expectedOutcome: z.string(),
    confidence: z.number()
  }))
})

export class AlternativeGenerator {
  static async generateAlternatives(
    operation: string,
    originalParams: any,
    userIntent: string,
    context: CanvasContext
  ) {
    const { object: alternatives } = await generateObject({
      model: openai('gpt-4o'),
      schema: AlternativesSchema,
      system: 'Generate alternative approaches for photo editing...',
      prompt: `Operation: ${operation}, Intent: ${userIntent}`
    })
    
    // Generate previews for each alternative
    const alternativesWithPreviews = await Promise.all(
      alternatives.alternatives.map(async (alt) => ({
        ...alt,
        preview: await PreviewGenerator.generate(operation, alt.params)
      }))
    )
    
    return alternativesWithPreviews
  }
}
```

### 6. Parameter Adjustment UI

**File to Create**: `components/editor/ParameterAdjustment/index.tsx`
```typescript
interface ParameterAdjustmentProps {
  tool: FotoFunTool
  params: any
  onChange: (params: any) => void
}

export function ParameterAdjustment({ tool, params, onChange }: ParameterAdjustmentProps) {
  // Dynamically generate UI based on tool's inputSchema
  const schema = tool.inputSchema
  
  return (
    <div className="space-y-4">
      {Object.entries(schema.shape).map(([key, fieldSchema]) => (
        <ParameterField
          key={key}
          name={key}
          schema={fieldSchema}
          value={params[key]}
          onChange={(value) => onChange({ ...params, [key]: value })}
        />
      ))}
    </div>
  )
}
```

### 7. Visual Progress Indicators

**File to Create**: `components/editor/ProgressIndicators/OperationProgress.tsx`
```typescript
export function OperationProgress({ 
  operation,
  progress,
  stage,
  estimatedTime
}: OperationProgressProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        <div className="flex-1">
          <p className="text-sm font-medium">{operation}</p>
          <p className="text-xs text-muted-foreground">{stage}</p>
        </div>
      </div>
      
      <div className="mt-2">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {estimatedTime && (
          <p className="text-xs text-muted-foreground mt-1">
            {estimatedTime}s remaining
          </p>
        )}
      </div>
    </div>
  )
}
```

### 8. Approval Request Manager

**File to Create**: `lib/ai/approval/request-manager.ts`
```typescript
export class ApprovalRequestManager {
  private pendingRequests = new Map<string, ApprovalRequest>()
  private approvalHistory: ApprovalHistory[] = []
  
  async createRequest(
    operation: string,
    params: any,
    confidence: number,
    context: CanvasContext
  ): Promise<ApprovalRequest> {
    const preview = await PreviewGenerator.generate(operation, params, context)
    const alternatives = await AlternativeGenerator.generateAlternatives(
      operation, 
      params,
      context.userIntent
    )
    
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      operation,
      params,
      confidence,
      preview,
      alternatives,
      explanation: await this.explainOperation(operation, params),
      timestamp: Date.now()
    }
    
    this.pendingRequests.set(request.id, request)
    return request
  }
  
  recordDecision(requestId: string, decision: ApprovalDecision) {
    const request = this.pendingRequests.get(requestId)
    if (request) {
      this.approvalHistory.push({
        request,
        decision,
        timestamp: Date.now()
      })
      this.pendingRequests.delete(requestId)
    }
  }
}
```

### 9. Integration with AI Chat

**File to Modify**: `components/editor/Panels/AIChat/index.tsx`
```typescript
// Add approval dialog state
const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null)

// Handle tool execution with approval
const handleToolExecution = async (tool: string, params: any) => {
  const confidence = await ConfidenceScorer.calculate(tool, params)
  const routing = await confidenceRouter.route(tool, params, confidence)
  
  if (routing.action === 'require_approval') {
    const request = await approvalManager.createRequest(tool, params, confidence)
    setApprovalRequest(request)
  } else {
    await executeToolDirectly(tool, params)
  }
}
```

### 10. Undo/Redo Integration

**File to Modify**: `store/documentStore.ts`
```typescript
// Add preview capabilities to history
interface HistoryEntry {
  id: string
  operation: string
  params: any
  preview?: string // base64 thumbnail
  timestamp: number
}

// Add methods for preview-based undo/redo
```

## Testing Requirements

**Files to Create**:
- `__tests__/ai/approval/confidence-router.test.ts`
- `__tests__/ai/visualization/diff-generator.test.ts`
- `__tests__/components/ApprovalDialog.test.tsx`

## Success Criteria
1. Approval dialog shows accurate before/after previews
2. Confidence routing correctly identifies operations needing approval
3. Diff visualization clearly shows changes
4. Alternative suggestions are relevant and actionable
5. Parameter adjustment updates preview in real-time
6. Progress indicators accurate and smooth

## Dependencies
- Epic 5 (Core Tools) for tool definitions
- Canvas API for image manipulation
- AI SDK v5 for alternative generation

## Estimated Effort
- 1 developer × 5-6 days
- Requires expertise in:
  - React component development
  - Image processing (diff algorithms)
  - UI/UX design
  - Canvas API 