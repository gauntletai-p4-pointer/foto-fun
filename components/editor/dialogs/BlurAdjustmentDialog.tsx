'use client'

import React from 'react'
import { AdjustmentDialog } from './AdjustmentDialog'
import { useCanvasStore } from '@/store/canvasStore'
import { blurTool } from '@/lib/editor/tools/filters/blurTool'

export const BlurAdjustmentDialog: React.FC = () => {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  
  if (!activeAdjustmentTool || activeAdjustmentTool.toolId !== 'blur') {
    return null
  }
  
  // Use the currentValue from activeAdjustmentTool if available, otherwise default to 0
  const initialValue = activeAdjustmentTool.currentValue ?? 0
  
  const adjustmentConfig = {
    id: 'blur',
    label: 'Blur Radius',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    defaultValue: 0  // Always start at 0 for incremental adjustments
  }
  
  return (
    <AdjustmentDialog
      toolId="blur"
      toolName="Blur Adjustment"
      adjustmentConfig={adjustmentConfig}
      onApply={async (value) => {
        await blurTool.applyBlur(value)
      }}
      onPreview={(value) => {
        blurTool.previewBlur(value)
      }}
      onReset={() => {
        blurTool.resetBlur()
      }}
    />
  )
} 