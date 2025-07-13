# 🎨 FotoFun: The Next-Gen Photoshop Built for the AI Era

> **We're building the future of photo editing - and it's completely free and open source.**

## ⚡ What Works Today
- **32+ Professional Tools** - Complete editing suite from selection to filters
- **AI-Powered Everything** - Natural language control of all tools
- **Replicate Integration** - Image generation, background removal, upscaling
- **Modern Architecture** - Next.js 15, React 19, TypeScript, Fabric.js v6
- **No Subscriptions** - Forever free and open source

## 🚀 Getting Started

### Prerequisites
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime & package manager
- **Git** - Version control

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/foto-fun
cd foto-fun
```

2. **Install dependencies**
```bash
bun install
```

3. **Set up environment variables**
```bash
# Copy the example file
cp .env.example .env.local

# Then edit .env.local with your actual values
```

4. **Run development commands**
```bash
bun lint          # Check code quality
bun typecheck     # Check types
bun run build     # Build for production
bun dev           # Start dev server
```

---

## 🚀 The Problem: Photo Editing is Broken

### The Status Quo is Failing Creators

**Adobe Photoshop**: Bloated. Expensive. Closed.
- 💸 $240-660/year subscription
- 🗑️ 30+ years of legacy features you'll never use
- 🔒 Closed-source black box
- 🖥️ Desktop-only dinosaur
- 🤖 AI? What AI?

**Photopea**: Better, but not good enough.
- ⚠️ Still proprietary at its core
- 🚫 No plugin ecosystem
- 📉 Stuck with yesterday's tech
- 🔌 Can't add new AI models
- 📦 Not truly extensible

## 💡 Our Spiky POV: Non-Consensus Truths

### 1. **"Professional" doesn't mean "complicated"**
The industry believes complexity equals capability. We believe AI can make professional tools accessible to everyone.

### 2. **Closed platforms are dead platforms**
While others protect their code, we believe openness creates exponential value. Every new AI model makes closed platforms more obsolete.

### 3. **The browser is the new OS**
Desktop software is a relic. The future is instant, collaborative, and runs everywhere.

### 4. **AI should be a collaborator, not a feature**
Others bolt on AI. We built an AI assistant that understands and can use every single tool.

### 5. **Community > Company**
Photoshop has Adobe. FotoFun has everyone. Which will innovate faster?

## 👥 Who We're Building For

### Sarah Chen - The Overworked Designer
*"I spend $55/month on Photoshop and still need 5 other AI tools"*

**Pain Points:**
- Switching between Photoshop, Midjourney, and Upscalers
- Repetitive tasks eating creative time
- Team can't collaborate in real-time
- Subscription fatigue

**FotoFun Solution:** One platform. AI handles the boring stuff. 32+ professional tools. Free forever.

### Marcus Rodriguez - The Content Creator
*"I just need to edit thumbnails, not learn rocket science"*

**Pain Points:**
- Photoshop's learning curve is insane
- Can't edit on the go
- Batch processing is a nightmare
- AI tools cost extra

**FotoFun Solution:** Tell the AI what you want in plain English. Edit from any device. Batch process with one command.

### Jennifer Park - The Entrepreneur
*"I can't justify $600/year for product photos"*

**Pain Points:**
- Professional editing costs too much
- Hiring designers is expensive
- Need consistency across products
- Time is money

**FotoFun Solution:** AI assistant guides you. Templates ensure consistency. Self-host for $0/month.

## 🎯 User Stories That Drive Us

> "As a **beginner**, I want to **describe edits in plain English** so **I don't need a design degree**"

> "As a **professional**, I want to **extend the platform with my own tools** so **it fits my exact workflow**"

> "As a **team**, we want to **edit together in real-time** so **we ship faster**"

> "As a **developer**, I want to **add the latest AI models** so **my tools never become obsolete**"

## 🔥 The FotoFun Difference

### Built-in AI Assistant That Actually Helps
```
You: "Make the sunset more dramatic and remove the people in the background"
AI: *Analyzes image, adjusts colors, removes people, shows you the result*
```

Our AI doesn't just suggest - it DOES. It can use every tool, understand context, and learn your style.

### Agentic Workflows: AI That Thinks

**Orchestrator-Worker Pattern**
- Orchestrator AI plans the workflow
- Worker agents execute in parallel
- 10x faster than sequential editing

**Evaluator-Optimizer Pattern**
- AI evaluates results against your intent
- Automatically optimizes until perfect
- No more "close enough"

### Extensibility That Changes Everything

**Create Your Own Tools**
```javascript
// It's this easy to add a new tool
export class CustomFilter extends BaseTool {
  execute(canvas, params) {
    // Your innovation here
  }
}
```

**Host Your Own AI Models**
```yaml
# docker-compose.yml
services:
  background-removal:
    image: your-model:latest
    ports:
      - "8001:8000"
```

**Share With The World**
- Publish to plugin marketplace
- Monetize your creations
- Build on others' work

## 🛠️ Features That Ship Today

### ✅ Complete (Epic 1 & 5)
- **32+ Professional Tools**: Complete suite of editing tools
  - **6 Selection Tools**: Move, Rectangular/Elliptical Marquee, Lasso, Magic Wand, Quick Selection
  - **6 Transform Tools**: Crop, Rotate, Flip, Resize, Hand, Zoom
  - **2 Drawing Tools**: Brush (Eraser removed)
  - **4 Text Tools**: Horizontal/Vertical Type, Type Mask, Type on Path
  - **6 Adjustment Tools**: Brightness, Contrast, Saturation, Hue, Exposure, Color Temperature
  - **5 Filter Tools**: Blur, Sharpen, Grayscale, Sepia, Invert
  - **1 Utility Tool**: Eyedropper
  - **2 AI-Native Tools**: Image Generation, Image Transformation
- **AI-Powered Adjustments**: All adjustment and filter tools with AI integration
- **Natural Language Editing**: Describe what you want in plain English
- **Infinite Undo/Redo**: Never lose work with full command history
- **Layer System**: Complete layer management with visibility, opacity, blending
- **Selection System**: Pixel-perfect selections with boolean operations

### ✅ AI Features (Working via Replicate API)
- **AI Image Generation**: Create images from text using Stable Diffusion XL
- **AI Background Removal**: Remove backgrounds using Bria's model
- **AI Image Upscaling**: 2x/4x upscaling with Google's upscaler
- **AI Inpainting**: Remove objects and fill with AI
- **AI Chat Assistant**: Natural language control of all tools
- **Orchestrator-Worker Pattern**: AI plans workflows, tools execute

### 🚧 Building Now (Epic 2 - 85% Complete)
- **Advanced Typography**: 4 text tools working, effects system implemented
- **Text Effects**: Drop shadows, strokes, glows, gradients, presets
- **Google Fonts Integration**: Dynamic font loading with search

### 🔮 Coming Soon (Epic 3-16)
- **Vector Tools**: Shapes, paths, bezier curves
- **Healing & Cloning**: Content-aware repairs
- **Real-time Collaboration**: Edit together, ship faster
- **Plugin System**: Community extensions and custom tools
- **Visual Workflow Builder**: Drag-drop automation
- **Version Control**: Git for images
- **Mobile Apps**: Edit anywhere

## 🏗️ Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│   AI Assistant  │────▶│ Canvas (Fabric) │
│   React 19      │     │  (Orchestrator) │     │   TypeScript    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  32+ Tools      │     │   Tool Adapters │     │     Zustand     │
│  Canvas + AI    │     │   AI Integration│     │  State Mgmt     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Command System  │     │ Replicate API   │     │   Supabase      │
│  Undo/Redo     │     │  AI Models      │     │  Auth/Data      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Current Implementation
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Canvas**: Fabric.js v6 with 32+ professional tools
- **AI Integration**: Replicate API for image generation, background removal, upscaling
- **State Management**: Zustand stores with command pattern
- **Architecture**: Tool adapters make any tool AI-compatible
- **Database**: Supabase (PostgreSQL) for auth and data

## 💰 Business Model: Radically Fair

### Open Source (Forever Free)
- ✅ All features
- ✅ Self-host anywhere
- ✅ Unlimited usage
- ✅ Modify anything
- ❌ Our infrastructure costs

### Cloud (For Convenience)
- Free tier: 100 edits/month
- Pro: $15/month - Unlimited + priority AI
- Team: $30/user - Real-time collab + SSO
- Enterprise: Custom pricing + support

**Why this works**: We bet that making the best product free will create more value than protecting it ever could.

## 🌍 Why This Matters

### The Old Way is Dying
- Adobe's stock price can't save their bloated software
- Photopea can't add features fast enough
- New AI models launch weekly - closed platforms can't keep up

### The Future is Open
- **Today**: We have 15 working AI tools
- **Tomorrow**: The community adds 150 more
- **Next Year**: 1,500 tools, models we haven't imagined yet

### You Own Your Tools
- No subscription hostage situation
- No platform risk
- No "sorry, we're shutting down"
- Your tools, your data, your future

## 🚦 Our Unique Insight

> **Closed platforms optimize for extraction. Open platforms optimize for creation.**

Every other photo editor is trying to lock you in. We're trying to set you free. They see users as revenue. We see users as co-creators. They fear commoditization. We embrace it.

**The result?** While they protect yesterday's features, we're building tomorrow's platform.

## 🎯 Product-Market Fit Indicators

### We Win When:
1. **Designers** say "I can finally cancel my Adobe subscription"
2. **Beginners** say "I made something beautiful in 5 minutes"
3. **Developers** say "I built a plugin that does X"
4. **Teams** say "We ship 2x faster now"
5. **The Industry** says "How is this free?"

### Early Signals:
- 🌟 1,000+ GitHub stars in first month
- 🔌 50+ community plugins by month 3
- 👥 10,000 MAU by month 6
- 💬 "This is what Photoshop should have been"

## 🏁 Get Started

```bash
# Clone the revolution
git clone https://github.com/yourusername/foto-fun
cd foto-fun

# Install the future
npm install

# Run your own Photoshop
npm run dev

# Visit http://localhost:3000
# Start creating
```

## 🤝 Join the Movement

This isn't just software. It's a statement:
- Creativity should be accessible
- Tools should be transparent
- Communities should own their platforms
- The future should be open

**Follow along as we build this in public. Every commit is a step toward democratizing creativity.**

### Ways to Contribute:
- 🐛 [Report bugs](https://github.com/yourusername/foto-fun/issues)
- 💡 [Suggest features](https://github.com/yourusername/foto-fun/discussions)
- 🔧 [Submit PRs](https://github.com/yourusername/foto-fun/pulls)
- 🔌 [Build plugins](https://docs.fotofun.app/plugins)
- 🌟 [Star the repo](https://github.com/yourusername/foto-fun)
- 📢 [Spread the word](https://twitter.com/intent/tweet?text=Check%20out%20FotoFun%20-%20the%20open-source%20Photoshop%20alternative)

## 👥 Contributors - Team ZAM

### Mitch
**GitHub:** [https://github.com/MitchForest](https://github.com/MitchForest)  
**X:** [https://x.com/MitchForest](https://x.com/MitchForest)  

### Andrew

### Zaqir
**GitHub:** [https://github.com/ZakirG](https://github.com/ZakirG)  
**X:** [https://x.com/jaguarsoftio](https://x.com/jaguarsoftio)  



---

*Want to see your name here? [Contribute to FotoFun](https://github.com/yourusername/foto-fun/blob/main/CONTRIBUTING.md) and help us democratize creativity!*

## 🛠️ How to Contribute

**We absolutely love our open source community!** Every contribution, big or small, helps democratize creativity and makes professional photo editing accessible to everyone. Here's how you can get involved:

### ⚠️ Important Architectural Note for Contributors

**Performance Considerations**: The current implementation using Fabric.js may need significant architectural changes for optimal performance, particularly for selected-region editing operations. We're currently using CPU-intensive pixel manipulation which can be slow for complex operations.

**Recommended Future Direction**: 
- Consider migrating to **WebGL-based rendering** for all image editing operations
- **Konva.js** might be a better foundation than Fabric.js for performance-critical operations
- The app may benefit from being rebuilt with a WebGL-first architecture to handle large images and complex selections efficiently

This is a great opportunity for contributors interested in high-performance graphics programming and canvas optimization. If you're passionate about making photo editing truly fast and responsive, this could be your contribution to the project!

### 🔑 Setting Up Your Development Environment

#### 1. **Configure Your API Keys**
FotoFun integrates with multiple AI services. Set up your `.env.local` file:

```bash
# Copy the example environment file
cp .env.example .env.local

# Add your API keys
REPLICATE_API_TOKEN=your_replicate_token_here
OPENAI_API_KEY=your_openai_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

#### 2. **Get Your Replicate API Key**
1. Sign up at [Replicate.com](https://replicate.com)
2. Go to your [Account Settings](https://replicate.com/account/api-tokens)
3. Create a new API token
4. Add it to your `.env.local` file

### 🚀 Adding Your Own Replicate Models

#### **Quick Integration Guide**

**Step 1: Add Your Model Endpoint**
```typescript
// In lib/ai/server/replicateClient.ts
export const YOUR_MODEL_ENDPOINT = "your-username/your-model:version-hash";

export async function runYourModel(input: YourInputType) {
  return await replicate.run(YOUR_MODEL_ENDPOINT, { input });
}
```

**Step 2: Create an API Route**
```typescript
// In app/api/ai/your-feature/route.ts
import { runYourModel } from '@/lib/ai/server/replicateClient';

export async function POST(request: Request) {
  const { imageData, parameters } = await request.json();
  
  const result = await runYourModel({
    image: imageData,
    ...parameters
  });
  
  return Response.json({ result });
}
```

**Step 3: Add a Canvas Tool**
```typescript
// In lib/ai/tools/yourFeature.ts
export class YourFeatureTool extends BaseTool {
  async execute(params: YourParams) {
    const response = await fetch('/api/ai/your-feature', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    
    return await response.json();
  }
}
```

---

**Remember: Every line of code you contribute makes professional creativity more accessible to millions of people worldwide. That's the impact of open source!**

## 📜 License

MIT - Because freedom matters.

---

**Built with ❤️ by creators, for creators.**

*The next-gen Photoshop is here. It's open. It's free. It's yours.*

#OpenSource #PhotoEditing #AI #WebDevelopment #CreativeTools