'use client'

import React from 'react'
import { useService } from '@/lib/core/AppInitializer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'

export function ToolPalette() {
  const toolStore = useService<EventToolStore>('ToolStore')
  
  if (!toolStore) {
    return <div className="w-16 bg-gray-100 border-r" />
  }

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-2">
        <span className="text-xs text-gray-500">Tools</span>
      </div>
      {/* Tool buttons will go here */}
    </div>
  )
} 