# Epic 5.3: Real Agents - Image Improvement Agent UI/UX Overhaul

## Status Update (Current State)

### ✅ What's Been Completed

#### Phase 1-4: Core Implementation (COMPLETED)
- MasterRoutingAgent cleanup - only routes, no duplicate logic
- ImageImprovementAgent enhanced with vision API integration
- Approval flow UI/UX improvements
- Basic iteration support infrastructure

#### Phase 5: UI/UX Fixes (COMPLETED)
1. **Removed WorkflowProgressIndicator** - Now uses AgentStatusDisplay
2. **Fixed hardcoded threshold bugs**:
   - Fixed in chat route (was 0.8)
   - Fixed in AIChat component (was 0.8)
   - Now properly uses user's actual threshold setting
3. **Fixed vision analysis visibility** - Shows actual AI insights
4. **Fixed UI overflow issues**:
   - Added max-height and scrolling to prevent clipping
   - Custom display for agent workflow tools
   - Tool descriptions on separate lines
   - Added padding around approval messages
5. **Added workflow transparency**:
   - Shows both high-level workflow steps (with emojis)
   - Expandable detailed analysis steps
   - Fixed confidence display (was showing 0%)

### ❌ Critical Issue Discovered

**The current implementation does NOT follow the evaluator-optimizer pattern properly:**
- No real evaluation loop between iterations
- No memory/context between iterations
- Agent can't see current canvas state in subsequent iterations
- Suggests the same changes repeatedly
- Missing the automatic re-evaluation flow

## New Plan: Implement True Evaluator-Optimizer Pattern

### Problem Analysis

The current implementation fails because:
1. **Stateless iterations** - Each iteration starts fresh with no context
2. **No canvas state** - Agent works with placeholders, not real screenshots
3. **Manual iteration** - User has to manually ask for more improvements
4. **No feedback loop** - Evaluation results don't feed into next iteration

### Architectural Changes Required

#### 1. Agent Workflow Restructure
Convert ImageImprovementAgent from single-pass to true iterative workflow:
```typescript
// Current (broken)
execute() → analyze → plan → return

// New (proper evaluator-optimizer)
execute() with stopWhen → 
  while (!goalsMet && iterations < 3) {
    captureCurrentCanvas →
    analyze →
    plan →
    getApproval →
    execute →
    evaluateResults →
    if (!satisfied) continueWithFeedback
  }
```

#### 2. Real Canvas State Capture
- Fix `captureScreenshot` to use actual canvas data
- Pass real screenshots from client to server
- Ensure each iteration sees the CURRENT state

#### 3. Iteration Context Management
```typescript
type IterationContext = {
  iterationCount: number
  originalRequest: string
  previousAdjustments: Adjustment[]
  currentCanvasScreenshot: string
  lastEvaluation: EvaluationResult | null
  cumulativeChanges: string[]
}
```

### Implementation Phases

#### Phase 6: Fix Screenshot System (PRIORITY 1)
- [ ] Update `captureScreenshot` tool to request client-side capture
- [ ] Modify tool execution flow to handle async screenshot capture
- [ ] Ensure real canvas state is passed to vision API
- [ ] Remove placeholder image usage

#### Phase 7: Implement Evaluation Loop (PRIORITY 2)
- [ ] Add `evaluateAndDecide` tool to ImageImprovementAgent
- [ ] Implement `stopWhen` pattern with proper conditions
- [ ] Structure evaluation results to drive next iteration
- [ ] Auto-generate new plans based on evaluation feedback

#### Phase 8: Context & Memory Management (PRIORITY 3)
- [ ] Pass iteration context through the workflow
- [ ] Track cumulative adjustments to prevent duplicates
- [ ] Maintain evaluation history
- [ ] Include previous changes in new plan generation

#### Phase 9: Streamline UI/UX Flow (PRIORITY 4)
- [ ] Single approval per iteration (not per step)
- [ ] Show iteration progress (1/3, 2/3, etc.)
- [ ] Display evaluation scores and feedback
- [ ] Remove manual "continue?" prompts

#### Phase 10: Testing & Polish (PRIORITY 5)
- [ ] Test multi-iteration workflows
- [ ] Verify no duplicate adjustments
- [ ] Ensure proper goal satisfaction detection
- [ ] Handle edge cases (max iterations, etc.)

### Expected Flow After Implementation

1. **User**: "Enhance this photo"
2. **Agent**: 
   - Captures current canvas
   - Analyzes with vision API
   - Creates initial plan (shows confidence)
   - Waits for approval
3. **User**: Approves
4. **Agent**:
   - Executes improvements
   - Automatically re-captures canvas
   - Evaluates results against original goals
   - If satisfied (>85%): "Goals achieved! The image now has..."
   - If not satisfied: "Achieved 70% of goals. Here's what still needs work..." [new plan]
5. **Loop continues** until goals met or 3 iterations complete

### Success Criteria

- [ ] Agent can see and analyze current canvas state in each iteration
- [ ] Evaluation results properly feed into next iteration
- [ ] No duplicate adjustments across iterations
- [ ] Automatic re-evaluation without user prompting
- [ ] Clear progress tracking through iterations
- [ ] Proper termination when goals achieved

### Technical Requirements

1. **Use AI SDK v5 patterns**:
   - `stopWhen` for iteration control
   - Proper tool chaining within agent
   - Structured evaluation results

2. **Canvas Integration**:
   - Real-time screenshot capture
   - Client-server screenshot passing
   - Current state visibility

3. **Memory System**:
   - Iteration context preservation
   - Cumulative change tracking
   - Evaluation history

### Notes

- This is a fundamental architectural change, not just a UI fix
- Requires rethinking how the agent workflow operates
- Must maintain backwards compatibility with single-iteration requests
- Performance considerations for multiple vision API calls

### References

- AI SDK v5 Evaluator-Optimizer Pattern: `docs/agents-v5.md`
- Current Implementation: `lib/ai/agents/specialized/ImageImprovementAgent.ts`
- Chat Route: `app/api/ai/chat/route.ts`
