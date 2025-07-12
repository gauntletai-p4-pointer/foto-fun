'use client'

import React, { useState } from 'react'
import { useService, useAsyncService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { ObjectManager } from '@/lib/editor/canvas/services/ObjectManager'
import { useEventHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'
import { useFileHandler } from '@/hooks/useFileHandler'

import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth/actions'
import { ExportDialog } from '@/components/editor/dialogs/ExportDialog'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { FileDown, FileImage, Sun, Moon, LogOut, Undo, Redo, Copy, Scissors, Clipboard, Settings } from 'lucide-react'
import { SettingsDialog } from './SettingsDialog'
import { TOOL_IDS } from '@/constants'

export function MenuBar() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { fileInputRef, handleFileSelect, triggerFileInput } = useFileHandler()
  
  const selectionStore = useService<EventSelectionStore>('SelectionStore')
  const selectionState = useStore(selectionStore)
  const hasSelection = selectionState.selectedObjectIds.size > 0
  const hasMultipleSelection = selectionState.selectedObjectIds.size > 1
  
  const objectManager = useService<ObjectManager>('ObjectManager')
  const [hasObjects, setHasObjects] = useState(false)
  
  // Check for objects periodically
  React.useEffect(() => {
    const checkObjects = () => {
      const objects = objectManager.getAllObjects()
      setHasObjects(objects.length > 0)
    }
    
    checkObjects()
    const interval = setInterval(checkObjects, 500) // Check every 500ms
    
    return () => clearInterval(interval)
  }, [objectManager])
  
  const { service: toolStore } = useAsyncService<EventToolStore>('ToolStore')
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { undo, redo, canUndo, canRedo } = useEventHistoryStore()
  
  // Check if we have a pixel selection
  const hasPixelSelection = canvasManager?.getSelectionManager()?.hasSelection() || false
  
  const handleSignOut = async () => {
    await signOut()
  }
  
  const handleUndo = () => {
    undo()
  }
  
  const handleRedo = () => {
    redo()
  }
  
  const handleCopy = () => {
    // TODO: Implement copy functionality with new architecture
    console.log('Copy functionality needs implementation with new architecture')
  }
  
  const handleCut = () => {
    // TODO: Implement cut functionality with new architecture
    console.log('Cut functionality needs implementation with new architecture')
  }
  
  const handlePaste = () => {
    // TODO: Implement paste functionality with new architecture
    console.log('Paste functionality needs implementation with new architecture')
  }
  
  const handleSelectAll = () => {
    canvasManager?.selectAll()
  }
  
  const handleDeselect = () => {
    canvasManager?.deselectAll()
  }
  
  const handleExpandSelection = (pixels: number = 5) => {
    if (!canvasManager) return
    const selectionManager = canvasManager.getSelectionManager()
    const operations = selectionManager.getOperations()
    const currentSelection = selectionManager.getSelection()
    if (currentSelection) {
      const expanded = operations.expand(currentSelection, pixels)
      selectionManager.applySelection(expanded.mask, 'replace')
    }
  }
  
  const handleContractSelection = (pixels: number = 5) => {
    if (!canvasManager) return
    const selectionManager = canvasManager.getSelectionManager()
    const operations = selectionManager.getOperations()
    const currentSelection = selectionManager.getSelection()
    if (currentSelection) {
      const contracted = operations.contract(currentSelection, pixels)
      selectionManager.applySelection(contracted.mask, 'replace')
    }
  }
  
  const handleFeatherSelection = (pixels: number) => {
    if (!canvasManager) return
    const selectionManager = canvasManager.getSelectionManager()
    const operations = selectionManager.getOperations()
    const currentSelection = selectionManager.getSelection()
    if (currentSelection) {
      const feathered = operations.feather(currentSelection, pixels)
      selectionManager.applySelection(feathered.mask, 'replace')
    }
  }
  
  const activateFilterTool = (toolId: string) => {
    if (toolStore) {
      toolStore.activateTool(toolId)
    }
  }
  
  // Object menu handlers
  const handleGroup = async () => {
    const selectedIds = Array.from(selectionState.selectedObjectIds)
    if (selectedIds.length > 1) {
      const groupId = await objectManager.createGroup(selectedIds)
      selectionStore.selectObjects([groupId])
    }
  }
  
  const handleUngroup = async () => {
    const selectedIds = Array.from(selectionState.selectedObjectIds)
    for (const id of selectedIds) {
      const object = objectManager.getObject(id)
      if (object && object.type === 'group') {
        const childIds = await objectManager.ungroup(id)
        selectionStore.selectObjects(childIds)
      }
    }
  }
  
  const handleBringForward = async () => {
    const selectedIds = Array.from(selectionState.selectedObjectIds)
    for (const id of selectedIds) {
      await objectManager.bringForward(id)
    }
  }
  
  const handleSendBackward = async () => {
    const selectedIds = Array.from(selectionState.selectedObjectIds)
    for (const id of selectedIds) {
      await objectManager.sendBackward(id)
    }
  }
  
  const handleBringToFront = async () => {
    const selectedIds = Array.from(selectionState.selectedObjectIds)
    for (const id of selectedIds) {
      await objectManager.bringToFront(id)
    }
  }
  
  const handleSendToBack = async () => {
    const selectedIds = Array.from(selectionState.selectedObjectIds)
    for (const id of selectedIds) {
      await objectManager.sendToBack(id)
    }
  }
  
  return (
    <>
      <div className="h-8 bg-background border-b border-foreground/10 flex items-center px-2 text-sm text-foreground">
        <div className="flex gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground/80 outline-none">
              File
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem 
                onClick={triggerFileInput}
              >
                <FileImage className="mr-2 h-4 w-4" />
                Open Image...
                <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setExportDialogOpen(true)}
                disabled={!hasObjects}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export...
                <DropdownMenuShortcut>⌘⇧E</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </DropdownMenuItem>
              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground/80 outline-none">
              Edit
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem 
                onClick={handleUndo}
                disabled={!canUndo}
              >
                <Undo className="mr-2 h-4 w-4" />
                Undo
                <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleRedo}
                disabled={!canRedo}
              >
                <Redo className="mr-2 h-4 w-4" />
                Redo
                <DropdownMenuShortcut>⌘⇧Z</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleCut}
                disabled={!hasSelection}
              >
                <Scissors className="mr-2 h-4 w-4" />
                Cut
                <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleCopy}
                disabled={!hasSelection}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
                <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handlePaste}
                disabled={true} // TODO: Re-enable after clipboard migration
              >
                <Clipboard className="mr-2 h-4 w-4" />
                Paste
                <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Delete
                <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSelectAll}
              >
                Select All
                <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDeselect}
                disabled={!hasSelection && !hasPixelSelection}
              >
                Deselect
                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <button className="hover:text-foreground/80" disabled>Image</button>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground/80 outline-none">
              Object
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem 
                onClick={handleGroup}
                disabled={!hasMultipleSelection}
              >
                Group
                <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleUngroup}
                disabled={!hasSelection}
              >
                Ungroup
                <DropdownMenuShortcut>⌘⇧G</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleBringForward}
                disabled={!hasSelection}
              >
                Bring Forward
                <DropdownMenuShortcut>⌘]</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSendBackward}
                disabled={!hasSelection}
              >
                Send Backward
                <DropdownMenuShortcut>⌘[</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleBringToFront}
                disabled={!hasSelection}
              >
                Bring to Front
                <DropdownMenuShortcut>⌘⇧]</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSendToBack}
                disabled={!hasSelection}
              >
                Send to Back
                <DropdownMenuShortcut>⌘⇧[</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground/80 outline-none">
              Select
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem 
                onClick={handleSelectAll}
              >
                All
                <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDeselect}
                disabled={!hasSelection}
              >
                Deselect
                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                disabled={true} // TODO: Implement invert selection
              >
                Inverse
                <DropdownMenuShortcut>⌘⇧I</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Modify Selection</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleExpandSelection()}>
                    Expand...
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleContractSelection()}>
                    Contract...
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFeatherSelection(2)}>
                    Feather...
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                Color Range...
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Focus Area...
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Subject
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Sky
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* New Filter menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground/80 outline-none">
              Filter
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Adjustments</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => activateFilterTool(TOOL_IDS.BRIGHTNESS)}
                >
                  Brightness/Contrast...
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => activateFilterTool(TOOL_IDS.HUE)}
                >
                  Hue/Saturation...
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => activateFilterTool(TOOL_IDS.EXPOSURE)}
                >
                  Exposure
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuLabel>Blur & Sharpen</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => activateFilterTool(TOOL_IDS.BLUR)}
                >
                  Blur...
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => activateFilterTool(TOOL_IDS.SHARPEN)}
                >
                  Sharpen...
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuLabel>Artistic</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => activateFilterTool(TOOL_IDS.VINTAGE_EFFECTS)}
                >
                  Vintage Effects...
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuLabel>Other</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => activateFilterTool(TOOL_IDS.GRAYSCALE)}
                >
                  Grayscale
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => activateFilterTool(TOOL_IDS.INVERT)}
                >
                  Invert
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground/80 outline-none">
              View
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark Mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                Zoom In
                <DropdownMenuShortcut>⌘+</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Zoom Out
                <DropdownMenuShortcut>⌘-</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Fit to Screen
                <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Actual Size
                <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Title in center */}
        <div className="flex-1 text-center">
          <span className="text-foreground/60">
            Foto Fun
          </span>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
    </>
  )
} 