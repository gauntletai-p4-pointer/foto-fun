# Epic 5.5: AI Services Foundation - Server-Hosted Model Architecture

## Overview

This epic establishes the foundational architecture for server-hosted AI services in FotoFun. We start with a single AI model (background removal using Transformers.js) hosted server-side, but build the infrastructure to easily add more models and features later. This approach keeps the main app lightweight while enabling powerful AI features through API calls.

## Goals

1. **Establish AI service architecture** - Clean separation between app and AI services
2. **Zero client bloat** - No AI libraries in the browser bundle
3. **Start simple, scale later** - One model first, easy to add more
4. **Support both cloud and self-hosted** - Same features, different infrastructure
5. **Common API interface** - Consistent patterns for all AI operations

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    FotoFun Application                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │ Existing Tools  │    │  New AI Tools    │                   │
│  │   (Local)       │    │  (API-Based)     │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                   │                              │
│                          ┌────────▼─────────┐                   │
│                          │  AI Service      │                   │
│                          │    Client        │                   │
│                          └────────┬─────────┘                   │
└───────────────────────────────────┼─────────────────────────────┘
                                    │ HTTPS
                                    │
                    ┌───────────────▼────────────────┐
                    │   AI Service (Phase 1)         │
                    │   - Single Container           │
                    │   - Transformers.js            │
                    │   - Background Removal         │
                    └────────────────────────────────┘
                                    
                    Future: Multiple Services
                    ┌────────┐ ┌────────┐ ┌────────┐
                    │GFPGAN  │ │R-ESRGAN│ │ LaMa   │
                    └────────┘ └────────┘ └────────┘
```

## Implementation Plan

### Phase 1: Core Infrastructure (Days 1-2)

#### 1.1 AI Service Client Library
```typescript
// lib/ai/service-client/index.ts
export interface AIServiceConfig {
  enabled: boolean
  endpoint: string
  apiKey?: string
  timeout: number
}

export class AIServiceClient {
  private config: AIServiceConfig
  
  constructor() {
    this.config = this.loadConfig()
  }
  
  private loadConfig(): AIServiceConfig {
    // For cloud deployment
    if (process.env.NEXT_PUBLIC_DEPLOYMENT === 'cloud') {
      return {
        enabled: true,
        endpoint: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'https://ai.fotofun.app',
        apiKey: process.env.AI_SERVICE_KEY,
        timeout: 30000
      }
    }
    
    // For self-hosted
    const endpoint = process.env.NEXT_PUBLIC_AI_SERVICE_URL
    return {
      enabled: !!endpoint,
      endpoint: endpoint || '',
      apiKey: process.env.NEXT_PUBLIC_AI_SERVICE_KEY,
      timeout: 30000
    }
  }
  
  async removeBackground(imageBlob: Blob): Promise<Blob> {
    if (!this.config.enabled) {
      throw new Error('AI service not configured')
    }
    
    const formData = new FormData()
    formData.append('image', imageBlob)
    
    const response = await fetch(`${this.config.endpoint}/api/v1/remove-background`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
      signal: AbortSignal.timeout(this.config.timeout)
    })
    
    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`)
    }
    
    return response.blob()
  }
  
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {}
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    return headers
  }
}
```

#### 1.2 Base AI Tool Class
```typescript
// lib/editor/tools/base/AIServiceTool.ts
import { BaseTool } from './BaseTool'
import { AIServiceClient } from '@/lib/ai/service-client'

export abstract class AIServiceTool extends BaseTool {
  protected aiClient: AIServiceClient
  
  constructor() {
    super()
    this.aiClient = new AIServiceClient()
  }
  
  get isAvailable(): boolean {
    return this.aiClient.isConfigured()
  }
  
  protected showSetupPrompt(): void {
    const isCloud = process.env.NEXT_PUBLIC_DEPLOYMENT === 'cloud'
    
    if (isCloud) {
      // Show upgrade prompt
      showModal({
        title: 'Premium Feature',
        content: 'This AI feature requires a premium subscription.',
        actions: [
          { label: 'View Plans', onClick: () => window.open('/pricing') }
        ]
      })
    } else {
      // Show self-hosting guide
      showModal({
        title: 'AI Service Required',
        content: 'This feature requires the AI service to be configured.',
        actions: [
          { label: 'Setup Guide', onClick: () => window.open('/docs/ai-setup') }
        ]
      })
    }
  }
}
```

### Phase 2: First AI Service (Days 2-3)

#### 2.1 Transformers.js Service
```javascript
// ai-service/index.js
const express = require('express')
const multer = require('multer')
const { pipeline } = require('@xenova/transformers')

const app = express()
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } })

let removeBackground

// Initialize model
async function init() {
  console.log('Loading background removal model...')
  removeBackground = await pipeline('image-segmentation', 'Xenova/rmbg-1.4')
  console.log('Model loaded!')
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    model: 'rmbg-1.4',
    version: '1.0.0'
  })
})

// Background removal endpoint
app.post('/api/v1/remove-background', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' })
    }
    
    // Convert buffer to base64 for processing
    const base64 = req.file.buffer.toString('base64')
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`
    
    // Process with model
    const result = await removeBackground(dataUrl)
    
    // Apply segmentation mask and return PNG
    const outputBuffer = await applySegmentation(req.file.buffer, result)
    
    res.set('Content-Type', 'image/png')
    res.send(outputBuffer)
    
  } catch (error) {
    console.error('Processing error:', error)
    res.status(500).json({ error: 'Failed to process image' })
  }
})

// Start server
init().then(() => {
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`AI service running on port ${port}`)
  })
})
```

#### 2.2 Docker Configuration
```dockerfile
# ai-service/Dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY . .

# Create model cache directory
RUN mkdir -p /models
ENV MODEL_CACHE_DIR=/models

EXPOSE 3000

CMD ["node", "index.js"]
```

```yaml
# ai-service/docker-compose.yml
version: '3.8'

services:
  ai-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MODEL_CACHE_DIR=/models
    volumes:
      - ai-models:/models
    restart: unless-stopped

volumes:
  ai-models:
```

### Phase 3: Tool Implementation (Days 3-4)

#### 3.1 Background Removal Tool
```typescript
// lib/editor/tools/ai/backgroundRemovalTool.ts
import { Scissors } from 'lucide-react'
import { AIServiceTool } from '../base/AIServiceTool'
import { TOOL_IDS } from '@/constants'

class BackgroundRemovalTool extends AIServiceTool {
  id = TOOL_IDS.BACKGROUND_REMOVAL
  name = 'Remove Background'
  icon = Scissors
  cursor = 'default'
  shortcut = 'Shift+B'
  
  protected setupTool(canvas: Canvas): void {
    if (!this.isAvailable) {
      this.showSetupPrompt()
      return
    }
    
    // Listen for execute command
    this.subscribeToToolOptions((options) => {
      if (options.action === 'execute') {
        this.removeBackground(canvas)
      }
    })
  }
  
  private async removeBackground(canvas: Canvas): Promise<void> {
    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.type !== 'image') {
      showToast('Please select an image', { type: 'error' })
      return
    }
    
    const loading = showLoadingToast('Removing background...')
    
    try {
      // Convert fabric image to blob
      const blob = await this.fabricImageToBlob(activeObject)
      
      // Call AI service
      const resultBlob = await this.aiClient.removeBackground(blob)
      
      // Create new fabric image from result
      const resultImage = await this.blobToFabricImage(resultBlob)
      
      // Position at same location as original
      resultImage.set({
        left: activeObject.left,
        top: activeObject.top,
        scaleX: activeObject.scaleX,
        scaleY: activeObject.scaleY
      })
      
      // Replace original with result
      canvas.remove(activeObject)
      canvas.add(resultImage)
      canvas.setActiveObject(resultImage)
      canvas.renderAll()
      
      // Record for undo
      this.executeCommand(new CompositeCommand([
        new RemoveObjectCommand(canvas, activeObject),
        new AddObjectCommand(canvas, resultImage)
      ]))
      
      loading.dismiss()
      showToast('Background removed!', { type: 'success' })
      
    } catch (error) {
      loading.dismiss()
      console.error('Background removal failed:', error)
      
      if (error.message.includes('not configured')) {
        this.showSetupPrompt()
      } else {
        showToast('Failed to remove background', { type: 'error' })
      }
    }
  }
}

export const backgroundRemovalTool = new BackgroundRemovalTool()
```

#### 3.2 AI Tool Adapter
```typescript
// lib/ai/adapters/tools/backgroundRemoval.ts
import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { backgroundRemovalTool } from '@/lib/editor/tools/ai/backgroundRemovalTool'

export class BackgroundRemovalAdapter extends BaseToolAdapter {
  tool = backgroundRemovalTool
  aiName = 'removeBackground'
  description = `Remove image background using AI. Examples:
  - "remove background" → removes background from selected image
  - "cut out the subject" → removes background
  - "make background transparent" → removes background
  - "isolate the person" → removes background`
  
  inputSchema = z.object({
    execute: z.boolean().describe('Whether to execute background removal')
  })
  
  async execute(params: { execute: boolean }, context: { canvas: Canvas }) {
    if (!params.execute) {
      return {
        success: false,
        message: 'Background removal cancelled'
      }
    }
    
    // Activate tool
    useToolStore.getState().setActiveTool(this.tool.id)
    
    // Trigger execution
    useToolOptionsStore.getState().updateOption(this.tool.id, 'action', 'execute')
    
    return {
      success: true,
      message: 'Removing background...'
    }
  }
}
```

### Phase 4: UI Integration (Day 4)

#### 4.1 Tool Palette Update
```typescript
// components/editor/ToolPalette/index.tsx
export function ToolPalette() {
  const tools = useTools()
  const { isConfigured } = useAIService()
  
  return (
    <div className="tool-palette">
      {/* Existing tools */}
      <ToolSection title="Basic Tools" tools={tools.basic} />
      <ToolSection title="Selection" tools={tools.selection} />
      
      {/* AI Tools Section */}
      <ToolSection 
        title="AI Tools" 
        tools={tools.ai}
        badge={!isConfigured ? 'Setup Required' : undefined}
      />
    </div>
  )
}
```

#### 4.2 AI Service Status Indicator
```typescript
// components/editor/StatusBar/AIServiceStatus.tsx
export function AIServiceStatus() {
  const { isConfigured, isHealthy } = useAIService()
  
  if (!isConfigured) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="status-item text-muted-foreground hover:text-foreground"
              onClick={() => showAISetupModal()}
            >
              <CloudOff className="w-4 h-4" />
              <span>AI Offline</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Click to setup AI features
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  return (
    <div className="status-item">
      <Cloud className={cn("w-4 h-4", isHealthy ? "text-green-500" : "text-yellow-500")} />
      <span>AI {isHealthy ? 'Ready' : 'Connecting...'}</span>
    </div>
  )
}
```

### Phase 5: Documentation & Deployment (Day 5)

#### 5.1 Self-Hosting Guide
```markdown
# Setting Up AI Features

## Quick Start (Docker)

1. Clone the AI service:
```bash
git clone https://github.com/fotofun/ai-service
cd ai-service
```

2. Start with Docker:
```bash
docker-compose up -d
```

3. Configure FotoFun:
Create `.env.local`:
```
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:3000
```

4. Restart FotoFun and AI features will be available!

## Manual Setup

1. Install Node.js 20+
2. Clone and install:
```bash
git clone https://github.com/fotofun/ai-service
cd ai-service
npm install
```

3. Start service:
```bash
npm start
```

## Production Deployment

For production, we recommend:
- Use HTTPS with proper certificates
- Set API key for authentication
- Use a reverse proxy (nginx/caddy)
- Monitor with health checks

Example nginx config:
```nginx
server {
    listen 443 ssl;
    server_name ai.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```
```

## Future Expansion Plan

### Additional Models (Future Phases)

```typescript
// Future service endpoints
const FUTURE_SERVICES = {
  // Phase 2: Face Enhancement (GFPGAN)
  '/api/v1/enhance-face': {
    model: 'GFPGANv1.4',
    description: 'Enhance facial features, remove blemishes'
  },
  
  // Phase 3: Image Upscaling (Real-ESRGAN)  
  '/api/v1/upscale': {
    model: 'RealESRGAN_x4plus',
    description: 'Upscale images 2x, 4x, or 8x'
  },
  
  // Phase 4: Smart Erase (LaMa)
  '/api/v1/smart-erase': {
    model: 'lama',
    description: 'Remove unwanted objects intelligently'
  },
  
  // Phase 5: More Transformers.js features
  '/api/v1/detect-objects': {
    model: 'detr-resnet-50',
    description: 'Detect and label objects'
  },
  '/api/v1/estimate-depth': {
    model: 'dpt-large', 
    description: 'Create depth maps'
  }
}
```

### Microservices Architecture (Future)

```yaml
# Future docker-compose with multiple services
version: '3.8'

services:
  gateway:
    image: nginx:alpine
    ports:
      - "8080:80"
    depends_on:
      - transformers
      - gfpgan
      - realesrgan
      
  transformers:
    image: fotofun/ai-transformers
    
  gfpgan:
    image: fotofun/ai-gfpgan
    
  realesrgan:
    image: fotofun/ai-realesrgan
```

## Success Criteria

1. **Foundation Complete**
   - AI service client integrated
   - Background removal working end-to-end
   - Clear setup documentation
   - Both cloud and self-hosted paths work

2. **Performance**
   - Background removal < 5 seconds
   - Service starts in < 30 seconds
   - Handles concurrent requests

3. **Developer Experience**
   - Easy to add new AI tools
   - Clear patterns established
   - Minimal boilerplate

4. **User Experience**
   - Clear messaging when AI not configured
   - Smooth upgrade/setup flow
   - Visual feedback during processing

## Technical Decisions

1. **Why Server-Side?**
   - Keeps app bundle small (<50MB vs 500MB+)
   - Consistent performance across devices
   - Easier to update models
   - Better for battery life on mobile

2. **Why Start with One Model?**
   - Proves the architecture works
   - Faster time to market
   - Learn from real usage
   - Easy to expand later

3. **Why Transformers.js First?**
   - Good model (RMBG-1.4) for background removal
   - Runs well on CPU
   - Active community
   - Multiple useful models available

## Risks & Mitigation

1. **Service Availability**
   - Mitigation: Graceful degradation, clear error messages
   
2. **Performance Issues**
   - Mitigation: Caching, request queuing, timeouts
   
3. **Self-Hosting Complexity**
   - Mitigation: Docker images, detailed docs, video tutorials

---

## Epic Status: 📋 PLANNED

This epic establishes the foundation for server-hosted AI features, starting with background removal. The architecture supports easy expansion with additional models while keeping the main application lightweight and performant. 