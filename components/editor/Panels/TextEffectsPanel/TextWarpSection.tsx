'use client'

import { useState, useCallback } from 'react'
import { IText, Textbox } from 'fabric'
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

interface TextWarpSectionProps {
  object: IText | Textbox | null
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
  
  const warpStyles = TextWarp.getWarpStyles()
  
  const applyWarp = useCallback(() => {
    if (!object || !fabricCanvas) return
    
    // Apply warp effect
    const warpedPath = TextWarp.applyWarp(object, {
      style: warpStyle,
      bend: bendAmount,
    })
    
    if (warpedPath) {
      // Store original text properties
      const originalProps = {
        text: object.text,
        fontFamily: object.fontFamily,
        fontSize: object.fontSize,
        fill: object.fill,
      }
      
      // Add warped path to canvas
      fabricCanvas.add(warpedPath)
      fabricCanvas.remove(object)
      fabricCanvas.setActiveObject(warpedPath)
      fabricCanvas.renderAll()
      
      // Store warp info on the path object
      warpedPath.set('data', {
        ...warpedPath.get('data'),
        isWarpedText: true,
        originalText: originalProps,
        warpStyle,
        bendAmount,
      })
      
      setIsWarped(true)
      
      // Create command for undo/redo
      const command = new ModifyCommand(
        fabricCanvas,
        object,
        { visible: false },
        'Apply text warp'
      )
      executeCommand(command)
    }
  }, [object, fabricCanvas, warpStyle, bendAmount, executeCommand])
  
  const removeWarp = useCallback(() => {
    if (!object || !fabricCanvas) return
    
    // Check if this is a warped text path
    const data = object.get('data')
    if (data?.isWarpedText && data.originalText) {
      // Recreate original text
      const newText = new IText(data.originalText.text || '', {
        left: object.left,
        top: object.top,
        fontFamily: data.originalText.fontFamily,
        fontSize: data.originalText.fontSize,
        fill: data.originalText.fill,
      })
      
      // Replace warped path with text
      fabricCanvas.add(newText)
      fabricCanvas.remove(object)
      fabricCanvas.setActiveObject(newText)
      fabricCanvas.renderAll()
      
      setIsWarped(false)
    }
  }, [object, fabricCanvas])
  
  if (!object) return null
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-foreground">Text Warp</h4>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="warp-style" className="text-xs">Style</Label>
          <Select 
            value={warpStyle} 
            onValueChange={(value) => setWarpStyle(value as WarpStyle)}
            disabled={isWarped}
          >
            <SelectTrigger id="warp-style" className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {warpStyles.map(({ style, name, description }) => (
                <SelectItem key={style} value={style}>
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="bend-amount" className="text-xs">Bend</Label>
            <span className="text-xs text-muted-foreground">{bendAmount}%</span>
          </div>
          <Slider
            id="bend-amount"
            min={-100}
            max={100}
            step={1}
            value={[bendAmount]}
            onValueChange={([value]) => setBendAmount(value)}
            disabled={isWarped}
            className="w-full"
          />
        </div>
        
        <div className="flex gap-2">
          {!isWarped ? (
            <Button
              size="sm"
              onClick={applyWarp}
              disabled={bendAmount === 0}
              className="flex-1"
            >
              Apply Warp
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={removeWarp}
              className="flex-1"
            >
              Remove Warp
            </Button>
          )}
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Note: Text warping is a simplified demo. Full implementation would convert text to actual paths.
      </p>
    </div>
  )
} 