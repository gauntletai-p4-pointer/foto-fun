'use client'

import React, { useState, useEffect } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventBasedHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'
import type { Snapshot } from '@/lib/events/history/SnapshotManager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Camera, 
  Clock, 
  RotateCcw, 
  RotateCw, 
  Search,
  Trash2,
  MoreVertical,
  Save
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatDistanceToNow } from 'date-fns'

interface HistoryPanelProps {
  maxStates?: number
}

export function HistoryPanel({ }: HistoryPanelProps) {
  const historyStore = useService<EventBasedHistoryStore>('HistoryStore')
  const historyState = useStore(historyStore)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDescription, setSnapshotDescription] = useState('')
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  const events = historyStore.getHistory()
  const snapshotManager = historyStore.getSnapshotManager()

  // Load snapshots
  useEffect(() => {
    setSnapshots(snapshotManager.getSnapshots())
  }, [snapshotManager])

  // Filter events based on search
  const filteredEvents = events.filter(event => 
    event.getDescription().toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEventClick = async (eventId: string) => {
    await historyStore.navigateToEvent(eventId)
  }

  const handleUndo = async () => {
    await historyStore.undo()
  }

  const handleRedo = async () => {
    await historyStore.redo()
  }

  const handleCreateSnapshot = async () => {
    if (!snapshotName.trim()) return
    
    await snapshotManager.createSnapshot(snapshotName, snapshotDescription)
    setSnapshots(snapshotManager.getSnapshots())
    setShowSnapshotDialog(false)
    setSnapshotName('')
    setSnapshotDescription('')
  }

  const handleLoadSnapshot = async (snapshotId: string) => {
    await snapshotManager.loadSnapshot(snapshotId)
  }

  const handleDeleteSnapshot = async (snapshotId: string) => {
    await snapshotManager.deleteSnapshot(snapshotId)
    setSnapshots(snapshotManager.getSnapshots())
  }

  const formatEventTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">History</h3>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUndo}
            disabled={!historyState.canUndo}
            title="Undo (Cmd/Ctrl+Z)"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRedo}
            disabled={!historyState.canRedo}
            title="Redo (Cmd/Ctrl+Shift+Z)"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSnapshotDialog(true)}
            title="Create Snapshot"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Snapshots Section */}
          {snapshots.length > 0 && (
            <>
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Snapshots
              </div>
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="group flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                  onClick={() => handleLoadSnapshot(snapshot.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Camera className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{snapshot.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatEventTime(snapshot.timestamp)}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleLoadSnapshot(snapshot.id)}>
                        Load Snapshot
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              <div className="h-px bg-border my-2" />
            </>
          )}

          {/* Events Section */}
          <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
            Recent Actions ({filteredEvents.length})
          </div>
          {filteredEvents.map((event, index) => {
            const isActive = event.id === historyState.currentEventId
            const isFuture = index > filteredEvents.findIndex(e => e.id === historyState.currentEventId)
            
            return (
              <div
                key={event.id}
                className={`
                  flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                  ${isActive ? 'bg-accent' : 'hover:bg-accent/50'}
                  ${isFuture ? 'opacity-50' : ''}
                `}
                onClick={() => handleEventClick(event.id)}
              >
                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{event.getDescription()}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatEventTime(event.timestamp)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Snapshot Dialog */}
      <Dialog open={showSnapshotDialog} onOpenChange={setShowSnapshotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>
              Save the current state with a name for easy access later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="snapshot-name">Name</Label>
              <Input
                id="snapshot-name"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="e.g., Before color adjustment"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="snapshot-description">Description (optional)</Label>
              <Input
                id="snapshot-description"
                value={snapshotDescription}
                onChange={(e) => setSnapshotDescription(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSnapshotDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSnapshot} disabled={!snapshotName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Create Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 