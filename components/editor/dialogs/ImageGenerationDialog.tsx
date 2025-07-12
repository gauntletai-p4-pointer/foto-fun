'use client'

import { useState, useEffect } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
// Toast notifications - TODO: implement proper toast system

const COMMON_DIMENSIONS = [
  { label: 'Square (512x512)', width: 512, height: 512 },
  { label: 'Square (768x768)', width: 768, height: 768 },
  { label: 'Square (1024x1024)', width: 1024, height: 1024 },
  { label: 'Portrait (512x768)', width: 512, height: 768 },
  { label: 'Portrait (768x1024)', width: 768, height: 1024 },
  { label: 'Landscape (768x512)', width: 768, height: 512 },
  { label: 'Landscape (1024x768)', width: 1024, height: 768 },
]

export function ImageGenerationDialog() {
  const toolStore = useService<EventToolStore>('ToolStore')
  const activeTool = toolStore.getActiveTool()
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [dimension, setDimension] = useState('1024x1024')
  const [steps, setSteps] = useState(50)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const isOpen = activeTool?.toolId === 'ai-image-generation'
  
  useEffect(() => {
    // Reset form when dialog opens
    if (isOpen) {
      setPrompt('')
      setNegativePrompt('')
      setDimension('1024x1024')
      setSteps(50)
    }
  }, [isOpen])
  
  const handleClose = () => {
    if (!isGenerating) {
      toolStore.deactivateTool()
    }
  }
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      console.error('Please enter a prompt')
      alert('Please enter a prompt')
      return
    }
    
    if (!canvasManager || !canvasManager.stage) {
      console.error('Canvas not ready')
      alert('Canvas not ready. Please wait for the canvas to load.')
      return
    }
    
    setIsGenerating(true)
    
    try {
      // Parse dimensions
      const [_width, _height] = dimension.split('x').map(Number)
      
      // Create adapter instance (temporarily disabled for foundation cleanup)
      // const adapter = new ImageGenerationAdapter()
      console.log('Image generation temporarily disabled for foundation cleanup')
      alert('Image generation temporarily disabled for foundation cleanup')
      return
    } catch (error) {
      console.error('Image generation error:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI Image Generation</DialogTitle>
          <DialogDescription>
            Generate images from text descriptions using Stable Diffusion XL
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="A serene mountain landscape at sunset..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="negative-prompt">Negative Prompt (optional)</Label>
            <Input
              id="negative-prompt"
              placeholder="blurry, low quality, distorted..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dimension">Dimensions</Label>
            <Select value={dimension} onValueChange={setDimension} disabled={isGenerating}>
              <SelectTrigger id="dimension">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_DIMENSIONS.map((dim) => (
                  <SelectItem key={dim.label} value={`${dim.width}x${dim.height}`}>
                    {dim.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="steps">Quality Steps: {steps}</Label>
            <input
              id="steps"
              type="range"
              min="1"
              max="100"
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              More steps = higher quality but slower generation
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 