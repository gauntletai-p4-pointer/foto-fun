'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FloatingPanel, FloatingPanelContent, FloatingPanelFooter } from '@/components/ui/floating-panel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RotateCcw } from 'lucide-react'
import { useCanvasStore } from '@/store/canvasStore'
import { useToolStore } from '@/store/toolStore'
import { TOOL_IDS } from '@/constants'

interface AdjustmentConfig {
  id: string
  label: string
  min: number
  max: number
  step: number
  unit?: string
  defaultValue: number
}

interface AdjustmentDialogProps {
  toolId: string
  toolName: string
  adjustmentConfig: AdjustmentConfig
  onApply: (value: number) => Promise<void>
  onPreview: (value: number) => void
  onReset: () => void
}

export function AdjustmentDialog({
  toolId,
  toolName,
  adjustmentConfig,
  onApply,
  onPreview,
  onReset
}: AdjustmentDialogProps) {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  const setActiveAdjustmentTool = useCanvasStore((state) => state.setActiveAdjustmentTool)
  const setActiveTool = useToolStore((state) => state.setActiveTool)
  
  const [value, setValue] = useState(adjustmentConfig.defaultValue)
  const [isApplying, setIsApplying] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  const isOpen = activeAdjustmentTool?.toolId === toolId
  
  // Calculate initial position based on anchor element
  const initialPosition = useMemo(() => {
    if (!activeAdjustmentTool?.anchorElement) return undefined
    
    const anchor = activeAdjustmentTool.anchorElement
    const rect = anchor.getBoundingClientRect()
    
    // Position to the right of the toolbar with some padding
    // and vertically aligned with the tool button
    return {
      x: rect.right + 20, // 20px padding from the toolbar
      y: rect.top
    }
  }, [activeAdjustmentTool?.anchorElement])
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      setValue(adjustmentConfig.defaultValue)
      setHasInitialized(true)
      
      // Apply initial preview after a short delay to ensure dialog is rendered
      setTimeout(() => {
        onPreview(adjustmentConfig.defaultValue)
      }, 0)
    } else if (!isOpen && hasInitialized) {
      setHasInitialized(false)
    }
  }, [isOpen, hasInitialized, adjustmentConfig.defaultValue, onPreview])
  
  // Memoize callbacks to prevent unnecessary re-renders
  const memoizedOnPreview = useCallback(onPreview, [])
  const memoizedOnReset = useCallback(onReset, [])
  
  // Update preview as value changes
  const handleValueChange = useCallback((newValue: number[]) => {
    const val = newValue[0]
    setValue(val)
    memoizedOnPreview(val)
  }, [memoizedOnPreview])
  
  // Handle input field changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (!isNaN(val) && val >= adjustmentConfig.min && val <= adjustmentConfig.max) {
      setValue(val)
      memoizedOnPreview(val)
    }
  }, [adjustmentConfig.min, adjustmentConfig.max, memoizedOnPreview])
  
  // Handle keyboard navigation
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const increment = e.shiftKey ? adjustmentConfig.step * 10 : adjustmentConfig.step
      const delta = e.key === 'ArrowUp' ? increment : -increment
      const newValue = Math.max(adjustmentConfig.min, Math.min(adjustmentConfig.max, value + delta))
      setValue(newValue)
      memoizedOnPreview(newValue)
    }
  }, [adjustmentConfig.min, adjustmentConfig.max, adjustmentConfig.step, value, memoizedOnPreview])
  
  const handleReset = useCallback(() => {
    setValue(adjustmentConfig.defaultValue)
    memoizedOnPreview(adjustmentConfig.defaultValue)
  }, [adjustmentConfig.defaultValue, memoizedOnPreview])
  
  const handleCancel = useCallback(() => {
    // Reset to default before closing
    memoizedOnReset()
    setActiveAdjustmentTool(null)
    // Switch back to move tool
    setActiveTool(TOOL_IDS.MOVE)
  }, [memoizedOnReset, setActiveAdjustmentTool, setActiveTool])
  
  const handleApply = useCallback(async () => {
    setIsApplying(true)
    try {
      await onApply(value)
      setActiveAdjustmentTool(null)
      // Switch back to move tool
      setActiveTool(TOOL_IDS.MOVE)
    } catch (error) {
      console.error('[AdjustmentDialog] Failed to apply adjustment:', error)
    } finally {
      setIsApplying(false)
    }
  }, [value, onApply, setActiveAdjustmentTool, setActiveTool])
  
  if (!isOpen) {
    return null
  }
  
  return (
    <FloatingPanel
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel()
      }}
      title={toolName}
      className="w-[425px]"
      initialPosition={initialPosition}
    >
      <FloatingPanelContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{adjustmentConfig.label}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2"
              title="Reset to default"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Slider
              value={[value]}
              onValueChange={handleValueChange}
              min={adjustmentConfig.min}
              max={adjustmentConfig.max}
              step={adjustmentConfig.step}
              className="flex-1"
            />
            
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                className="w-[70px] text-sm text-right tabular-nums bg-transparent border border-input rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                min={adjustmentConfig.min}
                max={adjustmentConfig.max}
                step={adjustmentConfig.step}
              />
              {adjustmentConfig.unit && (
                <span className="text-sm text-foreground/60 min-w-[20px]">
                  {adjustmentConfig.unit}
                </span>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Hold Shift while dragging for finer control
          </div>
        </div>
      </FloatingPanelContent>
      
      <FloatingPanelFooter>
        <Button variant="outline" onClick={handleCancel} disabled={isApplying}>
          Cancel
        </Button>
        <Button onClick={handleApply} disabled={isApplying}>
          OK
        </Button>
      </FloatingPanelFooter>
    </FloatingPanel>
  )
} 