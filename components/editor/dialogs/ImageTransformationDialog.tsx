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
import { BackgroundRemovalAdapter } from '@/lib/ai/adapters/tools/backgroundRemoval'
import { TOOL_IDS } from '@/constants'
import { Input } from '@/components/ui/input'
import { InpaintingAdapter } from '@/lib/ai/adapters/tools/inpainting'
import { Slider } from '@/components/ui/slider'

const TRANSFORMATION_TYPES = [
  { value: 'upscale', label: 'Upscale image' },
  { value: 'remove-background', label: 'Remove background' },
  { value: 'inpaint', label: 'AI Inpainting' },
]

export function ImageTransformationDialog() {
  const activeAITool = useCanvasStore((state) => state.activeAITool)
  const setActiveAITool = useCanvasStore((state) => state.setActiveAITool)
  const fabricCanvas = useCanvasStore((state) => state.fabricCanvas)
  const setActiveTool = useToolStore((state) => state.setActiveTool)
  
  const [transformationType, setTransformationType] = useState('upscale')
  const [isTransforming, setIsTransforming] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [guaidanceScale, setGuaidanceScale] = useState(7.5)
  const [steps, setSteps] = useState(20)
  const [negativePrompt, setNegativePrompt] = useState('')
  
  const isOpen = activeAITool?.type === 'ai-image-transformation'
  
  useEffect(() => {
    // Reset form when dialog opens
    if (isOpen) {
      setTransformationType('upscale')
      setPrompt('')
      setGuaidanceScale(7.5)
      setSteps(20)
      setNegativePrompt('')
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
      } else if (transformationType === 'remove-background') {
        // Create background removal adapter instance
        const adapter = new BackgroundRemovalAdapter()
        
        // Execute background removal
        const result = await adapter.execute(
          {}, // No parameters needed for background removal
          { canvas: fabricCanvas }
        )
        
        if (result.success) {
          console.log('Background removed successfully')
          
          // Close dialog after successful transformation
          setActiveAITool(null)
          // Switch back to move tool so the AI tool can be re-activated
          setActiveTool(TOOL_IDS.MOVE)
        } else {
          console.error('Background removal Failed:', result.message || 'Failed to remove background')
          alert(result.message || 'Failed to remove background')
        }
      } else if (transformationType === 'inpaint') {
        if (!prompt.trim()) {
          alert('Please enter a prompt for inpainting.');
          return;
        }
        const adapter = new InpaintingAdapter();
        const result = await adapter.execute({ prompt, guaidance_scale: guaidanceScale, steps, negative_prompt: negativePrompt }, { canvas: fabricCanvas });
        if (result.success) {
          console.log('Inpainting successful');
          setActiveAITool(null);
          setActiveTool(TOOL_IDS.MOVE);
        } else {
          console.error('Inpainting Failed:', result.message);
          alert(result.message || 'Failed to perform inpainting');
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
          {transformationType === 'inpaint' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Input
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what to generate"
                />
              </div>
              <div className="space-y-2">
                <Label>Guidance Scale ({guaidanceScale})</Label>
                <Slider min={0} max={20} step={0.5} value={[guaidanceScale]} onValueChange={([v])=>setGuaidanceScale(v)} />
              </div>
              <div className="space-y-2">
                <Label>Steps ({steps})</Label>
                <Slider min={1} max={50} step={1} value={[steps]} onValueChange={([v])=>setSteps(v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
                <Input id="negative-prompt" value={negativePrompt} onChange={(e)=>setNegativePrompt(e.target.value)} placeholder="What to avoid (e.g., blurry, distorted)" />
              </div>
            </div>
          )}
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