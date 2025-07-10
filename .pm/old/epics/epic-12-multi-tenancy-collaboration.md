# Epic 12: Multi-Tenancy & Real-Time Collaboration

## Overview
This epic implements multi-tenancy support and real-time collaboration features for FotoFun, enabling teams to work together on photo editing projects. The implementation will work for both self-hosted and cloud deployments, with the cloud version offering managed infrastructure.

## Goals
1. **Multi-tenancy architecture** - Support for workspaces/organizations
2. **Real-time collaboration** - Multiple users editing simultaneously
3. **Presence awareness** - See who's working and where
4. **Comments & feedback** - Contextual communication
5. **Access control** - Role-based permissions

## Current State Analysis

### Existing Foundation
- **Database**: Supabase with basic user profiles (`lib/db/schema.ts`)
- **Auth**: Supabase Auth integration (`lib/auth/`)
- **Canvas**: Fabric.js with command pattern (`lib/editor/commands/`)
- **State**: Zustand stores for local state management
- **No multi-user support** currently implemented

### Integration Points
- Command pattern can be extended for collaboration
- Zustand stores can sync with Supabase Realtime
- Canvas events can be broadcasted to collaborators

## Technical Approach

### Phase 1: Database Schema Enhancement

#### New Tables (following existing patterns in `lib/db/schema.ts`):

```typescript
// Workspaces for multi-tenancy
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => profiles.id),
  plan: text('plan', { enum: ['free', 'pro', 'enterprise'] }).default('free'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Workspace members
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'admin', 'editor', 'viewer'] }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
})

// Documents (projects)
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  thumbnail: text('thumbnail'), // Base64 or URL
  metadata: jsonb('metadata').default({}),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Collaboration sessions
export const collaborationSessions = pgTable('collaboration_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id),
  status: text('status', { enum: ['active', 'idle', 'disconnected'] }).default('active'),
  cursor: jsonb('cursor').default({}), // {x, y, tool}
  color: text('color').notNull(), // User's cursor color
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
})
```

### Phase 2: Collaboration Store

Create `store/collaborationStore.ts` following existing store patterns:

```typescript
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/db/supabase/client'

interface Collaborator {
  id: string
  userId: string
  name: string
  color: string
  cursor: { x: number; y: number } | null
  status: 'active' | 'idle' | 'disconnected'
  lastSeenAt: Date
}

interface CollaborationState {
  // Document info
  documentId: string | null
  workspaceId: string | null
  
  // Collaborators
  collaborators: Map<string, Collaborator>
  localUserId: string | null
  
  // Realtime
  channel: RealtimeChannel | null
  isConnected: boolean
  
  // Actions
  joinDocument: (documentId: string, workspaceId: string) => Promise<void>
  leaveDocument: () => void
  updateCursor: (x: number, y: number) => void
  broadcastCommand: (command: SerializedCommand) => void
  
  // Presence
  updatePresence: (status: 'active' | 'idle') => void
  
  // Internal
  _handlePresenceSync: (state: any) => void
  _handlePresenceJoin: (event: any) => void
  _handlePresenceLeave: (event: any) => void
  _handleBroadcast: (event: any) => void
}

export const useCollaborationStore = create<CollaborationState>()(
  subscribeWithSelector((set, get) => ({
    // Implementation following existing patterns...
  }))
)
```

### Phase 3: Command Broadcasting

Extend existing command pattern in `lib/editor/commands/base/Command.ts`:

```typescript
// Add to ICommand interface
export interface ICommand {
  // ... existing properties
  
  /**
   * Serialize command for broadcasting
   */
  serialize?(): SerializedCommand
  
  /**
   * Whether this command should be broadcasted
   */
  shouldBroadcast?: boolean
}

// New type for serialized commands
export interface SerializedCommand {
  type: string
  params: Record<string, any>
  userId: string
  timestamp: number
}
```

### Phase 4: Real-time Canvas Sync

Extend `store/canvasStore.ts` to handle remote commands:

```typescript
// Add to CanvasStore interface
interface CanvasStore {
  // ... existing properties
  
  // Collaboration
  applyRemoteCommand: (command: SerializedCommand) => Promise<void>
  lockObject: (objectId: string, userId: string) => void
  unlockObject: (objectId: string) => void
  isObjectLocked: (objectId: string) => boolean
}
```

### Phase 5: UI Components

Following existing component patterns in `components/editor/`:

1. **CollaboratorCursors** - Render other users' cursors
2. **PresenceIndicator** - Show active collaborators
3. **DocumentComments** - Contextual feedback system
4. **ShareDialog** - Invite users to workspace/document

## Implementation Plan

### Week 1: Database & Infrastructure
- [ ] Create migration for new tables
- [ ] Set up Supabase Realtime
- [ ] Create workspace management API routes
- [ ] Implement basic RBAC

### Week 2: Collaboration Engine
- [ ] Create CollaborationStore
- [ ] Implement presence system
- [ ] Add command serialization
- [ ] Set up broadcast channels

### Week 3: Canvas Integration
- [ ] Cursor rendering system
- [ ] Object locking mechanism
- [ ] Conflict resolution (OT/CRDT)
- [ ] Remote command execution

### Week 4: UI & Polish
- [ ] Collaboration UI components
- [ ] Share/invite system
- [ ] Comments interface
- [ ] Performance optimization

## Testing Strategy

1. **Multi-user scenarios**
   - Simultaneous editing
   - Conflict resolution
   - Network disconnection/reconnection

2. **Performance testing**
   - Large documents with many collaborators
   - Rapid command sequences
   - Bandwidth usage

3. **Security testing**
   - Access control enforcement
   - Data isolation between workspaces

## Deployment Considerations

### Self-Hosted
- Document WebSocket server requirements
- Provide docker-compose with Supabase
- Include scaling guidelines

### Cloud Version
- Managed WebSocket infrastructure
- Auto-scaling based on active sessions
- Enhanced performance monitoring

## Success Metrics
- < 100ms latency for cursor updates
- < 500ms for command propagation
- Support 10+ simultaneous editors
- Zero data loss on conflicts

## Dependencies
- Supabase Realtime
- No additional npm packages needed (use existing)

## Risks & Mitigations
1. **Conflict resolution complexity** → Start with last-write-wins, iterate
2. **Performance at scale** → Implement command batching
3. **Network reliability** → Offline queue with sync on reconnect

---

**Status**: 📋 Planned
**Estimated Duration**: 4 weeks
**Dependencies**: None (can build on existing foundation) 