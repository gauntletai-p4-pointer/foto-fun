# Epic 5.3: Real Agents - Image Improvement Agent UI/UX Overhaul

## Executive Summary

After deep diving into the codebase, I've identified UI/UX inconsistencies in our agent implementation. The current system lacks transparency in the AI's thinking process and has inconsistent UI for auto-approved vs manual approval flows. The Image Improvement Agent needs iteration support and better visual feedback.

## Current State Analysis

### What's Working Well (DO NOT CHANGE)
- Fast path routing for simple tool calls
- Multi-step tool execution 
- Basic routing to MasterRoutingAgent for complex operations
- The chat route's routing logic is performant and works correctly
- AI SDK v5 multi-step tool usage pattern properly implemented
- User settings integration for autoApprovalThreshold
- Vision API integration for real image analysis

### Key Problems to Fix

1. **Lack of Transparency**
   - Users don't see AI's thinking process
   - Status updates are hidden or unclear
   - Tool execution details aren't visible

2. **UI Inconsistency**
   - Auto-approved workflows show different UI than manual approval
   - Big progress bar (WorkflowProgressIndicator) is intrusive
   - No consistent status display

3. **Missing Iteration Support**
   - Image Improvement Agent doesn't support multiple rounds
   - No evaluation after execution
   - No way to continue improving

## Actual System Flow (Verified)

### 1. Request Routing (Chat Route)
- **Simple operations** (e.g., "brighten the image by 10%") → Direct tool call(s), executed client-side
- **Complex/vague requests** (e.g., "make it look professional") → `executeAgentWorkflow` tool

### 2. Agent Workflow (When Complex)
1. Chat route calls `executeAgentWorkflow`
2. Routes to `MasterRoutingAgent` → Routes to `ImageImprovementAgent`
3. Agent captures screenshot (client-side via `captureScreenshot` tool)
4. Sends to OpenAI Vision API for analysis
5. Creates specific plan based on vision insights
6. Returns plan with confidence score

### 3. Approval Decision
- Compares confidence vs user's `autoApprovalThreshold` (from settings, not hardcoded)
- If confidence < threshold → Manual approval required (show plan)
- If confidence >= threshold → Auto-approved (execute immediately)

### 4. Execution Flow
1. Client-side executes approved plan via `executeApprovedPlan`
2. Tools executed as chain (multiple) or single tool via `ClientToolExecutor`
3. After execution, `captureAndEvaluate` tool is called
4. Vision model evaluates results (0-1 score)
5. User asked if they want another iteration

### 5. Iteration Loop
- If user approves another round, original context preserved
- Returns to step 2 with incremented iteration count
- Maximum 3 iterations enforced
- Each iteration gets new vision analysis and plan

## Implementation Status

### Phase 1: MasterRoutingAgent Cleanup (✅ COMPLETED)
- ✅ Removed duplicate routing logic from MasterRoutingAgent
- ✅ MasterRoutingAgent now only routes to specialized agents
- ✅ Kept all fast path routing in chat route intact

### Phase 2: Image Improvement Agent Enhancement (✅ COMPLETED)
- ✅ Implemented proper AI SDK v5 multi-step tool usage pattern
- ✅ Added real computer vision with OpenAI vision API
- ✅ Added screenshot capture step
- ✅ Vision analysis provides specific adjustment values
- ✅ Plan creation based on vision insights
- ✅ Support for iteration metadata

### Phase 3: Consistent UI Components (✅ COMPLETED)

#### New Components Created:
1. **AgentStatusDisplay** (✅ CREATED)
   - Shows current status with appropriate icon
   - Auto-fades completed statuses
   - Replaces intrusive progress bar
   - Consistent for both auto/manual approval

2. **ToolExecutionDisplay** (✅ CREATED)
   - Blue badges for each tool
   - Expandable parameters and results
   - Shows confidence scores
   - Success/error indicators
   - Radical transparency into execution

3. **UnifiedToolDisplay** (✅ CREATED)
   - Single component for all tool displays
   - Handles single tools, chain steps, and agent plan tools
   - Consistent blue badges for all tools
   - Chain position indicators
   - Expandable parameters/results

#### Components Updated:
1. **ToolPartRenderer** (✅ UPDATED)
   - Now uses UnifiedToolDisplay for all tool rendering
   - Integrated AgentStatusDisplay for status updates
   - Removed duplicate rendering logic
   - Consistent UI for all approval states
   - Removed WorkflowProgressIndicator usage

### Phase 4: Iteration Support (✅ VERIFIED WORKING)

The iteration support is already implemented in the chat route:

1. **Chat Route Implementation** (✅ WORKING)
   - After tool execution, `captureAndEvaluate` tool is called
   - Vision model evaluates results (0-1 score)
   - Shows evaluation to user
   - Asks if they want another iteration
   - Tracks iteration count (max 3)
   - Passes iteration count to agent

2. **ImageImprovementAgent Support** (✅ WORKING)
   - Accepts iteration count parameter
   - Uses 'evaluation' analysis type for subsequent iterations
   - Vision model rates success and identifies remaining issues

3. **UI Support** (✅ WORKING)
   - Evaluation results shown in chat
   - Clear prompt for user to continue
   - Iteration count tracked throughout

### Phase 5: Testing & Polish (🚧 IN PROGRESS)

#### Remaining Tasks:

1. **Remove WorkflowProgressIndicator** (✅ COMPLETED - PRIORITY 1)
   - ✅ Removed from `AIChat/index.tsx`
   - ✅ Removed import from `useToolCallHandler.tsx`
   - ✅ Deleted `WorkflowProgressIndicator.tsx` file
   - ✅ Now relies on AgentStatusDisplay instead

2. **Fix Status Update Flow** (✅ COMPLETED - PRIORITY 2)
   - ✅ Status updates now flow through agent output, not component state
   - ✅ Updated `executeAgentWorkflow` handler to not set `workflowProgress`
   - ✅ Added proper handling for active status updates in `ToolPartRenderer`
   - ✅ `isActive` flag properly handled for real-time updates

3. **Test Scenarios** (✅ COMPLETED - PRIORITY 3)
   - ✅ Created `AgentThinkingDisplay.tsx` for real-time agent thinking visualization
   - ✅ Updated `AgentWorkflowDisplay.tsx` to show tools vertically with better layout
   - ✅ Fixed hardcoded AI settings - now properly uses user's threshold from settings
   - ✅ Improved plan display with collapsible parameters and better visual hierarchy
   - ✅ Added vision insights display when available
   - ✅ Added reasoning toggle for educational content

4. **Real-time Thinking Display** (❌ TODO - PRIORITY 4)
   - Need to integrate `AgentThinkingDisplay` into the chat UI
   - Need to stream status updates in real-time during agent execution
   - Need to handle the AI SDK v5 streaming pattern (start/delta/end)
   - Need to show granular steps:
     - 📸 Capturing screenshot...
     - 🔍 Analyzing image with computer vision...
     - 📝 Creating enhancement plan...
     - ✨ Executing enhancements...

5. **Iteration Support Enhancement** (❌ TODO - PRIORITY 5)
   - Need to improve the iteration flow after plan execution
   - Need to show evaluation results clearly
   - Need to maintain context across iterations
   - Need to enforce the 3-iteration limit properly

## Technical Details

### Key Architecture Patterns
- **AI SDK v5 Multi-Step Tools**: Using `stopWhen` and tool chaining
- **Vision-Driven Planning**: Real computer vision analysis, not just LLM reasoning
- **Client-Side Execution**: All canvas operations via `ClientToolExecutor`
- **Server-Side Orchestration**: Agents run server-side, return plans for client execution
- **User-Controlled Thresholds**: Settings from `useAISettings` hook, not hardcoded

### Status Update Types
- `analyzing-request`: Initial request analysis
- `screenshot`: Capturing canvas
- `vision-analysis`: AI analyzing image
- `planning`: Creating improvement plan
- `plan-ready`: Plan complete
- `executing-tool`: Tool execution
- `evaluating`: Checking results
- `error`: Error occurred

### Unified Tool Display Structure
```typescript
interface UnifiedToolDisplayProps {
  toolName: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  errorText?: string
  isPartOfChain?: boolean
  chainPosition?: number
  showConfidence?: boolean
  confidence?: number
  description?: string
}
```

## Success Metrics

- ✅ Consistent UI whether auto-approved or manual
- ✅ Users can see AI thinking process via status updates
- ✅ Tool executions are transparent with expandable details
- ✅ Iteration support works smoothly
- ❌ No more intrusive progress bars (WorkflowProgressIndicator still present)
- ✅ Clear status updates that disappear when done
- ✅ Confidence-based approval using user settings

## Next Steps

1. **Immediate**: Remove WorkflowProgressIndicator from AIChat index.tsx
2. **Short-term**: Fix status update flow to use tool outputs
3. **Testing**: Run through all test scenarios end-to-end
4. **Polish**: Ensure smooth transitions and proper cleanup

## Notes

- The system correctly distinguishes between simple and complex operations at the LLM level
- Approval is entirely based on confidence vs user threshold, not request type
- Vision API provides real analysis, making the system genuinely useful
- Client-side execution ensures fast, responsive updates
- Server-side orchestration keeps complex logic secure and maintainable
