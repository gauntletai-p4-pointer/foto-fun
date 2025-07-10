'use client'

import React from 'react'
import { AdjustmentDialog } from './AdjustmentDialog'
import { useCanvasStore } from '@/store/canvasStore'
import { hueTool } from '@/lib/editor/tools/adjustments/hueTool'

export const HueAdjustmentDialog: React.FC = () => {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  
  if (!activeAdjustmentTool || activeAdjustmentTool.toolId !== 'hue') {
    return null
  }
  
  // Use the currentValue from activeAdjustmentTool if available, otherwise default to 0
  const initialValue = activeAdjustmentTool.currentValue ?? 0
  
  const adjustmentConfig = {
    id: 'hue',
    label: 'Hue Rotation',
    min: -180,
    max: 180,
    step: 1,
    unit: '°',
    defaultValue: 0  // Always start at 0 for incremental adjustments
  }
  
  return (
    <AdjustmentDialog
      toolId="hue"
      toolName="Hue Adjustment"
      adjustmentConfig={adjustmentConfig}
      onApply={async (value) => {
        await hueTool.applyHue(value)
      }}
      onPreview={(value) => {
        hueTool.previewHue(value)
      }}
      onReset={() => {
        hueTool.resetHue()
      }}
    />
  )
} 