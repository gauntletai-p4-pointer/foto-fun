'use client'

import React, { useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventDocumentStore } from '@/lib/store/document/EventDocumentStore'
import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { useEventHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'
import { useFileHandler } from '@/hooks/useFileHandler'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth/actions'
import { NewDocumentDialog } from '@/components/dialogs/NewDocumentDialog'
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
import { FileDown, FileImage, FilePlus, Save, Sun, Moon, LogOut, Undo, Redo, Copy, Scissors, Clipboard, Settings } from 'lucide-react'
import { SettingsDialog } from './SettingsDialog'
import { TOOL_IDS } from '@/constants'

export function MenuBar() {
  const [newDocumentOpen, setNewDocumentOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { fileInputRef: openFileInputRef, handleFileSelect: handleOpenFileSelect, triggerFileInput: triggerOpenFileInput } = useFileHandler('open')
  const { fileInputRef: insertFileInputRef, handleFileSelect: handleInsertFileSelect, triggerFileInput: triggerInsertFileInput } = useFileHandler('insert')
  const documentStore = useService<EventDocumentStore>('DocumentStore')
  const documentState = useStore(documentStore)
  const currentDocument = documentState.currentDocument
  const hasUnsavedChanges = documentState.hasUnsavedChanges
  
  const selectionStore = useService<EventSelectionStore>('SelectionStore')
  const selectionState = useStore(selectionStore)
  const hasSelection = selectionState.selectedObjectIds.size > 0
  
  const toolStore = useService<EventToolStore>('ToolStore')
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { undo, redo, canUndo, canRedo } = useEventHistoryStore()
  
  // Check if we have a pixel selection
  const hasPixelSelection = canvasManager?.getSelectionManager()?.hasSelection() || false
  
  const handleSave = () => {
    if (currentDocument) {
      documentStore.saveDocument()
    }
  }
  
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
    if (!canvasManager) return
    const selectionManager = canvasManager.getSelectionManager()
    selectionManager.selectAll()
  }
  
  const handleDeselect = () => {
    if (!canvasManager) return
    const selectionManager = canvasManager.getSelectionManager()
    selectionManager.clear()
  }
  
  const handleInvertSelection = () => {
    if (!canvasManager) return
    const selectionManager = canvasManager.getSelectionManager()
    selectionManager.invert()
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
    toolStore.activateTool(toolId)
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
              <DropdownMenuItem onClick={() => setNewDocumentOpen(true)}>
                <FilePlus className="mr-2 h-4 w-4" />
                New
                <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={triggerOpenFileInput}>
                <FileImage className="mr-2 h-4 w-4" />
                Open...
                <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={triggerInsertFileInput}>
                <FileImage className="mr-2 h-4 w-4" />
                Insert Image...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSave}
                disabled={!currentDocument}
              >
                <Save className="mr-2 h-4 w-4" />
                Save
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <FileDown className="mr-2 h-4 w-4" />
                Export As...
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
                disabled={false} // Selection through event system
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
          <button className="hover:text-foreground/80" disabled>Layer</button>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground/80 outline-none">
              Select
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem 
                onClick={handleSelectAll}
                disabled={false} // Selection through event system
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
                onClick={handleInvertSelection}
                disabled={false}
              >
                Inverse
                <DropdownMenuShortcut>⌘⇧I</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!hasPixelSelection}>
                  Modify
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuItem onClick={() => handleExpandSelection(1)}>
                    Expand... (1px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExpandSelection(3)}>
                    Expand... (3px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExpandSelection(5)}>
                    Expand... (5px)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleContractSelection(1)}>
                    Contract... (1px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleContractSelection(3)}>
                    Contract... (3px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleContractSelection(5)}>
                    Contract... (5px)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleFeatherSelection(1)}>
                    Feather... (1px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFeatherSelection(2)}>
                    Feather... (2px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFeatherSelection(5)}>
                    Feather... (5px)
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
                <DropdownMenuItem onClick={() => activateFilterTool(TOOL_IDS.BRIGHTNESS)}>
                  Brightness/Contrast...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => activateFilterTool(TOOL_IDS.HUE)}>
                  Hue/Saturation...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => activateFilterTool(TOOL_IDS.EXPOSURE)}>
                  Exposure
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuLabel>Blur & Sharpen</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => activateFilterTool(TOOL_IDS.BLUR)}>
                  Blur...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => activateFilterTool(TOOL_IDS.SHARPEN)}>
                  Sharpen...
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuLabel>Artistic</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => activateFilterTool(TOOL_IDS.VINTAGE_EFFECTS)}>
                  Vintage Effects...
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuLabel>Other</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => activateFilterTool(TOOL_IDS.GRAYSCALE)}>
                  Grayscale
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => activateFilterTool(TOOL_IDS.INVERT)}>
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
        
        {/* Document title in center */}
        <div className="flex-1 text-center">
          {currentDocument && (
            <span className="text-foreground/60">
              {currentDocument.name}
              {hasUnsavedChanges && ' •'}
            </span>
          )}
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={openFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleOpenFileSelect}
        className="hidden"
      />
      <input
        ref={insertFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInsertFileSelect}
        className="hidden"
      />
      
      {/* New Document Dialog */}
      <NewDocumentDialog 
        open={newDocumentOpen}
        onOpenChange={setNewDocumentOpen}
      />
      
      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  )
} 