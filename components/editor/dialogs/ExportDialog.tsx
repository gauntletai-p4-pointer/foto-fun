'use client'

import React, { useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { ExportManager } from '@/lib/editor/export/ExportManager'
import type { ExportFormat, ExportOptions } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Image as ImageIcon, FileImage, Maximize2 } from 'lucide-react'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const canvasManager = useService<CanvasManager>('CanvasManager')
  const typedEventBus = useService<ReturnType<typeof getTypedEventBus>>('TypedEventBus')
  
  // Create export manager instance only when canvasManager is available
  const [exportManager] = useState(() => 
    canvasManager ? new ExportManager(canvasManager, typedEventBus) : null
  )
  
  // Export settings
  const [exportType, setExportType] = useState<'document' | 'selection' | 'region'>('document')
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(90)
  const [width, setWidth] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  
  // Region settings
  const [regionX, setRegionX] = useState(0)
  const [regionY, setRegionY] = useState(0)
  const [regionWidth, setRegionWidth] = useState(100)
  const [regionHeight, setRegionHeight] = useState(100)
  
  // Get canvas dimensions with null check
  const canvasWidth = canvasManager?.state.canvasWidth || 800
  const canvasHeight = canvasManager?.state.canvasHeight || 600
  const aspectRatio = canvasWidth / canvasHeight
  
  // Get selected objects
  const selectedObjects = canvasManager?.getSelectedObjects() || []
  const hasSelection = selectedObjects.length > 0
  
  // Get presets
  const presets = exportManager?.getPresets() || []
  
  // Don't render if canvas manager is not available
  if (!canvasManager || !exportManager) {
    return null
  }
  
  const handleExport = async () => {
    try {
      let blob: Blob
      
      const options: ExportOptions = {
        format,
        quality: format === 'jpeg' || format === 'webp' ? quality / 100 : undefined,
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined
      }
      
      switch (exportType) {
        case 'document':
          blob = await exportManager.exportCanvas(options)
          break
          
        case 'selection':
          blob = await exportManager.exportSelection(options)
          break
          
        case 'region':
          blob = await exportManager.exportRegion(
            regionX,
            regionY,
            regionWidth,
            regionHeight,
            format
          )
          break
          
        default:
          throw new Error('Invalid export type')
      }
      
      // Download the blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Close dialog
      onOpenChange(false)
    } catch (error) {
      console.error('Export failed:', error)
      // TODO: Show error toast
    }
  }
  
  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      setFormat(preset.format)
      if (preset.quality) setQuality(preset.quality * 100)
      if (preset.width) setWidth(preset.width.toString())
      if (preset.height) setHeight(preset.height.toString())
    }
  }
  
  const handleWidthChange = (value: string) => {
    setWidth(value)
    if (maintainAspectRatio && value) {
      const newHeight = Math.round(parseInt(value) / aspectRatio)
      setHeight(newHeight.toString())
    }
  }
  
  const handleHeightChange = (value: string) => {
    setHeight(value)
    if (maintainAspectRatio && value) {
      const newWidth = Math.round(parseInt(value) * aspectRatio)
      setWidth(newWidth.toString())
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Image</DialogTitle>
          <DialogDescription>
            Choose export settings for your image
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={exportType} onValueChange={(v) => setExportType(v as typeof exportType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="document">
              <FileImage className="h-4 w-4 mr-2" />
              Document
            </TabsTrigger>
            <TabsTrigger value="selection" disabled={!hasSelection}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Selection
            </TabsTrigger>
            <TabsTrigger value="region">
              <Maximize2 className="h-4 w-4 mr-2" />
              Region
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="document" className="space-y-4">
            <div className="space-y-4">
              {/* Presets */}
              <div className="space-y-2">
                <Label>Presets</Label>
                <Select value={selectedPreset} onValueChange={handlePresetSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map(preset => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Format */}
              <div className="space-y-2">
                <Label>Format</Label>
                <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="png" id="png" />
                    <Label htmlFor="png">PNG (Lossless, supports transparency)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jpeg" id="jpeg" />
                    <Label htmlFor="jpeg">JPEG (Smaller file size)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="webp" id="webp" />
                    <Label htmlFor="webp">WebP (Modern format, best compression)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Quality */}
              {(format === 'jpeg' || format === 'webp') && (
                <div className="space-y-2">
                  <Label>Quality: {quality}%</Label>
                  <Slider
                    value={[quality]}
                    onValueChange={([v]) => setQuality(v)}
                    min={1}
                    max={100}
                    step={1}
                  />
                </div>
              )}
              
              {/* Dimensions */}
              <div className="space-y-2">
                <Label>Dimensions (leave empty for original size)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder={canvasWidth.toString()}
                    value={width}
                    onChange={(e) => handleWidthChange(e.target.value)}
                  />
                  <span>×</span>
                  <Input
                    type="number"
                    placeholder={canvasHeight.toString()}
                    value={height}
                    onChange={(e) => handleHeightChange(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="aspect-ratio"
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  />
                  <Label htmlFor="aspect-ratio">Maintain aspect ratio</Label>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="selection" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export only the selected objects.
            </p>
            <div className="space-y-2">
              <Label>Format</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="png" id="sel-png" />
                  <Label htmlFor="sel-png">PNG (Preserves transparency)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="jpeg" id="sel-jpeg" />
                  <Label htmlFor="sel-jpeg">JPEG</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="webp" id="sel-webp" />
                  <Label htmlFor="sel-webp">WebP</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>
          
          <TabsContent value="region" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export a specific region of your image.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>X Position</Label>
                <Input
                  type="number"
                  value={regionX}
                  onChange={(e) => setRegionX(parseInt(e.target.value) || 0)}
                  min={0}
                  max={canvasWidth}
                />
              </div>
              <div className="space-y-2">
                <Label>Y Position</Label>
                <Input
                  type="number"
                  value={regionY}
                  onChange={(e) => setRegionY(parseInt(e.target.value) || 0)}
                  min={0}
                  max={canvasHeight}
                />
              </div>
              <div className="space-y-2">
                <Label>Width</Label>
                <Input
                  type="number"
                  value={regionWidth}
                  onChange={(e) => setRegionWidth(parseInt(e.target.value) || 100)}
                  min={1}
                  max={canvasWidth - regionX}
                />
              </div>
              <div className="space-y-2">
                <Label>Height</Label>
                <Input
                  type="number"
                  value={regionHeight}
                  onChange={(e) => setRegionHeight(parseInt(e.target.value) || 100)}
                  min={1}
                  max={canvasHeight - regionY}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 