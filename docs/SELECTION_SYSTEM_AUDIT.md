# Selection System Audit - Tools and Adapters

## Overview
This document audits all tools and adapters to ensure they follow a consistent, robust selection management pattern.

## Core Principles

### For Tools:
1. **NEVER** use `canvas.getActiveObjects()` directly
2. **ALWAYS** use `this.getTargetObjects()` or `this.getTargetImages()`
3. **NEVER** change selection during tool execution
4. Image-specific tools should use `getTargetImages()` which automatically filters for images

### For Adapters:
1. **ALWAYS** create a `SelectionSnapshot` from `context.targetImages`
2. Pass the snapshot to tools via:
   - `applyToolOperation()` for tools that use option updates
   - `tool.setSelectionSnapshot()` for tools that activate directly
3. **ALWAYS** clear the snapshot after use

### For Commands:
1. **NEVER** call `canvas.setActiveObject()` when `ToolChain.isExecutingChain` is true
2. This prevents selection changes mid-workflow

## Tool Audit

### ✅ Adjustment Tools (Using getTargetImages correctly)
- [x] brightnessTool - Uses `getTargetImages()`
- [x] contrastTool - Uses `getTargetImages()`
- [x] saturationTool - Uses `getTargetImages()` via BaseTool
- [x] hueTool - Uses `getTargetImages()` via BaseTool
- [x] exposureTool - Uses `getTargetImages()` via BaseTool
- [x] colorTemperatureTool - Uses `getTargetImages()` via BaseTool

### ✅ Filter Tools (Using getTargetImages correctly)
- [x] blurTool - Uses `getTargetImages()` via BaseTool
- [x] sharpenTool - Uses `getTargetImages()` via BaseTool
- [x] grayscaleTool - Uses `getTargetImages()` via BaseTool
- [x] sepiaTool - Uses `getTargetImages()` via BaseTool
- [x] invertTool - Uses `getTargetImages()` via BaseTool

### ✅ Transform Tools (Updated to use getTargetObjects)
- [x] rotateTool - Updated to use `getTargetObjects()`
- [x] flipTool - Updated to use `getTargetObjects()`
- [x] resizeTool - Updated to use `getTargetObjects()`
- [ ] cropTool - Need to check
- [ ] moveTool - Need to check

### ⚠️ Selection Tools
- [ ] marqueeRectTool - Need to check
- [ ] marqueeEllipseTool - Need to check
- [ ] lassoTool - Need to check
- [ ] magicWandTool - Need to check
- [ ] quickSelectionTool - Need to check

### ⚠️ Other Tools
- [ ] handTool - Probably doesn't need selection
- [ ] zoomTool - Probably doesn't need selection
- [ ] eyedropperTool - Need to check
- [ ] brushTool - Creates new objects
- [ ] eraserTool - Not active

### ✅ Text Tools
- [x] horizontalTypeTool - Creates new text
- [x] verticalTypeTool - Creates new text
- [ ] typeMaskTool - Need to check
- [ ] typeOnPathTool - Need to check

### ✅ AI-Native Tools
- [x] imageGenerationCanvasTool - Creates new images

## Adapter Audit

### ✅ Adjustment Adapters (Using applyToolOperation with snapshot)
- [x] brightnessAdapter - Uses FilterToolAdapter pattern
- [x] contrastAdapter - Uses FilterToolAdapter pattern
- [x] saturationAdapter - Uses `applyToolOperation` with snapshot
- [x] hueAdapter - Uses `applyToolOperation` with snapshot
- [x] exposureAdapter - Uses `applyToolOperation` with snapshot
- [x] colorTemperatureAdapter - Updated to use `applyToolOperation` with snapshot

### ✅ Filter Adapters
- [x] blurAdapter - Uses `applyToolOperation` with snapshot
- [x] sharpenAdapter - Updated to set snapshot on tool
- [ ] grayscaleAdapter - Need to check
- [ ] sepiaAdapter - Need to check
- [x] invertAdapter - Updated to set snapshot on tool

### ✅ Transform Adapters
- [x] rotateAdapter - Updated to set snapshot on tool
- [x] flipAdapter - Updated to set snapshot on tool
- [ ] resizeAdapter - Need to check
- [ ] cropAdapter - Need to check

### ✅ Other Adapters
- [x] addTextAdapter - Creates new text
- [x] imageGenerationAdapter - Creates new images
- [ ] canvasSelectionManager - Need to check
- [ ] analyzeCanvas - Read-only, probably OK

## Command Audit

### ✅ Updated Commands
- [x] AddTextCommand - Updated to not set active when in ToolChain
- [x] AddObjectCommand - Updated to not set active when in ToolChain
- [ ] Other commands that might change selection

## Issues Found and Fixed

1. **Selection Changes During Execution**
   - AddTextCommand was setting new text as active
   - AddObjectCommand was setting new objects as active
   - Fixed by checking `ToolChain.isExecutingChain`

2. **Tools Using Direct Selection**
   - rotateTool, flipTool, resizeTool were using `canvas.getActiveObjects()`
   - Fixed by using `getTargetObjects()`

3. **Adapters Not Setting Snapshots**
   - sharpen, colorTemperature adapters weren't setting snapshots
   - Fixed by updating to use proper patterns

4. **FilterToolAdapter Pattern**
   - brightness, contrast use FilterToolAdapter which needs integration
   - May need to update FilterToolAdapter base class

## Next Steps

1. Check remaining tools for direct selection usage
2. Check remaining adapters for snapshot usage
3. Update FilterToolAdapter pattern if needed
4. Test multi-step workflows thoroughly 