'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WarpStyle } from '@/lib/editor/text/effects/TextWarp'
import { useService } from '@/lib/core/AppInitializer'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'

interface TextWarpSectionProps {
  object: CanvasObject | null
}

export function TextWarpSection({ object }: TextWarpSectionProps) {
  const [warpStyle, setWarpStyle] = useState<WarpStyle>(WarpStyle.Arc)
  const [bendAmount, setBendAmount] = useState(0)
  const [isWarped, setIsWarped] = useState(false)
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  const applyWarp = useCallback(() => {
    if (!object || !canvasManager) return
    
    // TODO: Update TextWarp to work with Konva text objects
    // For now, just update the object metadata
    console.log('Applying warp:', { warpStyle, bendAmount })
    // Only update if this is a text object
    if (object.type === 'text' && typeof object.data === 'object' && 'content' in object.data) {
      canvasManager.updateObject(object.id, {
        data: {
          ...object.data,
          isWarped: true,
          warpStyle,
          bendAmount
        }
      })
    }
    setIsWarped(true)
  }, [object, canvasManager, warpStyle, bendAmount])
  
  const removeWarp = useCallback(() => {
    if (!object || !canvasManager) return
    
    console.log('Removing warp')
    // Only update if this is a text object
    if (object.type === 'text' && typeof object.data === 'object' && 'content' in object.data) {
      canvasManager.updateObject(object.id, {
        data: {
          ...object.data,
          isWarped: false,
          warpStyle: null,
          bendAmount: 0
        }
      })
    }
    setIsWarped(false)
  }, [object, canvasManager])
  
  // Type guard for text objects
  if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
    return null
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Warp Style</Label>
        <Select value={warpStyle} onValueChange={(value) => setWarpStyle(value as WarpStyle)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={WarpStyle.Arc}>Arc</SelectItem>
            <SelectItem value={WarpStyle.ArcLower}>Arc Lower</SelectItem>
            <SelectItem value={WarpStyle.ArcUpper}>Arc Upper</SelectItem>
            <SelectItem value={WarpStyle.Bulge}>Bulge</SelectItem>
            <SelectItem value={WarpStyle.Flag}>Flag</SelectItem>
            <SelectItem value={WarpStyle.Wave}>Wave</SelectItem>
            <SelectItem value={WarpStyle.Fish}>Fish</SelectItem>
            <SelectItem value={WarpStyle.Rise}>Rise</SelectItem>
            <SelectItem value={WarpStyle.FishEye}>Fish Eye</SelectItem>
            <SelectItem value={WarpStyle.Inflate}>Inflate</SelectItem>
            <SelectItem value={WarpStyle.Squeeze}>Squeeze</SelectItem>
            <SelectItem value={WarpStyle.Twist}>Twist</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Bend Amount: {bendAmount}%</Label>
        <Slider
          value={[bendAmount]}
          onValueChange={(value) => setBendAmount(value[0])}
          min={-100}
          max={100}
          step={1}
        />
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={applyWarp}
          disabled={isWarped}
          className="flex-1"
        >
          Apply Warp
        </Button>
        <Button 
          onClick={removeWarp}
          disabled={!isWarped}
          variant="outline"
          className="flex-1"
        >
          Remove Warp
        </Button>
      </div>
    </div>
  )
}