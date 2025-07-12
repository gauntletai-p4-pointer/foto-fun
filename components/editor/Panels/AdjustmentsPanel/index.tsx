'use client'

import React from 'react'
import { useAsyncService } from '@/lib/core/AppInitializer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'

export function AdjustmentsPanel() {
  const { service: toolStore } = useAsyncService<EventToolStore>('ToolStore')
  
  if (!toolStore) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">Adjustments</h3>
      <div className="space-y-4">
        {/* Adjustment controls will go here */}
        <p className="text-sm text-gray-500">Adjustment controls coming soon...</p>
      </div>
    </div>
  )
} 