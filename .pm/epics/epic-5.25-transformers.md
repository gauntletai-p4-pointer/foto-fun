# Epic 5.25: Transformers.js AI Service Architecture & Advanced AI Tools

## Overview

This epic establishes a scalable AI service architecture that enables advanced AI-powered features while maintaining a clear separation between the open-source/self-hosted version and the premium cloud offering. The architecture uses a separate Transformers.js service that can be either hosted by us (for cloud users) or self-hosted by users who want these features.

## Goals

1. **Maintain lightweight core app** - No AI libraries in the main bundle
2. **Enable premium differentiation** - Cloud users get instant AI features
3. **Respect self-hosters** - Allow them to run their own AI service
4. **Privacy-first approach** - All processing can be done locally
5. **Scalable architecture** - Easy to add new AI models and features

## Architecture Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FotoFun Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │   Core Tools    │    │    AI Tools      │                   │
│  │  (Always Free)  │    │ (Service-Based)  │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                   │                              │
│                          ┌────────▼─────────┐                   │
│                          │  AI Service      │                   │
│                          │    Client        │                   │
│                          └────────┬─────────┘                   │
└───────────────────────────────────┼─────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  │                                   │
     ┌────────────▼────────────┐      ┌─────────────▼────────────┐
     │   FotoFun AI Service    │      │  Self-Hosted AI Service  │
     │   (Cloud/Premium)       │      │    (User Managed)        │
     ├─────────────────────────┤      ├──────────────────────────┤
     │ • Hosted by us          │      │ • Docker container       │
     │ • Auto-scaling          │      │ • User's infrastructure  │
     │ • Latest models         │      │ • Full privacy           │
     │ • Usage tracking        │      │ • Custom models          │
     └─────────────────────────┘      └──────────────────────────┘
```

### Component Breakdown

#### 1. Main Application Changes

```typescript
// lib/config/features.ts
export interface FeatureFlags {
  core: {
    // Always available
    brightness: boolean
    contrast: boolean
    crop: boolean
    // ... other Epic 5 tools
  }
  ai: {
    // Requires AI service
    backgroundRemoval: boolean
    imageUpscaling: boolean
    objectDetection: boolean
    styleTransfer: boolean
    faceDetection: boolean
    depthEstimation: boolean
  }
}

// lib/config/ai-service.ts
export interface AIServiceConfig {
  enabled: boolean
  endpoint: string
  apiKey?: string
  timeout: number
  maxFileSize: number
  supportedFormats: string[]
}
```

#### 2. AI Service Client Library

```typescript
// lib/ai/service-client/index.ts
export class AIServiceClient {
  private config: AIServiceConfig
  private healthCheckInterval?: NodeJS.Timer
  private isHealthy: boolean = false
  
  constructor(config?: Partial<AIServiceConfig>) {
    this.config = this.loadConfig(config)
    if (this.config.enabled) {
      this.startHealthCheck()
    }
  }
  
  // Core methods
  async checkHealth(): Promise<boolean>
  async removeBackground(image: Blob, options?: RemoveBackgroundOptions): Promise<Blob>
  async upscaleImage(image: Blob, scale: number): Promise<Blob>
  async detectObjects(image: Blob): Promise<Detection[]>
  async estimateDepth(image: Blob): Promise<DepthMap>
  async transferStyle(content: Blob, style: Blob): Promise<Blob>
  
  // Utility methods
  async validateImage(image: Blob): Promise<ValidationResult>
  async getModelInfo(modelId: string): Promise<ModelInfo>
  async getSupportedModels(): Promise<ModelInfo[]>
}
```

#### 3. Separate AI Service (New Repository)

```
fotofun-ai-service/
├── src/
│   ├── server.ts           # Express/Fastify server
│   ├── models/             # Model management
│   │   ├── ModelLoader.ts
│   │   ├── ModelCache.ts
│   │   └── registry.ts
│   ├── endpoints/          # API endpoints
│   │   ├── background.ts
│   │   ├── upscale.ts
│   │   ├── detection.ts
│   │   └── ...
│   ├── middleware/         # Auth, rate limiting, etc
│   └── utils/
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### 1.1 Create AI Service Client
```typescript
// lib/ai/service-client/client.ts
export class AIServiceClient {
  constructor(private config: AIServiceConfig) {}
  
  async request<T>(endpoint: string, data: FormData): Promise<T> {
    if (!this.config.enabled) {
      throw new AIServiceNotConfiguredError()
    }
    
    const response = await fetch(`${this.config.endpoint}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data,
      signal: AbortSignal.timeout(this.config.timeout)
    })
    
    if (!response.ok) {
      throw new AIServiceError(response)
    }
    
    return response.json()
  }
}
```

#### 1.2 Update Tool Architecture
```typescript
// lib/editor/tools/base/AITool.ts
export abstract class AITool extends BaseTool {
  protected aiClient: AIServiceClient
  
  constructor() {
    super()
    this.aiClient = new AIServiceClient()
  }
  
  get isAvailable(): boolean {
    return this.aiClient.isConfigured && this.aiClient.isHealthy
  }
  
  protected showAISetupPrompt(): void {
    const isCloud = getDeploymentType() === 'cloud'
    
    showModal({
      title: 'AI Features',
      content: isCloud 
        ? 'Upgrade to Premium for AI features'
        : 'Configure AI service for this feature',
      actions: [
        {
          label: isCloud ? 'Upgrade' : 'Setup Guide',
          onClick: () => window.open(isCloud ? '/pricing' : '/docs/ai-setup')
        }
      ]
    })
  }
}
```

#### 1.3 Configuration System
```typescript
// lib/config/ai-service.ts
export function loadAIServiceConfig(): AIServiceConfig {
  // Cloud deployment - use our service
  if (process.env.NEXT_PUBLIC_DEPLOYMENT === 'cloud') {
    return {
      enabled: true,
      endpoint: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'https://ai-api.fotofun.app',
      apiKey: process.env.AI_SERVICE_KEY,
      timeout: 30000,
      maxFileSize: 50 * 1024 * 1024,
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp']
    }
  }
  
  // Self-hosted - check for user configuration
  const userEndpoint = process.env.NEXT_PUBLIC_AI_SERVICE_URL
  
  return {
    enabled: !!userEndpoint,
    endpoint: userEndpoint || '',
    apiKey: process.env.NEXT_PUBLIC_AI_SERVICE_KEY,
    timeout: parseInt(process.env.NEXT_PUBLIC_AI_SERVICE_TIMEOUT || '30000'),
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_AI_MAX_FILE_SIZE || '52428800'),
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp']
  }
}
```

### Phase 2: AI Service Development (Week 2)

#### 2.1 Service Architecture
```typescript
// ai-service/src/server.ts
import express from 'express'
import { ModelManager } from './models/ModelManager'
import { createEndpoints } from './endpoints'
import { authMiddleware, rateLimitMiddleware, corsMiddleware } from './middleware'

export class AIService {
  private app: express.Application
  private modelManager: ModelManager
  
  constructor() {
    this.app = express()
    this.modelManager = new ModelManager({
      cacheDir: process.env.MODEL_CACHE_DIR || './models',
      maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || '10737418240'), // 10GB
    })
    
    this.setupMiddleware()
    this.setupEndpoints()
  }
  
  private setupMiddleware() {
    this.app.use(corsMiddleware())
    this.app.use(authMiddleware())
    this.app.use(rateLimitMiddleware())
    this.app.use(express.json({ limit: '50mb' }))
  }
  
  private setupEndpoints() {
    const endpoints = createEndpoints(this.modelManager)
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        models: this.modelManager.getLoadedModels(),
        version: process.env.npm_package_version
      })
    })
    
    // AI endpoints
    this.app.post('/v1/remove-background', endpoints.removeBackground)
    this.app.post('/v1/upscale', endpoints.upscale)
    this.app.post('/v1/detect-objects', endpoints.detectObjects)
    this.app.post('/v1/estimate-depth', endpoints.estimateDepth)
    this.app.post('/v1/transfer-style', endpoints.transferStyle)
  }
}
```

#### 2.2 Model Management
```typescript
// ai-service/src/models/ModelManager.ts
import { pipeline, env } from '@xenova/transformers'

export class ModelManager {
  private models = new Map<string, any>()
  private loadingPromises = new Map<string, Promise<any>>()
  
  constructor(private config: ModelConfig) {
    // Configure transformers.js
    env.cacheDir = config.cacheDir
    env.localURL = config.localURL
  }
  
  async getModel(task: string, modelId: string): Promise<any> {
    const key = `${task}:${modelId}`
    
    // Return cached model
    if (this.models.has(key)) {
      return this.models.get(key)
    }
    
    // Return in-progress loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)
    }
    
    // Load new model
    const loadPromise = this.loadModel(task, modelId)
    this.loadingPromises.set(key, loadPromise)
    
    try {
      const model = await loadPromise
      this.models.set(key, model)
      this.loadingPromises.delete(key)
      return model
    } catch (error) {
      this.loadingPromises.delete(key)
      throw error
    }
  }
  
  private async loadModel(task: string, modelId: string): Promise<any> {
    console.log(`Loading model: ${modelId} for task: ${task}`)
    
    return await pipeline(task, modelId, {
      progress_callback: (progress: any) => {
        console.log(`Model loading progress: ${progress.status} - ${progress.progress}%`)
      }
    })
  }
}
```

#### 2.3 Endpoint Implementation
```typescript
// ai-service/src/endpoints/background.ts
export async function removeBackground(
  modelManager: ModelManager,
  req: Request,
  res: Response
) {
  try {
    // Validate input
    const { image, options = {} } = await parseMultipartRequest(req)
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' })
    }
    
    // Get model
    const model = await modelManager.getModel(
      'image-segmentation',
      options.model || 'Xenova/rmbg-1.4'
    )
    
    // Process image
    const imageData = await imageToTensor(image)
    const result = await model(imageData)
    
    // Apply mask to create transparent background
    const outputImage = await applySegmentationMask(image, result)
    
    // Return result
    res.set('Content-Type', 'image/png')
    res.send(outputImage)
    
  } catch (error) {
    console.error('Background removal error:', error)
    res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message 
    })
  }
}
```

### Phase 3: Tool Implementation (Week 3)

#### 3.1 Background Removal Tool
```typescript
// lib/editor/tools/ai/backgroundRemovalTool.ts
import { Scissors } from 'lucide-react'
import { AITool } from '../base/AITool'
import { TOOL_IDS } from '@/constants'

class BackgroundRemovalTool extends AITool {
  id = TOOL_IDS.BACKGROUND_REMOVAL
  name = 'Remove Background'
  icon = Scissors
  cursor = 'default'
  shortcut = 'B'
  
  protected setupTool(canvas: Canvas): void {
    if (!this.isAvailable) {
      this.showAISetupPrompt()
      return
    }
    
    this.subscribeToToolOptions(() => {
      const action = this.getOptionValue('action')
      
      if (action === 'remove') {
        this.removeBackground(canvas)
      } else if (action === 'restore') {
        this.restoreOriginal(canvas)
      }
    })
  }
  
  private async removeBackground(canvas: Canvas): Promise<void> {
    const loadingToast = showToast('Removing background...', { duration: Infinity })
    
    try {
      // Get current canvas as blob
      const imageBlob = await this.canvasToBlob(canvas)
      
      // Call AI service
      const resultBlob = await this.aiClient.removeBackground(imageBlob, {
        model: 'rmbg-1.4',
        returnMask: false,
        postProcessing: {
          smoothEdges: true,
          featherRadius: 2
        }
      })
      
      // Create new image from result
      const resultImage = await this.blobToFabricImage(resultBlob)
      
      // Add to canvas
      canvas.add(resultImage)
      canvas.setActiveObject(resultImage)
      canvas.renderAll()
      
      // Record for undo
      this.executeCommand(new AddObjectCommand(canvas, resultImage))
      
      loadingToast.dismiss()
      showToast('Background removed successfully!', { type: 'success' })
      
    } catch (error) {
      loadingToast.dismiss()
      
      if (error instanceof AIServiceNotConfiguredError) {
        this.showAISetupPrompt()
      } else {
        showToast('Failed to remove background', { type: 'error' })
        console.error('Background removal error:', error)
      }
    }
  }
}

export const backgroundRemovalTool = new BackgroundRemovalTool()
```

#### 3.2 AI Tool Adapter
```typescript
// lib/ai/adapters/tools/backgroundRemoval.ts
export class BackgroundRemovalAdapter extends BaseToolAdapter {
  tool = backgroundRemovalTool
  aiName = 'removeBackground'
  description = `Remove image background using AI. Common patterns:
  - "remove background" → execute removal
  - "extract subject" or "isolate person" → remove background
  - "make transparent" → remove background
  - "cut out the object" → remove background`
  
  inputSchema = z.object({
    execute: z.boolean().describe('Whether to execute background removal')
  })
  
  async execute(params: any, context: { canvas: Canvas }) {
    // Activate tool
    useToolStore.getState().setActiveTool(this.tool.id)
    
    // Trigger action
    useToolOptionsStore.getState().updateOption(this.tool.id, 'action', 'remove')
    
    return {
      success: true,
      message: 'Background removal initiated'
    }
  }
}
```

### Phase 4: Deployment & Documentation (Week 4)

#### 4.1 Docker Configuration for AI Service
```dockerfile
# ai-service/Dockerfile
FROM node:20-slim

# Install Python (required by some models)
RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create model cache directory
RUN mkdir -p /models

# Environment variables
ENV MODEL_CACHE_DIR=/models
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

#### 4.2 Self-Hosting Documentation
```markdown
# Self-Hosting AI Features

## Quick Start

### Option 1: Docker Compose (Recommended)

1. Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  fotofun-ai:
    image: fotofun/ai-service:latest
    ports:
      - "8080:8080"
    volumes:
      - ai-models:/models
    environment:
      - MODEL_CACHE_DIR=/models
      - MAX_WORKERS=4
      - API_KEY=your-secret-key # Optional
    restart: unless-stopped

volumes:
  ai-models:
```

2. Start the service:
```bash
docker-compose up -d
```

3. Configure FotoFun:
Add to your `.env.local`:
```
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8080/v1
NEXT_PUBLIC_AI_SERVICE_KEY=your-secret-key # If configured
```

### Option 2: Manual Setup

1. Clone the AI service:
```bash
git clone https://github.com/fotofun/ai-service
cd ai-service
```

2. Install dependencies:
```bash
npm install
```

3. Start the service:
```bash
npm start
```

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| MODEL_CACHE_DIR | Where to store downloaded models | ./models |
| MAX_WORKERS | Number of worker processes | 4 |
| API_KEY | Optional API key for authentication | none |
| MAX_FILE_SIZE | Maximum upload size | 50MB |
| CORS_ORIGINS | Allowed origins | * |

## Hardware Requirements

- **Minimum**: 4GB RAM, 10GB storage
- **Recommended**: 8GB RAM, 50GB storage, GPU (optional)
- **Models**: Each model is 20-200MB, cached after first use

## Security Considerations

1. **API Key**: Always set an API key in production
2. **CORS**: Restrict origins to your domain
3. **Rate Limiting**: Configure based on your needs
4. **HTTPS**: Use a reverse proxy with SSL
```

#### 4.3 Cloud Service Setup (Internal)
```typescript
// cloud-infrastructure/terraform/ai-service.tf
resource "kubernetes_deployment" "ai_service" {
  metadata {
    name = "fotofun-ai-service"
  }
  
  spec {
    replicas = 3
    
    selector {
      match_labels = {
        app = "ai-service"
      }
    }
    
    template {
      spec {
        container {
          image = "fotofun/ai-service:latest"
          
          resources {
            requests = {
              memory = "4Gi"
              cpu    = "2"
            }
            limits = {
              memory = "8Gi"
              cpu    = "4"
            }
          }
          
          volume_mount {
            name       = "model-cache"
            mount_path = "/models"
          }
        }
        
        volume {
          name = "model-cache"
          persistent_volume_claim {
            claim_name = "ai-models-pvc"
          }
        }
      }
    }
  }
}
```

### Phase 5: UI/UX Polish

#### 5.1 AI Feature Indicators
```typescript
// components/editor/ToolPalette/ToolButton.tsx
export function ToolButton({ tool }: { tool: Tool }) {
  const { isAvailable } = useAIService()
  const isAITool = tool instanceof AITool
  
  if (isAITool && !isAvailable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="tool-button opacity-50 cursor-help relative"
              onClick={() => showAISetupModal()}
            >
              {tool.icon}
              <Badge 
                variant="ai" 
                className="absolute -top-1 -right-1"
              >
                AI
              </Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold">AI Feature</p>
              <p className="text-sm">
                This feature requires an AI processing service.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="primary">
                  Use Cloud
                </Button>
                <Button size="sm" variant="outline">
                  Self-Host
                </Button>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  return <StandardToolButton tool={tool} />
}
```

#### 5.2 Setup Modal
```typescript
// components/modals/AISetupModal.tsx
export function AISetupModal() {
  const isCloud = useDeploymentType() === 'cloud'
  
  return (
    <Modal>
      <ModalHeader>
        <ModalTitle>Enable AI Features</ModalTitle>
      </ModalHeader>
      
      <ModalBody>
        {isCloud ? (
          <CloudUpgradePrompt />
        ) : (
          <SelfHostingGuide />
        )}
      </ModalBody>
    </Modal>
  )
}
```

## Success Metrics

1. **Performance**
   - AI service responds in <5s for standard images
   - Model loading cached after first use
   - Concurrent request handling

2. **Adoption**
   - Track % of self-hosted users who set up AI service
   - Monitor cloud AI feature usage
   - Conversion rate from free to premium

3. **Technical**
   - Zero AI dependencies in main bundle
   - Clean separation of concerns
   - Easy to add new AI models

## Future Enhancements

1. **Additional AI Models**
   - Image generation (Stable Diffusion)
   - Smart cropping
   - Content-aware fill
   - Style matching

2. **Performance Optimizations**
   - WebGPU support
   - Model quantization
   - Batch processing
   - Edge deployment

3. **Advanced Features**
   - Custom model training
   - Fine-tuning on user data
   - Plugin system for models

## Risk Mitigation

1. **Service Availability**
   - Graceful degradation
   - Clear error messages
   - Offline detection

2. **Cost Management**
   - Usage quotas
   - Rate limiting
   - Efficient caching

3. **Privacy Concerns**
   - Clear data handling policy
   - Local processing option
   - No data retention

---

## Epic Status: 📋 PLANNED

This epic establishes the foundation for advanced AI features while maintaining a clear separation between free and premium offerings. The architecture supports both cloud and self-hosted deployments with a focus on privacy and performance. 