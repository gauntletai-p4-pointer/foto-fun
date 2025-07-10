'use client'

import React from 'react'
import { AdjustmentDialog } from './AdjustmentDialog'
import { useCanvasStore } from '@/store/canvasStore'
import { brightnessTool } from '@/lib/editor/tools/adjustments/brightnessTool'

export const BrightnessAdjustmentDialog: React.FC = () => {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  
  if (!activeAdjustmentTool || activeAdjustmentTool.toolId !== 'brightness') {
    return null
  }
  
  // Use the currentValue from activeAdjustmentTool if available, otherwise default to 0
  const initialValue = activeAdjustmentTool.currentValue ?? 0
  
  const adjustmentConfig = {
    id: 'brightness',
    label: 'Brightness',
    min: -100,
    max: 100,
    step: 1,
    unit: '%',
    defaultValue: 0  // Always start at 0 for incremental adjustments
  }
  
  return (
    <AdjustmentDialog
      toolId="brightness"
      toolName="Brightness Adjustment"
      adjustmentConfig={adjustmentConfig}
      onApply={async (value) => {
        await brightnessTool.applyBrightness(value)
      }}
      onPreview={(value) => {
        brightnessTool.previewBrightness(value)
      }}
      onReset={() => {
        brightnessTool.resetBrightness()
      }}
    />
  )
} 