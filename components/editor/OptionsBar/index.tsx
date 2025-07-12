'use client'

import React from 'react'
import { ToolOptions } from '../ToolOptions'
import { useService } from '@/lib/core/AppInitializer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'

export function OptionsBar() {
  const toolStore = useService<EventToolStore>('ToolStore')
  
  if (!toolStore) {
    return <div className="h-12 bg-gray-100 border-b" />
  }

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
      <ToolOptions />
    </div>
  )
} 