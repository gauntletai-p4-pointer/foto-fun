# Phase 1: Foundation & Type Safety - Implementation Tasks

## Priority Order (Based on Current Errors)

### Task 1: Fix AI Chat Components (Blocking UI)
The AI chat is completely broken due to Fabric references. This needs immediate attention.

#### Files to Update:
1. `components/editor/Panels/AIChat/index.tsx`
2. `components/editor/Panels/AIChat/EnhancedAIChat.tsx`
3. `components/editor/Panels/AIChat/hooks/useToolCallHandler.tsx`

#### Changes Required:
```typescript
// OLD: Expecting fabricCanvas
const activeObjects = fabricCanvas?.getActiveObjects() || []

// NEW: Using CanvasManager
const canvasManager = useService<CanvasManager>('CanvasManager')
const selection = canvasManager?.state.selection
const selectedObjects = selection?.type === 'objects' 
  ? selection.objectIds.map(id => canvasManager.findObject(id)).filter(Boolean)
  : []
```

### Task 2: Update Canvas Store State
Remove all Fabric references from store state interfaces.

#### Files to Update:
1. `lib/store/canvas/CanvasStore.ts`
2. `lib/store/canvas/TypedCanvasStore.ts`

#### Changes Required:
- Remove `fabricCanvas` property
- Remove `hasContent` computed property (use canvasManager methods)
- Update all methods to use CanvasManager API

### Task 3: Fix Selection System
The selection system is critical and many components depend on it.

#### Create New Files:
1. `lib/editor/selection/SelectionManager.ts`
2. `lib/editor/selection/SelectionRenderer.ts`

#### Implementation:
```typescript
export class SelectionManager {
  constructor(
    private canvasManager: CanvasManager,
    private eventBus: TypedEventBus
  ) {}

  // Pixel-based selection
  async createPixelSelection(bounds: Rect, mask?: ImageData): Promise<void> {
    const selection: Selection = {
      type: 'pixel',
      bounds,
      mask: mask || await this.createMask(bounds)
    }
    
    await this.eventBus.emit('selection.created', { selection })
  }

  // Object-based selection
  selectObjects(objectIds: string[]): void {
    const selection: Selection = {
      type: 'objects',
      objectIds
    }
    
    this.eventBus.emit('selection.changed', { selection })
  }
}
```

### Task 4: Create Command System Base
Implement new command pattern for Konva.

#### Create New Files:
1. `lib/editor/commands/base/KonvaCommand.ts`
2. `lib/editor/commands/CommandContext.ts`

#### Implementation:
```typescript
export interface CommandContext {
  canvasManager: CanvasManager
  eventBus: TypedEventBus
  eventStore: EventStore
}

export abstract class KonvaCommand {
  constructor(protected context: CommandContext) {}
  
  abstract execute(): Promise<void>
  abstract undo(): Promise<void>
  abstract canExecute(): boolean
  abstract getDescription(): string
}
```

### Task 5: Remove Fabric Package & Update Imports
This is the final step once other tasks are complete.

#### Steps:
1. Create a script to find all Fabric imports
2. Update each file to use migration utilities
3. Remove fabric from package.json
4. Run tests to verify

## Implementation Script

Create `scripts/migrate-fabric-imports.ts`:

```typescript
import { glob } from 'glob'
import { readFile, writeFile } from 'fs/promises'

const FABRIC_IMPORT_REGEX = /import\s+(?:type\s+)?{[^}]+}\s+from\s+['"]fabric['"]/g
const FABRIC_TYPE_REGEX = /(?:Canvas|FabricObject|IText|Textbox|Path|Group|Rect|Circle)/g

async function migrateFabricImports() {
  const files = await glob('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', 'dist/**']
  })
  
  for (const file of files) {
    const content = await readFile(file, 'utf-8')
    
    if (FABRIC_IMPORT_REGEX.test(content)) {
      console.log(`Migrating: ${file}`)
      
      let updated = content
      
      // Replace fabric imports with migration types
      updated = updated.replace(
        FABRIC_IMPORT_REGEX,
        "import type { FabricCanvasPolyfill } from '@/lib/migration/fabric-to-konva-types'"
      )
      
      // Add migration warning
      if (!updated.includes('logMigrationWarning')) {
        updated = `import { logMigrationWarning } from '@/lib/migration/fabric-to-konva-types'\n${updated}`
      }
      
      await writeFile(file, updated)
    }
  }
}

migrateFabricImports().catch(console.error)
```

## Validation Checklist

After each task:
- [ ] Run `bun typecheck` - should have fewer errors
- [ ] Run `bun lint` - should pass
- [ ] Test in browser - component should render
- [ ] Check console for migration warnings
- [ ] Document any breaking changes

## Next Steps

1. Start with Task 1 (AI Chat) as it's blocking the UI
2. Work through tasks in order
3. Create unit tests for new implementations
4. Update documentation as you go
5. Regular commits with clear messages

## Success Metrics

- Zero TypeScript errors related to Fabric
- All components render without errors
- Migration warnings logged but not blocking
- Tests passing for migrated components