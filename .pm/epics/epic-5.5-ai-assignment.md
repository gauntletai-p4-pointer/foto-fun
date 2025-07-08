# Epic 5.5: Karpathy Agent Design Framework Integration

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
   - 4 AI-compatible tools (crop, brightness, contrast, saturation, hue)
   - Canvas context passing with messages

3. **Text Tools (Epic 2 - Partial)**
   - BaseTextTool class structure
   - Font management system planning
   - Text command infrastructure

#### ❌ Missing for Karpathy Framework
1. **Context Management**
   - No workflow state tracking
   - No user preference learning
   - No operation history persistence

2. **Generation + Verification**
   - Preview generation exists but no UI
   - No confidence scoring system
   - No approval dialogs
   - No alternative suggestions

3. **Incremental Processing**
   - No task breakdown system
   - No checkpoint/rollback
   - No dependency management

4. **Visual Interface**
   - No comparison views
   - No diff visualization
   - No parameter adjustment UI

5. **Partial Autonomy**
   - No autonomy settings
   - No per-operation policies
   - No learning from decisions

## Assignment Requirements Mapping

### 1. Context Management ✅
**Requirement**: Solve the "anterograde amnesia" problem by maintaining relevant context across workflows

**Implementation**:
- Extend existing `ToolExecutionContext` with workflow state
- Leverage existing memory system for user preference learning
- Add operation history tracking
- Implement context persistence across multi-step operations

### 2. Generation + Verification Pattern ✅
**Requirement**: AI handles the heavy lifting, humans verify and guide decisions

**Implementation**:
- Build on existing preview generation in tool adapters
- Add approval dialog system with confidence scoring
- Implement alternative parameter suggestions
- Create visual comparison modes

### 3. Incremental Processing ✅
**Requirement**: Work in small, manageable chunks that humans can easily review

**Implementation**:
- Leverage existing command pattern for checkpoints
- Add workflow orchestration for complex tasks
- Implement step-by-step execution with review points
- Create dependency management system

### 4. Visual Interface ✅
**Requirement**: Create interfaces that make verification fast and intuitive

**Implementation**:
- Build comparison dialog with multiple view modes
- Add real-time parameter adjustment UI
- Create progress visualization for multi-step operations
- Implement diff visualization system

### 5. Partial Autonomy Controls ✅
**Requirement**: Build "autonomy sliders" - let users control how much the agent does independently

**Implementation**:
- Create autonomy settings panel
- Add per-operation policy configuration
- Implement confidence-based routing
- Build learning system from user decisions

## Technical Architecture

### Core Components to Build

```
┌─────────────────────────────────────────────────────────────┐
│                   New Components (Epic 5.5)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ Workflow State  │  │ Approval Dialog  │  │  Autonomy  │ │
│  │    Manager      │  │     System       │  │  Settings  │ │
│  └────────┬────────┘  └────────┬─────────┘  └─────┬──────┘ │
│           │                    │                    │        │
│  ┌────────▼───────────────────▼────────────────────▼──────┐ │
│  │              Enhanced Tool Execution Flow               │ │
│  │  - Confidence Scoring                                   │ │
│  │  - Preview Generation                                   │ │
│  │  - Approval Routing                                     │ │
│  │  - Alternative Suggestions                              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **AI Chat Component** (`components/editor/Panels/AIChat/index.tsx`)
   - Add approval dialog state management
   - Integrate confidence-based routing
   - Handle multi-step workflow visualization

2. **Tool Execution** (`lib/ai/client/tool-executor.ts`)
   - Add confidence calculation
   - Implement approval checks
   - Track execution history

3. **Canvas Store** (`store/canvasStore.ts`)
   - Add workflow state tracking
   - Implement checkpoint system
   - Store operation history

4. **Memory System** (`lib/ai/context/memory-system.ts`)
   - Extend for user preference learning
   - Add decision history tracking
   - Implement pattern recognition

## Implementation Plan

### Phase 1: Context & State Management (Day 1)

#### 1.1 Extend Tool Execution Context
```typescript
// lib/ai/context/enhanced-context.ts
export interface WorkflowState {
  id: string
  userRequest: string
  startedAt: number
  currentStep: number
  totalSteps: number
  completedSteps: CompletedStep[]
  pendingSteps: PendingStep[]
  results: Map<string, any>
  checkpoints: Checkpoint[]
}

export interface EnhancedToolExecutionContext extends ToolExecutionContext {
  workflowState?: WorkflowState
  operationHistory: OperationHistory[]
  userPreferences: UserPreferences
  confidenceThreshold: number
}
```

#### 1.2 Workflow State Manager
```typescript
// lib/ai/workflow/workflow-manager.ts
export class WorkflowManager {
  private currentWorkflow: WorkflowState | null = null
  private workflowHistory: WorkflowState[] = []
  
  async startWorkflow(request: string, steps: PlannedStep[]): Promise<string> {
    // Create new workflow with unique ID
    // Initialize state tracking
    // Return workflow ID
  }
  
  async executeStep(workflowId: string, stepId: string): Promise<StepResult> {
    // Execute single step
    // Update workflow state
    // Create checkpoint if needed
  }
  
  async createCheckpoint(workflowId: string): Promise<void> {
    // Save current canvas state
    // Record in workflow
  }
  
  async rollbackToCheckpoint(workflowId: string, checkpointId: string): Promise<void> {
    // Restore canvas state
    // Update workflow tracking
  }
}
```

#### 1.3 Enhanced Memory System
```typescript
// lib/ai/context/user-preferences.ts
export class UserPreferenceManager {
  async updateFromDecision(
    operation: string,
    params: any,
    decision: 'approve' | 'reject' | 'modify',
    modifiedParams?: any
  ): Promise<void> {
    // Learn from user decision
    // Update preference scores
    // Store in IndexedDB
  }
  
  async getOperationPolicy(operation: string): Promise<OperationPolicy> {
    // Return learned policy for operation
  }
  
  async getConfidenceThreshold(): Promise<number> {
    // Return user's preferred threshold
  }
}
```

### Phase 2: Approval & Verification System (Day 2)

#### 2.1 Confidence Scoring
```typescript
// lib/ai/confidence/confidence-scorer.ts
export class ConfidenceScorer {
  static async calculate(
    tool: string,
    params: any,
    context: EnhancedToolExecutionContext
  ): Promise<number> {
    // Multi-factor confidence calculation
    const factors = {
      parameterCertainty: this.assessParameters(params),
      historicalSuccess: await this.getHistoricalSuccess(tool, context),
      operationComplexity: this.assessComplexity(tool, params),
      userPreference: await this.getUserPreference(tool, context)
    }
    
    // Weighted average
    return this.weightedAverage(factors)
  }
}
```

#### 2.2 Approval Dialog Component
```typescript
// components/editor/ApprovalDialog/index.tsx
export function ApprovalDialog({
  request,
  onApprove,
  onReject,
  onModify
}: ApprovalDialogProps) {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side')
  const [selectedAlternative, setSelectedAlternative] = useState<number>(0)
  const [adjustedParams, setAdjustedParams] = useState(request.params)
  
  return (
    <Dialog open={!!request}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review {request.operation}</DialogTitle>
          <DialogDescription>
            Confidence: {(request.confidence * 100).toFixed(0)}%
          </DialogDescription>
        </DialogHeader>
        
        {/* Visual Comparison */}
        <ComparisonView
          before={request.preview.before}
          after={request.preview.after}
          mode={comparisonMode}
        />
        
        {/* Parameter Adjustment */}
        <ParameterAdjustment
          tool={request.tool}
          params={adjustedParams}
          onChange={setAdjustedParams}
        />
        
        {/* Alternative Suggestions */}
        {request.alternatives && (
          <AlternativeSuggestions
            alternatives={request.alternatives}
            selected={selectedAlternative}
            onSelect={setSelectedAlternative}
          />
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onReject(request.id)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => onModify(request.id, adjustedParams)}>
            Apply with Changes
          </Button>
          <Button onClick={() => onApprove(request.id)}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### 2.3 Comparison View Component
```typescript
// components/editor/ComparisonView/index.tsx
export function ComparisonView({ before, after, mode }: ComparisonViewProps) {
  switch (mode) {
    case 'side-by-side':
      return <SideBySideView before={before} after={after} />
    
    case 'overlay':
      return <OverlayView before={before} after={after} />
    
    case 'slider':
      return <SliderView before={before} after={after} />
    
    case 'difference':
      return <DifferenceView before={before} after={after} />
  }
}
```

### Phase 3: Incremental Processing (Day 3)

#### 3.1 Task Planner
```typescript
// lib/ai/orchestration/task-planner.ts
export class TaskPlanner {
  static async planWorkflow(
    request: string,
    context: CanvasContext
  ): Promise<PlannedWorkflow> {
    // Use AI to break down complex request
    const steps = await this.identifySteps(request)
    
    // Identify dependencies
    const dependencies = await this.analyzeDependencies(steps)
    
    // Group into batches
    const batches = this.createBatches(steps, dependencies)
    
    return {
      steps,
      batches,
      estimatedDuration: this.estimateDuration(steps),
      requiresApproval: this.determineApprovalPoints(steps)
    }
  }
}
```

#### 3.2 Step Executor
```typescript
// lib/ai/orchestration/step-executor.ts
export class StepExecutor {
  async executeStep(
    step: PlannedStep,
    context: EnhancedToolExecutionContext
  ): Promise<StepResult> {
    // Check if approval needed
    if (await this.requiresApproval(step, context)) {
      const approval = await this.requestApproval(step)
      if (!approval.approved) {
        return { status: 'cancelled', step }
      }
    }
    
    // Execute with progress tracking
    const result = await this.executeWithProgress(step, context)
    
    // Update context for next step
    context.workflowState?.completedSteps.push({
      step,
      result,
      timestamp: Date.now()
    })
    
    return result
  }
}
```

### Phase 4: Visual Feedback UI (Day 4)

#### 4.1 Progress Visualization
```typescript
// components/editor/WorkflowProgress/index.tsx
export function WorkflowProgress({ workflow }: WorkflowProgressProps) {
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {workflow.currentStep} of {workflow.totalSteps}</span>
          <span>{Math.round(workflow.progress * 100)}%</span>
        </div>
        
        <Progress value={workflow.progress * 100} />
        
        <div className="space-y-1">
          {workflow.steps.map((step, idx) => (
            <StepIndicator
              key={step.id}
              step={step}
              status={getStepStatus(step, workflow)}
              isActive={idx === workflow.currentStep}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}
```

#### 4.2 Parameter Adjustment UI
```typescript
// components/editor/ParameterAdjustment/index.tsx
export function ParameterAdjustment({ 
  tool, 
  params, 
  onChange,
  showPreview = true 
}: ParameterAdjustmentProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Debounced preview update
  const updatePreview = useDebouncedCallback(async (newParams) => {
    if (!showPreview) return
    
    setIsUpdating(true)
    const adapter = adapterRegistry.get(tool)
    if (adapter?.generatePreview) {
      const { after } = await adapter.generatePreview(newParams, canvas)
      setPreview(after)
    }
    setIsUpdating(false)
  }, 300)
  
  return (
    <div className="space-y-4">
      {/* Dynamic parameter fields based on tool schema */}
      <DynamicParameterFields
        schema={tool.inputSchema}
        values={params}
        onChange={(key, value) => {
          const newParams = { ...params, [key]: value }
          onChange(newParams)
          updatePreview(newParams)
        }}
      />
      
      {/* Live preview */}
      {showPreview && preview && (
        <div className="relative">
          {isUpdating && <LoadingOverlay />}
          <img src={preview} alt="Preview" className="rounded" />
        </div>
      )}
    </div>
  )
}
```

### Phase 5: Autonomy Controls (Day 5)

#### 5.1 Autonomy Settings Store
```typescript
// store/autonomyStore.ts
interface AutonomyState {
  // Global settings
  autoApprovalThreshold: number
  maxAutonomousSteps: number
  
  // Per-operation policies
  operationPolicies: Record<string, OperationPolicy>
  
  // Learning settings
  adaptFromHistory: boolean
  suggestionCount: number
  
  // Actions
  updateThreshold: (threshold: number) => void
  setOperationPolicy: (operation: string, policy: OperationPolicy) => void
  getPolicy: (operation: string) => OperationPolicy
  shouldAutoApprove: (operation: string, confidence: number) => boolean
}

export const useAutonomyStore = create<AutonomyState>()(
  persist(
    (set, get) => ({
      autoApprovalThreshold: 0.8,
      maxAutonomousSteps: 3,
      operationPolicies: {},
      adaptFromHistory: true,
      suggestionCount: 3,
      
      updateThreshold: (threshold) => set({ autoApprovalThreshold: threshold }),
      
      setOperationPolicy: (operation, policy) => 
        set(state => ({
          operationPolicies: {
            ...state.operationPolicies,
            [operation]: policy
          }
        })),
      
      getPolicy: (operation) => {
        const policies = get().operationPolicies
        return policies[operation] || 'ask-if-unsure'
      },
      
      shouldAutoApprove: (operation, confidence) => {
        const policy = get().getPolicy(operation)
        const threshold = get().autoApprovalThreshold
        
        switch (policy) {
          case 'auto-approve':
            return true
          case 'always-ask':
            return false
          case 'ask-if-unsure':
            return confidence >= threshold
        }
      }
    }),
    {
      name: 'fotofun-autonomy'
    }
  )
)
```

#### 5.2 Autonomy Settings Panel
```typescript
// components/editor/AutonomySettings/index.tsx
export function AutonomySettings() {
  const {
    autoApprovalThreshold,
    maxAutonomousSteps,
    operationPolicies,
    updateThreshold,
    setOperationPolicy
  } = useAutonomyStore()
  
  const operations = [
    { id: 'color-adjustment', label: 'Color Adjustments', risk: 'low' },
    { id: 'filter-application', label: 'Filters & Effects', risk: 'medium' },
    { id: 'object-removal', label: 'Object Removal', risk: 'high' },
    { id: 'generation', label: 'AI Generation', risk: 'high' }
  ]
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Autonomy Settings</CardTitle>
        <CardDescription>
          Control how much the AI can do without asking for approval
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Global threshold */}
        <div className="space-y-2">
          <Label>Auto-approval confidence threshold</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[autoApprovalThreshold * 100]}
              onValueChange={([v]) => updateThreshold(v / 100)}
              max={100}
              step={5}
            />
            <span className="text-sm w-12">{Math.round(autoApprovalThreshold * 100)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Operations with confidence above this will be auto-approved
          </p>
        </div>
        
        {/* Max steps */}
        <div className="space-y-2">
          <Label>Maximum autonomous steps</Label>
          <Select value={String(maxAutonomousSteps)} onValueChange={(v) => setMaxSteps(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 3, 5, 10, -1].map(n => (
                <SelectItem key={n} value={String(n)}>
                  {n === -1 ? 'Unlimited' : `${n} steps`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Per-operation policies */}
        <div className="space-y-3">
          <Label>Operation-specific policies</Label>
          {operations.map(op => (
            <div key={op.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{op.label}</span>
                <Badge variant={
                  op.risk === 'low' ? 'default' : 
                  op.risk === 'medium' ? 'secondary' : 
                  'destructive'
                }>
                  {op.risk} risk
                </Badge>
              </div>
              
              <Select
                value={operationPolicies[op.id] || 'ask-if-unsure'}
                onValueChange={(v) => setOperationPolicy(op.id, v as OperationPolicy)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto-approve">Auto-approve</SelectItem>
                  <SelectItem value="ask-if-unsure">Ask if unsure</SelectItem>
                  <SelectItem value="always-ask">Always ask</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        
        {/* Emergency stop */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Emergency Stop</AlertTitle>
          <AlertDescription>
            Press <kbd>Escape</kbd> at any time to cancel all AI operations
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
```

### Phase 6: Integration & Testing (Day 6)

#### 6.1 Enhanced AI Chat Integration
```typescript
// components/editor/Panels/AIChat/index.tsx (modifications)
export function AIChat() {
  // Add new state
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null)
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowState | null>(null)
  const autonomySettings = useAutonomyStore()
  const workflowManager = useRef(new WorkflowManager())
  
  // Enhanced tool call handler
  const enhancedOnToolCall = async ({ toolCall }) => {
    try {
      // Calculate confidence
      const confidence = await ConfidenceScorer.calculate(
        toolCall.toolName,
        toolCall.args,
        getEnhancedContext()
      )
      
      // Check autonomy settings
      const shouldAutoApprove = autonomySettings.shouldAutoApprove(
        toolCall.toolName,
        confidence
      )
      
      if (shouldAutoApprove) {
        // Execute directly
        return await ClientToolExecutor.execute(toolCall.toolName, toolCall.args)
      } else {
        // Request approval
        const request = await createApprovalRequest(toolCall, confidence)
        setApprovalRequest(request)
        
        // Wait for user decision
        return await waitForApproval(request.id)
      }
    } catch (error) {
      console.error('[AIChat] Enhanced tool execution error:', error)
      throw error
    }
  }
  
  // Handle approval decisions
  const handleApproval = async (requestId: string, decision: ApprovalDecision) => {
    const request = approvalRequests.get(requestId)
    if (!request) return
    
    // Learn from decision
    await userPreferenceManager.updateFromDecision(
      request.operation,
      request.params,
      decision.type,
      decision.modifiedParams
    )
    
    // Execute based on decision
    switch (decision.type) {
      case 'approve':
        await ClientToolExecutor.execute(request.operation, request.params)
        break
      case 'modify':
        await ClientToolExecutor.execute(request.operation, decision.modifiedParams)
        break
      case 'reject':
        // Record rejection for learning
        break
    }
    
    setApprovalRequest(null)
  }
  
  return (
    <>
      {/* Existing chat UI */}
      
      {/* Workflow progress */}
      {currentWorkflow && (
        <WorkflowProgress workflow={currentWorkflow} />
      )}
      
      {/* Approval dialog */}
      {approvalRequest && (
        <ApprovalDialog
          request={approvalRequest}
          onApprove={(id) => handleApproval(id, { type: 'approve' })}
          onReject={(id) => handleApproval(id, { type: 'reject' })}
          onModify={(id, params) => handleApproval(id, { type: 'modify', modifiedParams: params })}
        />
      )}
      
      {/* Autonomy indicator */}
      <AutonomyIndicator settings={autonomySettings} />
    </>
  )
}
```

#### 6.2 Testing Suite
```typescript
// __tests__/epic-5.5/karpathy-framework.test.ts
describe('Karpathy Framework Integration', () => {
  describe('Context Management', () => {
    it('maintains workflow state across operations', async () => {
      // Test workflow state persistence
    })
    
    it('learns from user preferences', async () => {
      // Test preference learning
    })
  })
  
  describe('Generation + Verification', () => {
    it('shows approval dialog for low confidence operations', async () => {
      // Test approval flow
    })
    
    it('generates alternative suggestions', async () => {
      // Test alternatives
    })
  })
  
  describe('Incremental Processing', () => {
    it('breaks complex tasks into steps', async () => {
      // Test task planning
    })
    
    it('creates checkpoints between steps', async () => {
      // Test checkpoint system
    })
  })
  
  describe('Visual Interface', () => {
    it('shows before/after comparison', async () => {
      // Test comparison views
    })
    
    it('allows real-time parameter adjustment', async () => {
      // Test parameter UI
    })
  })
  
  describe('Partial Autonomy', () => {
    it('respects user autonomy settings', async () => {
      // Test autonomy controls
    })
    
    it('learns from approval/rejection patterns', async () => {
      // Test learning system
    })
  })
})
```

## Success Metrics

1. **Context Preservation**: 95% of multi-step workflows complete without context loss
2. **Approval Accuracy**: 80% of auto-approved operations match user expectations
3. **User Control**: 100% of operations can be cancelled/modified before execution
4. **Performance**: Preview generation completes in <500ms
5. **Learning Effectiveness**: 50% reduction in approval requests after 100 operations

## Deliverables

### Core Systems
- [ ] Enhanced context management with workflow state
- [ ] Approval dialog system with confidence scoring
- [ ] Multi-step workflow orchestration
- [ ] Visual comparison UI (4 modes)
- [ ] Autonomy settings and controls
- [ ] User preference learning system

### UI Components
- [ ] ApprovalDialog component
- [ ] ComparisonView with multiple modes
- [ ] ParameterAdjustment component
- [ ] WorkflowProgress indicator
- [ ] AutonomySettings panel
- [ ] AutonomyIndicator widget

### Integration
- [ ] Enhanced AI chat with approval flow
- [ ] Tool execution with confidence routing
- [ ] Workflow state persistence
- [ ] User preference storage
- [ ] Emergency stop functionality

### Documentation
- [ ] User guide for autonomy controls
- [ ] Developer guide for adding new tools
- [ ] Architecture documentation
- [ ] Testing guidelines

## Timeline

- **Day 1**: Context & State Management
- **Day 2**: Approval & Verification System
- **Day 3**: Incremental Processing
- **Day 4**: Visual Feedback UI
- **Day 5**: Autonomy Controls
- **Day 6**: Integration & Testing

Total: 6 days of focused development

## Technical Debt & Future Considerations

1. **State Machine**: Consider migrating canvas initialization to state machine pattern
2. **Performance**: Optimize preview generation for large images
3. **Offline Support**: Add offline capability for learned preferences
4. **Advanced Learning**: Implement more sophisticated ML for preference learning
5. **Batch Operations**: Extend autonomy controls for batch processing

## Conclusion

This epic completes the Karpathy framework integration by building on FotoFun's existing foundation. The implementation focuses on practical, user-facing features that demonstrate all five principles while maintaining code quality and following established patterns. The result is a production-ready AI photo editing system that balances automation with user control. 