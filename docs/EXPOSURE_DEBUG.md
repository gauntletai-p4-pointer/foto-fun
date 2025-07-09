# Exposure Command Debug Guide

## Issue
When user says "Turn the exposure down by 10%" nothing happens.

## Debug Points Added

I've added comprehensive debug logging throughout the entire flow. Here's what to look for in the browser console:

### 1. AI Chat API Entry Point
- `=== AI CHAT POST REQUEST ===` - Shows request received
- `Messages count:` - Number of messages in conversation
- `Last message:` - The actual user message
- `Agent mode:` - Whether agent mode is enabled
- `Available AI tools:` - List of all available tools
- `Has adjustExposure:` - Whether exposure tool is available

### 2. Agent vs Non-Agent Mode
- `[AI Chat] Using AGENT MODE` - Agent mode path
- `[AI Chat] Using NON-AGENT MODE` - Direct tool execution path

### 3. MasterRoutingAgent Analysis
- `[MasterRoutingAgent] === ANALYZING REQUEST ===` - Request analysis start
- `[MasterRoutingAgent] Request:` - The request being analyzed
- `[MasterRoutingAgent] Available tools:` - Tools available to agent
- `[MasterRoutingAgent] === ROUTE ANALYSIS RESULT ===` - Analysis results
- `[MasterRoutingAgent] Route type:` - How the request was classified
- `[MasterRoutingAgent] Suggested tool:` - Which tool was suggested

### 4. Agent Workflow Execution
- `[Agent v5] === EXECUTING AGENT WORKFLOW ===` - Agent workflow start
- `[Agent v5] Request:` - Request passed to agent

### 5. Client-Side Tool Execution
- `[AIChat] ===== onToolCall TRIGGERED =====` - Tool call from AI
- `[AIChat] === AGENT WORKFLOW TOOL DETECTED ===` - Agent workflow detected
- `[AIChat] === EXECUTING INDIVIDUAL TOOL ===` - Individual tool execution
- `[ClientToolExecutor] === EXECUTE TOOL ===` - Client tool executor
- `[ExposureToolAdapter] ===== EXECUTE CALLED =====` - Exposure tool execution

## Testing Steps

### Step 1: Basic Test
Visit `/api/test-exposure` (POST request) to test the exposure adapter directly:
```bash
curl -X POST http://localhost:3000/api/test-exposure
```

### Step 2: Live Debug
1. Open browser developer tools (F12)
2. Go to Console tab
3. Load an image in the editor
4. Enable agent mode in AI chat
5. Type "Turn the exposure down by 10%"
6. Watch the console for debug messages

### Step 3: Check Debug Endpoint
Visit `/api/ai/debug` to verify:
- Adapter registration
- Tool availability
- System status

## Root Cause Analysis

### 1. Exposure Adapter Registration
The exposure adapter is registered in `lib/ai/adapters/registry.ts`:
```typescript
adapterRegistry.register(ExposureAdapter) // Line 104
```

### 2. Exposure Adapter Description
Updated to include percentage-based commands:
```typescript
description = `Adjust image exposure (simulates camera exposure compensation). You MUST calculate the adjustment value based on user intent.
Common patterns you should use:
- "increase exposure" or "overexpose" → +30 to +50
- "decrease exposure" or "underexpose" → -30 to -50
- "slightly overexposed" → +15 to +25
- "slightly underexposed" → -15 to -25
- "blown out" or "very overexposed" → +60 to +80
- "very dark" or "very underexposed" → -60 to -80
- "adjust exposure by X stops" → X * 33 (each stop ≈ 33 units)
- "turn exposure down by X%" → use -X directly (e.g., "down by 10%" → -10)
- "turn exposure up by X%" → use +X directly (e.g., "up by 15%" → +15)
- "increase exposure X%" → use +X directly 
- "decrease exposure X%" → use -X directly
- "reduce exposure X%" → use -X directly
Note: Exposure has a more dramatic effect than brightness, affecting the entire tonal range.
NEVER ask for exact values - always interpret the user's intent and choose an appropriate value.`
```

### 3. MasterRoutingAgent Routing
Updated to properly route percentage-based commands as simple-tool operations:
```typescript
2. **simple-tool**: Single, straightforward tool operations
   - Examples: "make it brighter", "crop to square", "rotate 90 degrees"
   - Also includes percentage adjustments: "turn exposure down by 10%", "increase brightness by 20%"
   - Should be high confidence (>0.8) for auto-approval
   - Suggest the specific tool to use
```

## Debug Steps

### Step 1: Check if adapter is registered
Visit: `/api/ai/debug` to see:
- If `adjustExposure` is in the adapters list
- If `hasAdjustExposure` is true
- Total number of adapters

### Step 2: Check console logs
Look for these console messages:
- `[AdapterRegistry] Registered AI adapter: adjustExposure`
- `[ExposureToolAdapter] ===== EXECUTE CALLED =====`
- `[MasterRoutingAgent] Route analysis:`

### Step 3: Test the command
1. Load an image in the editor
2. Enable agent mode (toggle in AI chat)
3. Say "Turn the exposure down by 10%"
4. Check console for debug messages

### Step 4: Alternative commands to test
- "Decrease exposure by 10%"
- "Reduce exposure 10%"
- "Lower the exposure"
- "Make it darker"

## Expected Behavior

1. **Route Analysis**: Should classify as `simple-tool` with high confidence
2. **Tool Selection**: Should suggest `adjustExposure`
3. **Parameter Inference**: Should infer `{ adjustment: -10 }`
4. **Execution**: Should call `ExposureToolAdapter.execute()` with the parameters
5. **Canvas Update**: Should apply exposure filter and re-render canvas

## Common Issues

### Issue 1: Agent Mode Not Enabled
- **Solution**: Enable agent mode in AI chat settings
- **Check**: Look for "Agent Mode" toggle in the AI chat panel

### Issue 2: No Image Loaded
- **Solution**: Load an image first
- **Check**: Canvas should have content before adjusting exposure

### Issue 3: Command Not Recognized
- **Solution**: Use more explicit commands like "adjust exposure by -10"
- **Check**: Try different phrasings of the command

### Issue 4: Tool Not Registered
- **Solution**: Check `/api/ai/debug` endpoint
- **Check**: Ensure `adjustExposure` appears in the tools list

## Files Modified
1. `foto-fun/lib/ai/adapters/tools/exposure.ts` - Updated description and added debug logs
2. `foto-fun/lib/ai/agents/MasterRoutingAgent.ts` - Updated routing for percentage commands
3. `foto-fun/lib/ai/adapters/registry.ts` - Added debug output for registration
4. `foto-fun/app/api/ai/debug/route.ts` - Added debug endpoint

## Testing Commands
```bash
# Test the debug endpoint
curl http://localhost:3000/api/ai/debug

# Check console for registration messages
# Look for: [AdapterRegistry] Registered AI adapter: adjustExposure
``` 