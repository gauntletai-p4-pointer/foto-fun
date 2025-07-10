'use client'

import React from 'react'
import { AdjustmentDialog } from './AdjustmentDialog'
import { useCanvasStore } from '@/store/canvasStore'
import { contrastTool } from '@/lib/editor/tools/adjustments/contrastTool'

export const ContrastAdjustmentDialog: React.FC = () => {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  
  if (!activeAdjustmentTool || activeAdjustmentTool.toolId !== 'contrast') {
    return null
  }
  
  // Use the currentValue from activeAdjustmentTool if available, otherwise default to 0
  const initialValue = activeAdjustmentTool.currentValue ?? 0
  
  const adjustmentConfig = {
    id: 'contrast',
    label: 'Contrast',
    min: -100,
    max: 100,
    step: 1,
    unit: '%',
    defaultValue: 0  // Always start at 0 for incremental adjustments
  }
  
  return (
    <AdjustmentDialog
      toolId="contrast"
      toolName="Contrast Adjustment"
      adjustmentConfig={adjustmentConfig}
      onApply={async (value) => {
        await contrastTool.applyContrast(value)
      }}
      onPreview={(value) => {
        contrastTool.previewContrast(value)
      }}
      onReset={() => {
        contrastTool.resetContrast()
      }}
    />
  )
} 