'use client'

import { useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { EventDocumentStore } from '@/lib/store/document/EventDocumentStore'
import { DOCUMENT_PRESETS } from '@/constants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NewDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewDocumentDialog({ open, onOpenChange }: NewDocumentDialogProps) {
  const documentStore = useService<EventDocumentStore>('DocumentStore')
  
  const [preset, setPreset] = useState<keyof typeof DOCUMENT_PRESETS>('default')
  const [customWidth, setCustomWidth] = useState('800')
  const [customHeight, setCustomHeight] = useState('600')
  const [customResolution, setCustomResolution] = useState('72')
  const [documentName, setDocumentName] = useState('Untitled')
  
  const handleCreate = () => {
    if (preset === 'default') {
      documentStore.createNewDocument(preset, {
        name: documentName,
        width: parseInt(customWidth),
        height: parseInt(customHeight),
        resolution: parseInt(customResolution)
      })
    } else {
      documentStore.createNewDocument(preset, { name: documentName })
    }
    
    onOpenChange(false)
    // Reset form
    setDocumentName('Untitled')
    setPreset('default')
  }
  
  const selectedPreset = DOCUMENT_PRESETS[preset]
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>New Document</DialogTitle>
          <DialogDescription>
            Create a new document with preset dimensions or custom size.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="preset" className="text-right">
              Preset
            </Label>
            <Select value={preset} onValueChange={(value) => setPreset(value as keyof typeof DOCUMENT_PRESETS)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (800 × 600)</SelectItem>
                <SelectItem value="photo">Photo (3000 × 2000)</SelectItem>
                <SelectItem value="print">Print - US Letter (2550 × 3300)</SelectItem>
                <SelectItem value="web">Web - Full HD (1920 × 1080)</SelectItem>
                <SelectItem value="mobile">Mobile (375 × 812)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {preset === 'default' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="width" className="text-right">
                  Width
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="width"
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    min="1"
                    max="8192"
                  />
                  <span className="flex items-center text-sm text-foreground/60">px</span>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="height" className="text-right">
                  Height
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="height"
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    min="1"
                    max="8192"
                  />
                  <span className="flex items-center text-sm text-foreground/60">px</span>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="resolution" className="text-right">
                  Resolution
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="resolution"
                    type="number"
                    value={customResolution}
                    onChange={(e) => setCustomResolution(e.target.value)}
                    min="72"
                    max="600"
                  />
                  <span className="flex items-center text-sm text-foreground/60">DPI</span>
                </div>
              </div>
            </>
          )}
          
          {preset !== 'default' && (
            <div className="text-sm text-foreground/60 ml-[116px]">
              {selectedPreset.width} × {selectedPreset.height} px at {selectedPreset.resolution} DPI
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 