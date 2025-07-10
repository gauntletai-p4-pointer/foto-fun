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
import { TextWarp, WarpStyle } from '@/lib/editor/text/effects/TextWarp'
import { ModifyCommand } from '@/lib/editor/commands/canvas/ModifyCommand'
import type { CanvasObject } from '@/lib/editor/canvas/types'

interface TextWarpSectionProps {
  object: CanvasObject | null
}

export function TextWarpSection({ object }: TextWarpSectionProps) {
  const [warpStyle, setWarpStyle] = useState<WarpStyle>(WarpStyle.Arc)
  const [bendAmount, setBendAmount] = useState(0)
  const [isWarped, setIsWarped] = useState(false)
  // TODO: Update for new canvas system
  const fabricCanvas = null // Temporary placeholder
  const executeCommand = (command: unknown) => {
    console.log('Command execution needs migration:', command)
  }
  
  // Type guard for text objects
  if (!object || (object.type !== 'text' && object.type !== 'verticalText')) {
    return null
  }
  
  const applyWarp = useCallback(() => {
    if (!object || !fabricCanvas) return
    
    const warp = new TextWarp(warpStyle, bendAmount)
    const warpedPath = warp.warpText(object as any) // TODO: Update for Konva
    
    if (warpedPath) {
      executeCommand(new ModifyCommand(fabricCanvas, object, {
        path: warpedPath,
        isWarped: true,
        warpStyle,
        bendAmount
      }))
      setIsWarped(true)
    }
  }, [object, fabricCanvas, warpStyle, bendAmount])
  
  const removeWarp = useCallback(() => {
    if (!object || !fabricCanvas) return
    
    executeCommand(new ModifyCommand(fabricCanvas, object, {
      path: null,
      isWarped: false,
      warpStyle: null,
      bendAmount: 0
    }))
    setIsWarped(false)
  }, [object, fabricCanvas])
  
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
            <SelectItem value={WarpStyle.Arch}>Arch</SelectItem>
            <SelectItem value={WarpStyle.Bulge}>Bulge</SelectItem>
            <SelectItem value={WarpStyle.Shell}>Shell</SelectItem>
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