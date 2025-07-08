# OpenShop MVP Quick Start Guide

## Immediate Next Steps

### Day 1: Project Setup

#### 1. Install Dependencies
```bash
# Core dependencies
bun add fabric@^6.0.0 zustand@^5.0.0 @radix-ui/themes @radix-ui/colors @radix-ui/icons
bun add gpu.js @ai-sdk/openai ai zod
bun add class-variance-authority clsx tailwind-merge
bun add date-fns uuid file-saver

# Dev dependencies
bun add -d @types/fabric vitest @testing-library/react @testing-library/user-event
bun add -d @vitejs/plugin-react jest-canvas-mock
```

#### 2. Update TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/store/*": ["./src/store/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

#### 3. Create Folder Structure
```bash
mkdir -p src/{components,lib,store,hooks,types,constants}
mkdir -p src/components/{editor,ui,dialogs}
mkdir -p src/components/editor/{Canvas,MenuBar,ToolPalette,Panels,OptionsBar,StatusBar}
mkdir -p src/lib/{canvas,filters,tools,ai,utils}
mkdir -p src/app/{editor,api/ai,"(marketing)"}
```

### Day 2-3: Core Canvas Implementation

#### 1. Create Canvas Store
```typescript
// src/store/canvasStore.ts
import { create } from 'zustand'
import { fabric } from 'fabric'

interface CanvasStore {
  canvas: fabric.Canvas | null
  zoom: number
  initCanvas: (element: HTMLCanvasElement) => void
  setZoom: (zoom: number) => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  canvas: null,
  zoom: 1,
  
  initCanvas: (element) => {
    const canvas = new fabric.Canvas(element, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff'
    })
    set({ canvas })
  },
  
  setZoom: (zoom) => {
    const { canvas } = get()
    if (canvas) {
      canvas.setZoom(zoom)
      set({ zoom })
    }
  }
}))
```

#### 2. Create Canvas Component
```typescript
// src/components/editor/Canvas/Canvas.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const initCanvas = useCanvasStore(state => state.initCanvas)
  
  useEffect(() => {
    if (canvasRef.current) {
      initCanvas(canvasRef.current)
    }
  }, [initCanvas])
  
  return (
    <div className="relative flex-1 bg-gray-100 overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  )
}
```

### Day 4-5: UI Shell

#### 1. Create Editor Layout
```typescript
// src/app/editor/layout.tsx
export default function EditorLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {children}
    </div>
  )
}
```

#### 2. Create Editor Page
```typescript
// src/app/editor/page.tsx
import { MenuBar } from '@/components/editor/MenuBar'
import { ToolPalette } from '@/components/editor/ToolPalette'
import { Canvas } from '@/components/editor/Canvas'
import { Panels } from '@/components/editor/Panels'
import { OptionsBar } from '@/components/editor/OptionsBar'
import { StatusBar } from '@/components/editor/StatusBar'

export default function EditorPage() {
  return (
    <>
      <MenuBar />
      <OptionsBar />
      <div className="flex-1 flex overflow-hidden">
        <ToolPalette />
        <Canvas />
        <Panels />
      </div>
      <StatusBar />
    </>
  )
}
```

### Day 6-7: First Working Tool

#### 1. Create Tool System
```typescript
// src/lib/tools/types.ts
export interface Tool {
  id: string
  name: string
  icon: React.ComponentType
  cursor: string
  onActivate?: (canvas: fabric.Canvas) => void
  onDeactivate?: (canvas: fabric.Canvas) => void
  onMouseDown?: (e: fabric.IEvent) => void
  onMouseMove?: (e: fabric.IEvent) => void
  onMouseUp?: (e: fabric.IEvent) => void
}
```

#### 2. Implement Move Tool
```typescript
// src/lib/tools/moveTool.ts
import { Tool } from './types'

export const moveTool: Tool = {
  id: 'move',
  name: 'Move Tool',
  icon: MoveIcon,
  cursor: 'move',
  
  onActivate: (canvas) => {
    canvas.selection = true
    canvas.forEachObject(obj => {
      obj.selectable = true
      obj.evented = true
    })
  },
  
  onDeactivate: (canvas) => {
    canvas.discardActiveObject()
  }
}
```

### Week 2: Core Features

#### Priority Order:
1. **File Operations**
   - New document dialog
   - Open image functionality
   - Basic save (download)

2. **Basic Adjustments**
   - Brightness/Contrast
   - GPU.js integration

3. **Selection Tools**
   - Rectangle selection
   - Ellipse selection

4. **History System**
   - Undo/Redo
   - History panel

### Week 3: AI Integration

#### 1. Setup AI Route
```typescript
// src/app/api/ai/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
    tools: aiTools,
  })
  
  return result.toAIStreamResponse()
}
```

#### 2. Create AI Panel
```typescript
// src/components/editor/Panels/AIAssistant.tsx
import { useChat } from 'ai/react'

export function AIAssistant() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/ai',
  })
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat UI */}
    </div>
  )
}
```

## Testing Strategy

### Unit Tests (Continuous)
```typescript
// src/lib/filters/__tests__/brightness.test.ts
import { describe, it, expect } from 'vitest'
import { applyBrightness } from '../brightness'

describe('Brightness Filter', () => {
  it('should increase brightness', () => {
    // Test implementation
  })
})
```

### E2E Tests (Weekly)
```typescript
// tests/e2e/basic-flow.spec.ts
import { test, expect } from '@playwright/test'

test('create new document and apply filter', async ({ page }) => {
  await page.goto('/editor')
  // Test steps
})
```

## Performance Monitoring

### 1. Add Web Vitals
```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### 2. Performance Budgets
```javascript
// next.config.js
module.exports = {
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP']
  }
}
```

## Daily Checklist

### Before Starting
- [ ] Pull latest changes
- [ ] Review yesterday's TODOs
- [ ] Check performance metrics

### During Development
- [ ] Write tests for new features
- [ ] Check accessibility
- [ ] Monitor bundle size
- [ ] Update documentation

### Before Ending
- [ ] Run tests: `bun test`
- [ ] Run type check: `bun typecheck`
- [ ] Run linter: `bun lint`
- [ ] Commit with clear message
- [ ] Update TODO list

## Common Issues & Solutions

### 1. Fabric.js TypeScript Issues
```typescript
// Add to global.d.ts
declare module 'fabric' {
  export * from 'fabric/fabric-impl'
}
```

### 2. GPU.js WebGL Errors
```typescript
// Fallback to CPU mode
const gpu = new GPU({ mode: 'cpu' })
```

### 3. Memory Leaks
```typescript
// Always cleanup
useEffect(() => {
  return () => {
    canvas?.dispose()
  }
}, [])
```

## Resources

- [Fabric.js Docs](http://fabricjs.com/docs/)
- [GPU.js Examples](https://gpu.rocks/#/examples)
- [AI SDK Docs](https://sdk.vercel.ai/docs)
- [Radix UI Components](https://www.radix-ui.com/)

## Getting Help

1. Check existing issues in the repo
2. Ask in the Discord community
3. Create a detailed bug report
4. Tag @maintainers for urgent issues 