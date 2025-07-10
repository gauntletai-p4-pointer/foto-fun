# FotoFun Selection System Design

## Overview

This document outlines the robust, maintainable, and scalable selection system for FotoFun that ensures tools only operate on intended objects.

## Core Problems Solved

1. **Selection Drift** - Selection changing during multi-step operations
2. **Type Mismatches** - Tools operating on wrong object types
3. **Timing Issues** - Race conditions between selection changes and tool execution
4. **AI Chat Reliability** - Ensuring AI operations target the correct objects

## Architecture

### 1. SelectionSnapshot (Immutable State)

The foundation is the `SelectionSnapshot` class that captures and freezes selection state:

```typescript
class SelectionSnapshot {
  readonly id: string
  readonly timestamp: number
  readonly objects: ReadonlyArray<FabricObject>
  readonly objectIds: ReadonlySet<string>
  readonly isEmpty: boolean
  readonly count: number
  readonly types: ReadonlySet<string>
}
```

**Key Features:**
- Immutable once created
- Type-safe object filtering
- Integrity verification
- Efficient lookups via Sets

### 2. Selection Requirements

Tools and operations can declare their selection requirements:

```typescript
interface SelectionRequirements {
  minCount?: number        // Minimum objects required
  maxCount?: number        // Maximum objects allowed
  requiredTypes?: string[] // Required object types
  allowEmpty?: boolean     // Allow no selection
}
```

### 3. Selection Flow

#### For Normal Tools:
1. User selects objects on canvas
2. Tool activated
3. Tool uses `getTargetObjects()` which checks:
   - SelectionSnapshot (if set by AI)
   - SelectionContext (for backward compatibility)
   - Current canvas selection
   - All objects (if tool allows)

#### For AI Chat:
1. User selects objects BEFORE starting chat
2. MasterRoutingAgent captures SelectionSnapshot
3. Validates selection meets requirements
4. Passes snapshot through entire ToolChain
5. Each tool in chain operates on snapshot objects

### 4. Implementation Details

#### BaseTool Enhancement
```typescript
class BaseTool {
  protected selectionSnapshot: SelectionSnapshot | null = null
  protected targetObjectTypes: string[] = []
  protected requiresSelection: boolean = false
  
  setSelectionSnapshot(snapshot: SelectionSnapshot | null): void
  protected getTargetObjects(): FabricObject[]
}
```

#### ToolChain Selection Management
```typescript
class ToolChain {
  private selectionSnapshot: SelectionSnapshot | null = null
  
  constructor(options: ChainOptions) {
    // Capture snapshot immediately
    this.selectionSnapshot = SelectionSnapshotFactory.fromCanvas(context.canvas)
    
    // Validate if requirements provided
    if (options.selectionRequirements) {
      const validation = SelectionValidator.validate(...)
    }
  }
}
```

## User Experience

### For Regular Tools

**With Selection:**
- Tools operate only on selected objects
- Clear visual feedback
- Type filtering (e.g., brightness only affects images)

**Without Selection:**
- Tools that don't require selection work on all compatible objects
- Tools that require selection show error message

### For AI Chat

**New Flow:**
1. User loads/creates image
2. User selects object(s) they want to modify
3. User types AI command
4. AI operates ONLY on selected objects
5. Selection persists through entire operation

**Benefits:**
- Predictable behavior
- No accidental modifications
- Clear user control
- Works with multiple objects

## Error Handling

### Validation Errors
- "Please select at least one object"
- "Please select at most 3 objects"
- "Please select image objects"

### Integrity Errors
- Objects removed during operation
- Canvas state changed
- Selection snapshot corrupted

## Migration Path

1. **Phase 1** - Core Infrastructure (COMPLETE)
   - SelectionSnapshot class
   - SelectionValidator
   - BaseTool enhancements

2. **Phase 2** - AI Integration (IN PROGRESS)
   - MasterRoutingAgent validation
   - ToolChain snapshot support
   - Adapter updates

3. **Phase 3** - Tool Updates
   - Update each tool to respect snapshots
   - Add targetObjectTypes configuration
   - Set requiresSelection flags

4. **Phase 4** - UI Enhancements
   - Selection indicators
   - Pre-flight validation
   - Better error messages

## Best Practices

### For Tool Developers

1. **Declare Requirements**
   ```typescript
   class MyTool extends BaseTool {
     protected targetObjectTypes = ['image']
     protected requiresSelection = true
   }
   ```

2. **Use getTargetObjects()**
   ```typescript
   const objects = this.getTargetObjects()
   if (objects.length === 0) {
     // Handle no valid objects
   }
   ```

3. **Never Bypass Selection**
   - Don't use canvas.getObjects() directly
   - Don't modify objects outside selection
   - Respect the snapshot if provided

### For AI Adapter Developers

1. **Pass Through Snapshots**
   ```typescript
   async execute(params, context) {
     const tool = this.getTool()
     if (context.selectionSnapshot) {
       tool.setSelectionSnapshot(context.selectionSnapshot)
     }
   }
   ```

2. **Validate Early**
   - Check selection requirements in adapter
   - Provide clear error messages
   - Don't proceed with invalid selection

## Future Enhancements

1. **Selection Presets**
   - Save common selections
   - Quick select by type
   - Selection templates

2. **Smart Selection**
   - AI-assisted object selection
   - Similar object detection
   - Batch selection tools

3. **Selection History**
   - Undo/redo selection changes
   - Selection snapshots in history
   - Restore previous selections

4. **Advanced Validation**
   - Conditional requirements
   - Dynamic validation rules
   - Context-aware requirements

## Conclusion

This selection system provides a robust foundation for predictable tool behavior while maintaining flexibility for different use cases. The immutable snapshot approach ensures consistency across complex operations while the validation system prevents user errors before they happen. 