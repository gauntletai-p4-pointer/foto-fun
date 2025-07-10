'use client'

import React from 'react'
import { AdjustmentDialog } from './AdjustmentDialog'
import { useCanvasStore } from '@/store/canvasStore'
import { saturationTool } from '@/lib/editor/tools/adjustments/saturationTool'

export const SaturationAdjustmentDialog: React.FC = () => {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  
  if (!activeAdjustmentTool || activeAdjustmentTool.toolId !== 'saturation') {
    return null
  }
  
  // Use the currentValue from activeAdjustmentTool if available, otherwise default to 0
  const initialValue = activeAdjustmentTool.currentValue ?? 0
  
  const adjustmentConfig = {
    id: 'saturation',
    label: 'Saturation',
    min: -100,
    max: 100,
    step: 1,
    unit: '%',
    defaultValue: 0  // Always start at 0 for incremental adjustments
  }
  
  return (
    <AdjustmentDialog
      toolId="saturation"
      toolName="Saturation Adjustment"
      adjustmentConfig={adjustmentConfig}
      onApply={async (value) => {
        await saturationTool.applySaturation(value)
      }}
      onPreview={(value) => {
        saturationTool.previewSaturation(value)
      }}
      onReset={() => {
        saturationTool.resetSaturation()
      }}
    />
  )
} 