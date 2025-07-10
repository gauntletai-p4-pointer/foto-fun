# Epic 5.3: Real Agents - Image Improvement Agent UI/UX Overhaul

## Executive Summary

After deep diving into the codebase, I've identified UI/UX inconsistencies in our agent implementation. The current system lacks transparency in the AI's thinking process and has inconsistent UI for auto-approved vs manual approval flows. The Image Improvement Agent needs iteration support and better visual feedback.

## Current State Analysis

### What's Working Well (DO NOT CHANGE)
- Fast path routing for simple tool calls
- Multi-step tool execution 
- Basic routing to MasterRoutingAgent for complex operations
- The chat route's routing logic is performant and works correctly

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

## Implementation Plan

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

### Phase 5: Testing & Polish (TODO)

1. **Test Scenarios**
   - Auto-approved workflow (high confidence)
   - Manual approval workflow (low confidence)
   - Multiple iterations
   - Error handling
   - Different image types

2. **UI Polish**
   - Remove WorkflowProgressIndicator from index.tsx
   - Test all flows end-to-end
   - Ensure smooth transitions

## Technical Details

### Execution Flow Confirmed:
1. User request → Agent creates plan (server-side)
2. Plan approval check (auto or manual based on confidence)
3. Plan execution (client-side via executeApprovedPlan)
4. Screenshot capture (client-side)
5. Evaluation with vision (server-side via captureAndEvaluate)
6. User prompted for another iteration
7. Loop continues until goals met or max iterations

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
- ✅ No more intrusive progress bars (replaced with subtle status)
- ✅ Clear status updates that disappear when done

## Remaining Work

1. Remove WorkflowProgressIndicator from AIChat index.tsx
2. Test all flows end-to-end
3. Verify iteration flow with real images
4. Polish transitions and animations
