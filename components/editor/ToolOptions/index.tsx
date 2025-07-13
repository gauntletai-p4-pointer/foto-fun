'use client'

import React, { useState, useEffect } from 'react'
import { useAsyncService } from '@/lib/core/AppInitializer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'
import type { EventToolOptionsStore } from '@/lib/store/tools/EventToolOptionsStore'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export function ToolOptions() {
  const { service: toolStore } = useAsyncService<EventToolStore>('ToolStore')
  const { service: toolOptionsStore } = useAsyncService<EventToolOptionsStore>('ToolOptionsStore')
  const [mounted, setMounted] = useState(false)
  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const [, forceUpdate] = useState({})
  
  // Subscribe to tool changes
  useEffect(() => {
    if (!toolStore) return
    
    const updateActiveToolId = () => {
      const newActiveToolId = toolStore.getActiveToolId()
      setActiveToolId(newActiveToolId)
      // Force re-render when tool changes to update options
      forceUpdate({})
    }
    
    // Initial update
    updateActiveToolId()
    
    // Subscribe to changes
    const unsubscribe = toolStore.subscribe(updateActiveToolId)
    
    return unsubscribe
  }, [toolStore])
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted || !toolStore || !toolOptionsStore || !activeToolId) {
    return null
  }

  const activeTool = toolStore.getActiveTool()
  
  if (!activeTool) {
    return null
  }

  const optionDefinitions = activeTool.getOptionDefinitions()
  const optionKeys = Object.keys(optionDefinitions)
  
  if (optionKeys.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground/60">
        <Badge variant="secondary" className="capitalize">
          {activeToolId.replace(/-/g, ' ')}
        </Badge>
        <span className="text-xs">No options available</span>
      </div>
    )
  }

  const handleOptionChange = (optionId: string, value: unknown) => {
    activeTool.setOption(optionId, value as string | number | boolean | Record<string, unknown>)
  }

  const renderOption = (optionId: string, definition: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'color';
    defaultValue?: string | number | boolean;
    label?: string;
    options?: Array<{ value: string | number; label: string; }>;
    min?: number;
    max?: number;
    step?: number;
  }) => {
    const currentValue = activeTool.getAllOptions()[optionId] ?? definition.defaultValue

    switch (definition.type) {
      case 'select':
        return (
          <div key={optionId} className="flex items-center gap-2">
            <Label htmlFor={optionId} className="text-xs whitespace-nowrap">
              {definition.label || optionId}:
            </Label>
            <Select
              value={String(currentValue)}
              onValueChange={(value) => handleOptionChange(optionId, value)}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {definition.options?.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      
      case 'number':
        return (
          <div key={optionId} className="flex items-center gap-2">
            <Label htmlFor={optionId} className="text-xs whitespace-nowrap">
              {definition.label || optionId}:
            </Label>
            <Input
              id={optionId}
              type="number"
              value={Number(currentValue)}
              onChange={(e) => handleOptionChange(optionId, Number(e.target.value))}
              min={definition.min}
              max={definition.max}
              step={definition.step}
              className="h-8 w-28 text-xs"
            />
          </div>
        )
      
      case 'boolean':
        return (
          <div key={optionId} className="flex items-center gap-2">
            <Checkbox
              id={optionId}
              checked={Boolean(currentValue)}
              onCheckedChange={(checked) => handleOptionChange(optionId, checked)}
            />
            <Label htmlFor={optionId} className="text-xs">
              {definition.label || optionId}
            </Label>
          </div>
        )
      
      case 'string':
      default:
        return (
          <div key={optionId} className="flex items-center gap-2">
            <Label htmlFor={optionId} className="text-xs whitespace-nowrap">
              {definition.label || optionId}:
            </Label>
            <Input
              id={optionId}
              type="text"
              value={String(currentValue)}
              onChange={(e) => handleOptionChange(optionId, e.target.value)}
              className="h-8 w-28 text-xs"
            />
          </div>
        )
    }
  }

  return (
    <div className="flex flex-nowrap items-center gap-4 text-xs">
      <Badge variant="secondary" className="capitalize">
        {activeToolId.replace(/-/g, ' ')}
      </Badge>
      {optionKeys.map((optionId) =>
        renderOption(optionId, optionDefinitions[optionId])
      )}
    </div>
  )
}
