'use client'

import React from 'react'
import { AdjustmentDialog } from './AdjustmentDialog'
import { useCanvasStore } from '@/store/canvasStore'
import { colorTemperatureTool } from '@/lib/editor/tools/adjustments/colorTemperatureTool'

export const ColorTemperatureAdjustmentDialog: React.FC = () => {
  const activeAdjustmentTool = useCanvasStore((state) => state.activeAdjustmentTool)
  
  if (!activeAdjustmentTool || activeAdjustmentTool.toolId !== 'color-temperature') {
    return null
  }
  
  // Use the currentValue from activeAdjustmentTool if available, otherwise default to 0
  const initialValue = activeAdjustmentTool.currentValue ?? 0
  
  const adjustmentConfig = {
    id: 'color-temperature',
    label: 'Temperature',
    min: -100,
    max: 100,
    step: 1,
    unit: '%',
    defaultValue: 0  // Always start at 0 for incremental adjustments
  }
  
  return (
    <AdjustmentDialog
      toolId="color-temperature"
      toolName="Color Temperature Adjustment"
      adjustmentConfig={adjustmentConfig}
      onApply={async (value) => {
        await colorTemperatureTool.applyColorTemperature(value)
      }}
      onPreview={(value) => {
        colorTemperatureTool.previewColorTemperature(value)
      }}
      onReset={() => {
        colorTemperatureTool.resetColorTemperature()
      }}
    />
  )
} 