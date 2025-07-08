# Epic 14: Enhanced Version History

## Overview
This epic enhances the existing command-based undo/redo system into a comprehensive version history system with persistent storage, visual timeline, branching, and cloud sync capabilities. Works for both self-hosted and cloud deployments.

## Goals
1. **Persistent history** - Save command history across sessions
2. **Visual timeline** - See and navigate through edit history
3. **Named versions** - Create checkpoints with descriptions
4. **Branching history** - Explore alternative edits without losing work
5. **Cloud sync** - Automatic backup and sync (cloud version)

## Current State Analysis

### Existing Foundation
- **Command Pattern**: Solid implementation in `lib/editor/commands/`
- **History Store**: `store/historyStore.ts` manages undo/redo
- **Command Types**: Well-defined command interfaces with serialization potential
- **Document Store**: `store/documentStore.ts` tracks document metadata
- **Limited to session** - History is lost on reload

### Leverageable Components
- `ICommand` interface already has `id`, `timestamp`, `description`
- Commands are designed to be reversible (undo/redo)
- Composite commands group related operations

## Technical Approach

### Phase 1: Command Serialization

Extend existing commands for persistence:

```typescript
// Extend lib/editor/commands/base/Command.ts
export interface ICommand {
  // ... existing properties
  
  /**
   * Serialize command for storage
   */
  serialize(): SerializedCommand
  
  /**
   * Deserialize from storage
   */
  static deserialize?(data: SerializedCommand): ICommand
}

export interface SerializedCommand {
  id: string
  type: string
  timestamp: number
  description: string
  params: Record<string, any>
  userId?: string
}

// Example implementation for ModifyCommand
export class ModifyCommand extends Command {
  // ... existing implementation
  
  serialize(): SerializedCommand {
    return {
      id: this.id,
      type: 'ModifyCommand',
      timestamp: this.timestamp,
      description: this.description,
      params: {
        objectId: this.object.get('id'),
        properties: this.newProperties
      }
    }
  }
  
  static deserialize(data: SerializedCommand, canvas: Canvas): ModifyCommand {
    const object = canvas.getObjects().find(obj => obj.get('id') === data.params.objectId)
    if (!object) throw new Error('Object not found')
    
    return new ModifyCommand(canvas, object, data.params.properties)
  }
}
```

### Phase 2: Version History Database Schema

Add to `lib/db/schema.ts`:

```typescript
// Document versions table
export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  name: text('name'), // Optional user-provided name
  description: text('description'),
  
  // Snapshot data
  snapshotUrl: text('snapshot_url'), // Canvas state snapshot
  thumbnailUrl: text('thumbnail_url'), // Preview image
  
  // Branching support
  parentVersionId: uuid('parent_version_id')
    .references(() => documentVersions.id),
  branchName: text('branch_name').default('main'),
  
  // Metadata
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  // Stats
  commandCount: integer('command_count').default(0),
  fileSizeBytes: integer('file_size_bytes')
})

// Command history table
export const commandHistory = pgTable('command_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  versionId: uuid('version_id')
    .references(() => documentVersions.id),
  
  // Command data
  commandType: text('command_type').notNull(),
  commandData: jsonb('command_data').notNull(), // Serialized command
  
  // Ordering
  sequenceNumber: integer('sequence_number').notNull(),
  
  // Metadata
  executedBy: uuid('executed_by')
    .notNull()
    .references(() => profiles.id),
  executedAt: timestamp('executed_at').defaultNow().notNull()
})

// Indexes for performance
export const commandHistoryIndexes = {
  documentSequence: index('idx_command_history_doc_seq')
    .on(commandHistory.documentId, commandHistory.sequenceNumber),
  versionCommands: index('idx_command_history_version')
    .on(commandHistory.versionId)
}
```

### Phase 3: Enhanced History Store

Extend `store/historyStore.ts`:

```typescript
// Add to HistoryState interface
interface HistoryState {
  // ... existing properties
  
  // Version control
  currentVersion: DocumentVersion | null
  versions: DocumentVersion[]
  branches: Map<string, DocumentVersion[]>
  
  // Persistence
  saveVersion: (name?: string, description?: string) => Promise<DocumentVersion>
  loadVersion: (versionId: string) => Promise<void>
  createBranch: (name: string, fromVersion?: string) => Promise<void>
  mergeBranch: (branchName: string) => Promise<void>
  
  // Remote sync
  syncHistory: () => Promise<void>
  loadRemoteHistory: (documentId: string) => Promise<void>
  
  // Persistence settings
  autoSaveInterval: number // ms
  maxLocalHistory: number // commands before creating snapshot
}

// Enhanced implementation
export const useHistoryStore = create<HistoryState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // ... existing implementation
      
      saveVersion: async (name, description) => {
        const state = get()
        const { currentDocument } = useDocumentStore.getState()
        if (!currentDocument) throw new Error('No document open')
        
        // Create canvas snapshot
        const snapshot = await createCanvasSnapshot()
        const thumbnail = await createThumbnail()
        
        // Get commands since last version
        const lastVersion = state.currentVersion
        const commands = state.history.slice(
          lastVersion ? lastVersion.commandCount : 0
        )
        
        // Save to database
        const version = await saveVersionToDatabase({
          documentId: currentDocument.id,
          name,
          description,
          snapshot,
          thumbnail,
          commands: commands.map(h => h.command.serialize()),
          parentVersionId: lastVersion?.id
        })
        
        set(state => ({
          currentVersion: version,
          versions: [...state.versions, version]
        }))
        
        return version
      },
      
      loadVersion: async (versionId) => {
        const version = await loadVersionFromDatabase(versionId)
        
        // Load canvas snapshot
        await loadCanvasSnapshot(version.snapshotUrl)
        
        // Load command history
        const commands = await loadCommandHistory(version.id)
        const deserializedCommands = commands.map(cmd => 
          deserializeCommand(cmd)
        )
        
        set({
          history: deserializedCommands.map(cmd => ({
            command: cmd,
            timestamp: cmd.timestamp
          })),
          currentIndex: deserializedCommands.length - 1,
          currentVersion: version
        })
      }
    }))
  )
)
```

### Phase 4: Version Timeline UI

Create timeline component following existing patterns:

```typescript
// components/editor/VersionTimeline/index.tsx
import { useHistoryStore } from '@/store/historyStore'
import { formatDistanceToNow } from 'date-fns'

export function VersionTimeline() {
  const { versions, currentVersion, loadVersion } = useHistoryStore()
  const [selectedBranch, setSelectedBranch] = useState('main')
  
  return (
    <div className="version-timeline">
      <BranchSelector 
        branches={branches}
        selected={selectedBranch}
        onChange={setSelectedBranch}
      />
      
      <div className="timeline">
        {versions
          .filter(v => v.branchName === selectedBranch)
          .map(version => (
            <TimelineNode
              key={version.id}
              version={version}
              isActive={version.id === currentVersion?.id}
              onClick={() => loadVersion(version.id)}
            />
          ))}
      </div>
      
      <VersionDetails version={currentVersion} />
    </div>
  )
}

// Timeline node component
function TimelineNode({ version, isActive, onClick }) {
  return (
    <div 
      className={`timeline-node ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <img src={version.thumbnailUrl} alt={version.name} />
      <div className="version-info">
        <h4>{version.name || `Version ${version.versionNumber}`}</h4>
        <p>{version.description}</p>
        <time>{formatDistanceToNow(version.createdAt)} ago</time>
      </div>
    </div>
  )
}
```

### Phase 5: Auto-save and Sync

Background sync service:

```typescript
// lib/services/HistorySyncService.ts
export class HistorySyncService {
  private syncInterval: NodeJS.Timeout | null = null
  private commandBuffer: SerializedCommand[] = []
  
  startAutoSync(intervalMs: number = 30000) {
    this.syncInterval = setInterval(() => {
      this.syncPendingCommands()
    }, intervalMs)
    
    // Listen for commands
    useHistoryStore.subscribe(
      state => state.history,
      (history) => {
        const latestCommand = history[history.length - 1]
        if (latestCommand) {
          this.commandBuffer.push(latestCommand.command.serialize())
        }
      }
    )
  }
  
  private async syncPendingCommands() {
    if (this.commandBuffer.length === 0) return
    
    const commands = [...this.commandBuffer]
    this.commandBuffer = []
    
    try {
      await saveCommandsToDatabase(commands)
      
      // Create auto-save version every N commands
      if (shouldCreateAutoSave()) {
        await useHistoryStore.getState().saveVersion(
          'Auto-save',
          `Automatic checkpoint with ${commands.length} changes`
        )
      }
    } catch (error) {
      // Re-add commands to buffer on failure
      this.commandBuffer.unshift(...commands)
      console.error('Failed to sync history:', error)
    }
  }
}
```

## Implementation Plan

### Week 1: Command Serialization
- [ ] Add serialize method to all commands
- [ ] Create command deserializer factory
- [ ] Test serialization round-trip
- [ ] Handle edge cases (deleted objects, etc.)

### Week 2: Database & Storage
- [ ] Create version history schema
- [ ] Implement snapshot creation
- [ ] Set up storage (Supabase Storage)
- [ ] Create version management API

### Week 3: Enhanced History Store
- [ ] Extend history store with versioning
- [ ] Implement save/load versions
- [ ] Add branching support
- [ ] Create sync mechanism

### Week 4: UI Components
- [ ] Version timeline component
- [ ] Branch visualization
- [ ] Version comparison view
- [ ] Integration with existing UI

### Week 5: Auto-save & Optimization
- [ ] Background sync service
- [ ] Auto-save logic
- [ ] Storage optimization (compression)
- [ ] Performance tuning

## Testing Strategy

1. **Data Integrity**
   - Command serialization accuracy
   - Version restoration fidelity
   - Branch merging correctness

2. **Performance**
   - Large history navigation
   - Snapshot generation speed
   - Sync performance

3. **Edge Cases**
   - Network interruptions
   - Concurrent edits
   - Storage limits

## Deployment Considerations

### Self-Hosted
- Local storage for versions
- Optional S3/MinIO integration
- Manual backup options
- Full data ownership

### Cloud Version
- Automatic cloud backup
- Version storage included
- Cross-device sync
- Storage quotas by plan

## Success Metrics
- < 1s version switch time
- < 100ms command save latency
- 100% command restoration accuracy
- < 5MB storage per 1000 commands

## Risks & Mitigations
1. **Storage costs** → Incremental snapshots, compression
2. **Sync conflicts** → Conflict resolution UI
3. **Performance degradation** → Pagination, lazy loading
4. **Data loss** → Multiple backup strategies

---

**Status**: 📋 Planned
**Estimated Duration**: 5 weeks
**Dependencies**: Epic 12 (for collaborative versioning) 