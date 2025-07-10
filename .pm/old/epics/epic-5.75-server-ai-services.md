# Epic 5.75: Server-Hosted AI Services Architecture

## Overview

This epic establishes a scalable server-hosted AI services architecture that keeps the FotoFun app lightweight while enabling powerful AI features through API calls. All AI models are hosted on separate infrastructure, ensuring zero client-side bloat and consistent performance across all devices.

## Goals

1. **Zero client bloat** - No AI libraries or models in the main app
2. **Consistent performance** - Server-side processing works on any device
3. **Premium differentiation** - Cloud users get our hosted AI services
4. **Self-hosting support** - OSS users can run their own AI service containers
5. **Modular architecture** - Easy to add new models and features

## Architecture Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FotoFun Application (Lightweight)              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │   Core Tools    │    │    AI Tools      │                   │
│  │  (Local Only)   │    │  (API-Based)     │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                   │                              │
│                          ┌────────▼─────────┐                   │
│                          │  AI Service      │                   │
│                          │    Client        │                   │
│                          └────────┬─────────┘                   │
└───────────────────────────────────┼─────────────────────────────┘
                                    │ HTTPS API Calls
                                    │
                  ┌─────────────────┴─────────────────┐
                  │                                   │
     ┌────────────▼────────────┐      ┌─────────────▼────────────┐
     │   Hosted AI Services    │      │  Self-Hosted AI Services │
     │     (Our Infra)         │      │   (User's Infra)         │
     ├─────────────────────────┤      ├──────────────────────────┤
     │ • Multiple AI models    │      │ • Same models available  │
     │ • Auto-scaling          │      │ • Docker containers      │
     │ • GPU acceleration      │      │ • Full feature parity    │
     │ • Usage tracking        │      │ • Complete privacy       │
     └─────────────────────────┘      └──────────────────────────┘
```

### Service Architecture (Microservices)

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Services Gateway                        │
│                         (Load Balancer)                          │
└────────────────────────────┬───────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼─────────┐  ┌──────▼──────────┐  ┌─────▼──────────┐
│  Transformers   │  │     GFPGAN      │  │   Real-ESRGAN  │
│    Service      │  │    Service      │  │    Service     │
├─────────────────┤  ├─────────────────┤  ├────────────────┤
│ • Background    │  │ • Face enhance  │  │ • Upscaling    │
│   removal       │  │ • Beauty filter │  │ • 4x/8x scale  │
│ • Depth maps    │  │ • Restoration   │  │ • Denoise      │
│ • Segmentation  │  │                 │  │                │
└─────────────────┘  └─────────────────┘  └────────────────┘
        │                    │                    │
        └────────────────────┴────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Shared Cache   │
                    │   & Storage     │
                    └─────────────────┘
```

## Implementation Phases

### Phase 1: Foundation & First Model (Week 1)

#### 1.1 Common API Interface Design
```typescript
// Standard API contract for all AI services
interface AIServiceRequest {
  image: string // Base64 encoded
  format: 'jpeg' | 'png' | 'webp'
  options?: Record<string, any>
}

interface AIServiceResponse {
  success: boolean
  result?: {
    image: string // Base64 encoded
    format: string
    metadata?: Record<string, any>
  }
  error?: {
    code: string
    message: string
    details?: any
  }
  processingTime: number
}

// Common endpoints pattern
// POST /api/v1/{service}/{action}
// Examples:
// POST /api/v1/transformers/remove-background
// POST /api/v1/gfpgan/enhance-face
// POST /api/v1/realesrgan/upscale
```

#### 1.2 AI Service Client in App
```typescript
// lib/ai/service-client/index.ts
export class AIServiceClient {
  private baseUrl: string
  private apiKey?: string
  
  constructor(config: AIServiceConfig) {
    this.baseUrl = config.endpoint
    this.apiKey = config.apiKey
  }
  
  async removeBackground(imageBlob: Blob): Promise<Blob> {
    const base64 = await this.blobToBase64(imageBlob)
    
    const response = await this.request('/transformers/remove-background', {
      image: base64,
      format: this.getImageFormat(imageBlob),
      options: {
        model: 'rmbg-1.4',
        returnMask: false
      }
    })
    
    return this.base64ToBlob(response.result.image, response.result.format)
  }
  
  private async request(endpoint: string, data: AIServiceRequest): Promise<AIServiceResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new AIServiceError(await response.json())
    }
    
    return response.json()
  }
}
```

#### 1.3 First Service: Transformers.js Container
```dockerfile
# services/transformers/Dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Download models at build time for faster startup
RUN node scripts/download-models.js

EXPOSE 3000

CMD ["node", "src/index.js"]
```

```javascript
// services/transformers/src/index.js
import express from 'express'
import { pipeline } from '@xenova/transformers'

const app = express()
app.use(express.json({ limit: '50mb' }))

// Pre-load models
let backgroundRemover
let depthEstimator

async function initModels() {
  backgroundRemover = await pipeline('image-segmentation', 'Xenova/rmbg-1.4')
  depthEstimator = await pipeline('depth-estimation', 'Xenova/dpt-large')
}

app.post('/api/v1/transformers/remove-background', async (req, res) => {
  try {
    const { image, format, options } = req.body
    
    // Process image
    const result = await backgroundRemover(image)
    
    // Apply segmentation mask
    const processedImage = await applySegmentation(image, result)
    
    res.json({
      success: true,
      result: {
        image: processedImage,
        format: 'png',
        metadata: { model: 'rmbg-1.4' }
      },
      processingTime: Date.now() - startTime
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: error.message
      }
    })
  }
})

initModels().then(() => {
  app.listen(3000, () => {
    console.log('Transformers service ready on port 3000')
  })
})
```

### Phase 2: Tool Integration (Week 2)

#### 2.1 Background Removal Tool
```typescript
// lib/editor/tools/ai/backgroundRemovalTool.ts
export class BackgroundRemovalTool extends AIServiceTool {
  id = TOOL_IDS.BACKGROUND_REMOVAL
  name = 'Remove Background'
  icon = Scissors
  
  async execute(canvas: Canvas): Promise<void> {
    const loading = showLoadingToast('Removing background...')
    
    try {
      // Get canvas as blob
      const imageBlob = await this.canvasToBlob(canvas)
      
      // Call AI service
      const resultBlob = await this.aiClient.removeBackground(imageBlob)
      
      // Apply result to canvas
      const fabricImage = await this.blobToFabricImage(resultBlob)
      canvas.add(fabricImage)
      
      loading.success('Background removed!')
    } catch (error) {
      loading.error('Failed to remove background')
      this.handleAIError(error)
    }
  }
}
```

#### 2.2 AI Tool Adapter
```typescript
// lib/ai/adapters/tools/backgroundRemoval.ts
export class BackgroundRemovalAdapter extends BaseToolAdapter {
  tool = backgroundRemovalTool
  aiName = 'removeBackground'
  description = 'Remove image background. Say "remove background" or "cut out subject"'
  
  inputSchema = z.object({
    execute: z.boolean()
  })
  
  async execute(params: any, context: any) {
    await this.activateTool()
    await this.tool.execute(context.canvas)
    
    return {
      success: true,
      message: 'Background removed successfully'
    }
  }
}
```

### Phase 3: Additional Services & Features (Week 3)

#### 3.1 Service Expansion Plan
```yaml
# docker-compose.yml for self-hosters
version: '3.8'

services:
  gateway:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - transformers
      - gfpgan
      - realesrgan
  
  transformers:
    image: fotofun/ai-transformers:latest
    environment:
      - MODEL_CACHE=/models
    volumes:
      - models:/models
  
  gfpgan:
    image: fotofun/ai-gfpgan:latest
    environment:
      - MODEL_PATH=/models/gfpgan
    volumes:
      - models:/models
  
  realesrgan:
    image: fotofun/ai-realesrgan:latest
    environment:
      - MODEL_PATH=/models/realesrgan
    volumes:
      - models:/models

volumes:
  models:
```

#### 3.2 Feature Roadmap
```typescript
// Future AI features and their services
const AI_FEATURES = {
  // Phase 1 (Transformers.js)
  backgroundRemoval: {
    service: 'transformers',
    endpoint: '/remove-background',
    model: 'rmbg-1.4'
  },
  depthEstimation: {
    service: 'transformers',
    endpoint: '/estimate-depth',
    model: 'dpt-large'
  },
  objectDetection: {
    service: 'transformers',
    endpoint: '/detect-objects',
    model: 'detr-resnet-50'
  },
  
  // Phase 2 (GFPGAN)
  faceEnhancement: {
    service: 'gfpgan',
    endpoint: '/enhance-face',
    model: 'GFPGANv1.4'
  },
  beautyFilter: {
    service: 'gfpgan',
    endpoint: '/beauty-filter',
    model: 'GFPGANv1.4'
  },
  
  // Phase 3 (Real-ESRGAN)
  imageUpscale: {
    service: 'realesrgan',
    endpoint: '/upscale',
    model: 'RealESRGAN_x4plus'
  },
  
  // Phase 4 (LaMa)
  smartErase: {
    service: 'lama',
    endpoint: '/inpaint',
    model: 'lama'
  },
  
  // Phase 5 (Stable Diffusion - Premium only)
  aiGeneration: {
    service: 'stable-diffusion',
    endpoint: '/generate',
    model: 'stable-diffusion-xl'
  }
}
```

### Phase 4: Deployment & Documentation (Week 4)

#### 4.1 Cloud Deployment (Our Infrastructure)
```yaml
# kubernetes/ai-services.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-transformers
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-transformers
  template:
    spec:
      containers:
      - name: transformers
        image: fotofun/ai-transformers:latest
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
            nvidia.com/gpu: 1  # GPU for faster processing
        env:
        - name: MAX_CONCURRENT_REQUESTS
          value: "10"
        - name: REQUEST_TIMEOUT
          value: "30000"
```

#### 4.2 Self-Hosting Documentation
```markdown
# Self-Hosting AI Services

## Quick Start

1. **Download the AI services package:**
```bash
curl -L https://github.com/fotofun/ai-services/releases/latest/download/fotofun-ai.tar.gz | tar xz
cd fotofun-ai
```

2. **Start services with Docker Compose:**
```bash
# For CPU-only (slower but works everywhere)
docker-compose -f docker-compose.cpu.yml up -d

# For GPU acceleration (requires NVIDIA Docker)
docker-compose -f docker-compose.gpu.yml up -d
```

3. **Configure FotoFun:**
Add to your `.env.local`:
```
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8080
NEXT_PUBLIC_AI_SERVICE_KEY=your-secret-key  # Optional but recommended
```

4. **Verify installation:**
```bash
curl http://localhost:8080/health
```

## Available Services

| Service | Features | Model Size | RAM Required |
|---------|----------|------------|--------------|
| Transformers | Background removal, depth estimation | ~200MB | 2GB |
| GFPGAN | Face enhancement, beauty filters | ~300MB | 3GB |
| Real-ESRGAN | Image upscaling (4x/8x) | ~65MB | 2GB |
| LaMa | Smart object removal | ~200MB | 2GB |

## Performance Tips

- **CPU Mode**: Expect 5-15 seconds per operation
- **GPU Mode**: 0.5-3 seconds per operation
- **Caching**: Models are cached after first use
- **Scaling**: Add more replicas for concurrent users

## Security

Always use HTTPS in production:
```nginx
server {
    listen 443 ssl;
    server_name ai.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
```

## Success Metrics

1. **Performance**
   - API response time <5s for standard operations
   - Support for concurrent requests
   - Graceful handling of large images

2. **Adoption**
   - Track self-hosted installations
   - Monitor API usage patterns
   - Feature adoption rates

3. **Technical**
   - Zero AI code in client bundle
   - Clean microservices architecture
   - Easy addition of new models

## Risk Mitigation

1. **Service Availability**
   - Health checks and auto-restart
   - Graceful degradation in UI
   - Clear error messages

2. **Resource Management**
   - Request queuing
   - Memory limits
   - Automatic cleanup

3. **Privacy & Security**
   - No image storage by default
   - Optional API authentication
   - Self-hosting for full privacy

---

## Epic Status: 📋 PLANNED

This epic establishes a server-hosted AI architecture that keeps the app lightweight while enabling powerful AI features. Starting with Transformers.js for background removal, the modular design allows easy expansion with additional models and features. 