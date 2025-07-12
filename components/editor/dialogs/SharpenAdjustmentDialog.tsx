'use client'

import React from 'react'
import { AdjustmentDialog } from './AdjustmentDialog'
import { useCanvasStore } from '@/store/canvasStore'
import { sharpenTool } from '@/lib/editor/tools/filters/sharpenTool'

export const SharpenAdjustmentDialog: React.FC = () => {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  
  if (!activeAdjustmentTool || activeAdjustmentTool.toolId !== 'sharpen') {
    return null
  }
  
  // Use the currentValue from activeAdjustmentTool if available, otherwise default to 0
  const initialValue = activeAdjustmentTool.currentValue ?? 0
  
  const adjustmentConfig = {
    id: 'sharpen',
    label: 'Sharpen Strength',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    defaultValue: 0  // Always start at 0 for incremental adjustments
  }
  
  return (
    <AdjustmentDialog
      toolId="sharpen"
      toolName="Sharpen Adjustment"
      adjustmentConfig={adjustmentConfig}
      onApply={async (value) => {
        await sharpenTool.applySharpen(value)
      }}
      onPreview={(value) => {
        sharpenTool.previewSharpen(value)
      }}
      onReset={() => {
        sharpenTool.resetSharpen()
      }}
    />
  )
} 