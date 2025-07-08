'use client'

export function Panels() {
  return (
    <div className="w-64 bg-background border-l border-border">
      <div className="border-b border-border p-2">
        <h3 className="text-sm font-medium text-foreground">Layers</h3>
      </div>
      <div className="p-2 text-muted-foreground text-sm">
        <p>No layers yet</p>
      </div>
    </div>
  )
} 