'use client'

import { useState, useEffect } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { useToolStore } from '@/store/toolStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { ImageUpscalingAdapter } from '@/lib/ai/adapters/tools/imageUpscaling'
import { TOOL_IDS } from '@/constants'

const TRANSFORMATION_TYPES = [
  { value: 'upscale', label: 'Upscale image' },
]

export function ImageTransformationDialog() {
  const activeAITool = useCanvasStore((state) => state.activeAITool)
  const setActiveAITool = useCanvasStore((state) => state.setActiveAITool)
  const fabricCanvas = useCanvasStore((state) => state.fabricCanvas)
  const setActiveTool = useToolStore((state) => state.setActiveTool)
  
  const [transformationType, setTransformationType] = useState('upscale')
  const [isTransforming, setIsTransforming] = useState(false)
  
  const isOpen = activeAITool?.type === 'ai-image-transformation'
  
  useEffect(() => {
    // Reset form when dialog opens
    if (isOpen) {
      setTransformationType('upscale')
    }
  }, [isOpen])
  
  const handleClose = () => {
    if (!isTransforming) {
      setActiveAITool(null)
      // Switch back to move tool so the AI tool can be re-activated
      setActiveTool(TOOL_IDS.MOVE)
    }
  }
  
  const handleTransform = async () => {
    if (!fabricCanvas) {
      console.error('Canvas not ready')
      alert('Canvas not ready')
      return
    }
    
    setIsTransforming(true)
    
    try {
      if (transformationType === 'upscale') {
        // Create upscaling adapter instance
        const adapter = new ImageUpscalingAdapter()
        
        // Execute upscaling
        const result = await adapter.execute(
          {}, // No parameters needed for upscaling
          { canvas: fabricCanvas }
        )
        
        if (result.success) {
          console.log('Image upscaled successfully')
          
          // Close dialog after successful transformation
          setActiveAITool(null)
          // Switch back to move tool so the AI tool can be re-activated
          setActiveTool(TOOL_IDS.MOVE)
        } else {
          console.error('Upscaling Failed:', result.message || 'Failed to upscale image')
          alert(result.message || 'Failed to upscale image')
        }
      }
    } catch (error) {
      console.error('Image transformation error:', error)
      alert(error instanceof Error ? error.message : 'Failed to transform image')
    } finally {
      setIsTransforming(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI Image Transformation</DialogTitle>
          <DialogDescription>
            Transform images using AI-powered tools
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transformation-type">Transformation Type</Label>
            <Select value={transformationType} onValueChange={setTransformationType} disabled={isTransforming}>
              <SelectTrigger id="transformation-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSFORMATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isTransforming}>
            Cancel
          </Button>
          <Button onClick={handleTransform} disabled={isTransforming}>
            {isTransforming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transforming...
              </>
            ) : (
              'Transform'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 