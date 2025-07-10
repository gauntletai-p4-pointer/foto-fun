'use client'

import React from 'react'
import { AdjustmentDialog } from './AdjustmentDialog'
import { useCanvasStore } from '@/store/canvasStore'
import { exposureTool } from '@/lib/editor/tools/adjustments/exposureTool'

export const ExposureAdjustmentDialog: React.FC = () => {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  
  if (!activeAdjustmentTool || activeAdjustmentTool.toolId !== 'exposure') {
    return null
  }
  
  // Use the currentValue from activeAdjustmentTool if available, otherwise default to 0
  const initialValue = activeAdjustmentTool.currentValue ?? 0
  
  const adjustmentConfig = {
    id: 'exposure',
    label: 'Exposure',
    min: -100,
    max: 100,
    step: 1,
    unit: '%',
    defaultValue: 0  // Always start at 0 for incremental adjustments
  }
  
  return (
    <AdjustmentDialog
      toolId="exposure"
      toolName="Exposure Adjustment"
      adjustmentConfig={adjustmentConfig}
      onApply={async (value) => {
        await exposureTool.applyExposure(value)
      }}
      onPreview={(value) => {
        exposureTool.previewExposure(value)
      }}
      onReset={() => {
        exposureTool.resetExposure()
      }}
    />
  )
} 