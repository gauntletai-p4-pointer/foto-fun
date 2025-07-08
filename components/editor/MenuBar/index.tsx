'use client'

import { useState } from 'react'
import { useDocumentStore } from '@/store/documentStore'
import { useFileHandler } from '@/hooks/useFileHandler'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth/actions'
import { NewDocumentDialog } from '@/components/dialogs/NewDocumentDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu'
import { FileDown, FileImage, FilePlus, Save, Sun, Moon, LogOut } from 'lucide-react'

export function MenuBar() {
  const [newDocumentOpen, setNewDocumentOpen] = useState(false)
  const { fileInputRef, handleFileSelect, triggerFileInput } = useFileHandler()
  const { saveDocument, currentDocument, hasUnsavedChanges } = useDocumentStore()
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  
  const handleSave = () => {
    if (currentDocument) {
      saveDocument()
    }
  }
  
  const handleSignOut = async () => {
    await signOut()
  }
  
  return (
    <>
      <div className="h-8 bg-background border-b border-border flex items-center px-2 text-sm text-foreground">
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
              <DropdownMenuItem onClick={triggerFileInput}>
                <FileImage className="mr-2 h-4 w-4" />
                Open...
                <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
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
          
          <button className="hover:text-foreground/80" disabled>Edit</button>
          <button className="hover:text-foreground/80" disabled>Image</button>
          <button className="hover:text-foreground/80" disabled>Layer</button>
          <button className="hover:text-foreground/80" disabled>Select</button>
          <button className="hover:text-foreground/80" disabled>Filter</button>
          
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
            <span className="text-muted-foreground">
              {currentDocument.name}
              {hasUnsavedChanges && ' •'}
            </span>
          )}
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
      
      {/* New Document Dialog */}
      <NewDocumentDialog 
        open={newDocumentOpen}
        onOpenChange={setNewDocumentOpen}
      />
    </>
  )
} 