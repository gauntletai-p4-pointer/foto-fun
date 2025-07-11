'use client'

import { useToolStore } from '@/lib/store/tools'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Sun, 
  Contrast, 
  Palette, 
  Droplets,
  Thermometer,
  Camera,
  Brush,
  Focus,
  Image,
  CircleOff,
  RotateCcw,
  Check,
  X
} from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { cn } from '@/lib/utils'

interface ControlConfig {
  id: string
  label: string
  type?: 'toggle'
  min?: number
  max?: number
  step?: number
  default: number | boolean
}

interface ToolConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  controls: ControlConfig[]
}

// Tool-specific configurations
const toolConfigs: Record<string, ToolConfig> = {
  [TOOL_IDS.BRIGHTNESS]: {
    icon: Sun,
    label: 'Brightness',
    controls: [
      { id: 'adjustment', label: 'Amount', min: -100, max: 100, step: 1, default: 0 }
    ]
  },
  [TOOL_IDS.CONTRAST]: {
    icon: Contrast,
    label: 'Contrast',
    controls: [
      { id: 'adjustment', label: 'Amount', min: -100, max: 100, step: 1, default: 0 }
    ]
  },
  [TOOL_IDS.HUE]: {
    icon: Palette,
    label: 'Hue/Saturation',
    controls: [
      { id: 'hue', label: 'Hue', min: -180, max: 180, step: 1, default: 0 },
      { id: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, default: 0 }
    ]
  },
  [TOOL_IDS.SATURATION]: {
    icon: Droplets,
    label: 'Saturation',
    controls: [
      { id: 'adjustment', label: 'Amount', min: -100, max: 100, step: 1, default: 0 }
    ]
  },
  [TOOL_IDS.EXPOSURE]: {
    icon: Camera,
    label: 'Exposure',
    controls: [
      { id: 'adjustment', label: 'Amount', min: -3, max: 3, step: 0.1, default: 0 }
    ]
  },
  [TOOL_IDS.BLUR]: {
    icon: Brush,
    label: 'Gaussian Blur',
    controls: [
      { id: 'radius', label: 'Radius', min: 0, max: 50, step: 0.5, default: 0 }
    ]
  },
  [TOOL_IDS.SHARPEN]: {
    icon: Focus,
    label: 'Sharpen',
    controls: [
      { id: 'amount', label: 'Amount', min: 0, max: 100, step: 1, default: 0 }
    ]
  },
  [TOOL_IDS.GRAYSCALE]: {
    icon: Image,
    label: 'Black & White',
    controls: [
      { id: 'enabled', label: 'Apply', type: 'toggle', default: false }
    ]
  },
  [TOOL_IDS.INVERT]: {
    icon: CircleOff,
    label: 'Invert',
    controls: [
      { id: 'enabled', label: 'Apply', type: 'toggle', default: false }
    ]
  }
}

export function AdjustmentsPanel() {
  const toolStore = useToolStore()
  
  const activeTool = toolStore.activeTool
  const activeToolId = activeTool?.id
  
  // Check if active tool is an adjustment/filter tool
  const isAdjustmentTool = activeToolId && activeToolId in toolConfigs
  
  if (!isAdjustmentTool || !activeToolId) {
    return (
      <div className="p-4 text-center text-foreground/60">
        <Image className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Select an adjustment or filter tool</p>
      </div>
    )
  }
  
  const config = toolConfigs[activeToolId]
  const Icon = config.icon
  const options = toolStore.getToolOptions(activeToolId)
  
  const handleSliderChange = (controlId: string, value: number[]) => {
    toolStore.updateOption(activeToolId, controlId, value[0])
    
    // Apply the adjustment in real-time
    const tool = activeTool as any
    if (tool && typeof tool[`apply${config.label.replace(/\s+/g, '')}`] === 'function') {
      tool[`apply${config.label.replace(/\s+/g, '')}`](value[0])
    }
  }
  
  const handleToggleChange = (controlId: string, checked: boolean) => {
    toolStore.updateOption(activeToolId, controlId, checked)
    
    // Apply the toggle
    const tool = activeTool as any
    if (tool && checked && typeof tool[`apply${config.label.replace(/\s+/g, '')}`] === 'function') {
      tool[`apply${config.label.replace(/\s+/g, '')}`]()
    }
  }
  
  const handleReset = () => {
    // Reset all controls to defaults
    config.controls.forEach(control => {
      if ('default' in control) {
        toolStore.updateOption(activeToolId, control.id, control.default)
      }
    })
    
    // Apply reset
    const tool = activeTool as any
    if (tool && typeof tool.reset === 'function') {
      tool.reset()
    }
  }
  
  const handleApply = () => {
    // Apply and commit the adjustment
    console.log('Apply adjustment:', activeToolId, options)
    // TODO: Implement apply logic that commits the adjustment
  }
  
  const handleCancel = () => {
    // Reset and deactivate tool
    handleReset()
    toolStore.activateTool(TOOL_IDS.MOVE) // Switch to move tool
  }
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-3 border-b border-foreground/10">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-foreground/60" />
          <h3 className="font-medium text-sm">{config.label}</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            Live Preview
          </Badge>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {config.controls.map(control => {
          const value = options[control.id] ?? control.default
          
          if (control.type === 'toggle') {
            return (
              <div key={control.id} className="flex items-center justify-between">
                <Label htmlFor={control.id} className="text-sm">
                  {control.label}
                </Label>
                <Switch
                  id={control.id}
                  checked={value as boolean}
                  onCheckedChange={(checked) => handleToggleChange(control.id, checked)}
                />
              </div>
            )
          }
          
          return (
            <div key={control.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={control.id} className="text-sm">
                  {control.label}
                </Label>
                <span className="text-xs text-foreground/60 tabular-nums">
                  {value}
                  {control.id === 'exposure' ? ' EV' : 
                   control.id === 'radius' ? 'px' : 
                   control.id.includes('temperature') || control.id.includes('tint') ? '°' : '%'}
                </span>
              </div>
              <Slider
                id={control.id}
                value={[value as number]}
                onValueChange={(val) => handleSliderChange(control.id, val)}
                min={control.min}
                max={control.max}
                step={control.step}
                className={cn(
                  "w-full",
                  value === control.default && "opacity-60"
                )}
              />
            </div>
          )
        })}
      </div>
      
      {/* Actions */}
      <div className="p-3 border-t border-foreground/10 space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleReset}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCancel}
          >
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleApply}
          >
            <Check className="mr-1 h-3 w-3" />
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
} 