# Cloud vs Self-Hosted Deployment Guide

## Overview

FotoFun supports two deployment modes designed for different user needs:

- **☁️ Cloud Version**: Hosted service with authentication, billing, and managed infrastructure
- **🏠 Self-Hosted Version**: Open source application that users run on their own infrastructure

This document details the architecture, setup, and key differences between these deployment modes.

---

## 🏗️ **Architecture Comparison**

### **Cloud Version Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Browser  │    │  Vercel/Railway │    │    Supabase     │
│                 │    │                 │    │                 │
│ - React App     │◄──►│ - Next.js App   │◄──►│ - Auth          │
│ - IndexedDB     │    │ - API Routes    │    │ - PostgreSQL    │
│ - LocalStorage  │    │ - Middleware    │    │ - Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │   AI Services   │
                       │                 │
                       │ - OpenAI API    │
                       │ - Replicate API │
                       └─────────────────┘
```

### **Self-Hosted Version Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Browser  │    │  User's Server  │    │  User's Choice  │
│                 │    │                 │    │                 │
│ - React App     │◄──►│ - Next.js App   │◄──►│ - SQLite/None   │
│ - IndexedDB     │    │ - No Auth       │    │ - File System   │
│ - LocalStorage  │    │ - No Billing    │    │ - Local Config  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │   AI Services   │
                       │                 │
                       │ - User's Keys   │
                       │ - Self-hosted   │
                       └─────────────────┘
```

---

## ☁️ **Cloud Version Details**

### **Features Included**
- ✅ **User Authentication** (Supabase Auth)
- ✅ **Cloud Storage** (Supabase Storage)  
- ✅ **Team Workspaces** (Multi-tenant)
- ✅ **Usage Analytics** (PostHog/Mixpanel)
- ✅ **Billing System** (Stripe)
- ✅ **AI Generation** (Managed API keys)
- ✅ **Real-time Collaboration** (Supabase Realtime)
- ✅ **Automatic Backups** (Managed)

### **Database Schema (Cloud)**
```sql
-- User profiles linked to Supabase Auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences stored in database
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example preferences structure
{
  "theme": "dark",
  "defaultTools": ["move", "crop", "frame"],
  "aiSettings": {
    "stepByStepMode": "complex-only",
    "autoApproveThreshold": 0.8,
    "showConfidenceScores": true
  },
  "exportPresets": [
    {"name": "Instagram", "width": 1080, "height": 1080, "format": "jpeg"},
    {"name": "4K", "width": 3840, "height": 2160, "format": "png"}
  ],
  "canvasSettings": {
    "defaultZoom": 100,
    "snapToGrid": true,
    "showRulers": false
  }
}

-- Team workspaces (cloud-only)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription management (cloud-only)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Project Storage (Cloud)**
```typescript
// Cloud users can choose storage method
interface CloudProjectStorage {
  // Option 1: Local storage (fast, private)
  local: {
    storage: 'browser-indexeddb',
    autoSave: true,
    maxProjects: 50
  },
  
  // Option 2: Cloud storage (sync, backup)
  cloud: {
    storage: 'supabase-storage',
    autoSync: true,
    versionHistory: true,
    sharing: true
  }
}
```

---

## 🏠 **Self-Hosted Version Details**

### **Features Removed/Modified**

#### **❌ Completely Removed**
```typescript
// These directories/files are excluded from self-hosted package
app/auth/                    // Sign-in/sign-up pages
app/api/auth/               // Auth API routes
app/billing/                // Billing and subscription pages
app/team/                   // Team management
middleware.ts               // Route protection
lib/auth/                   // Auth utilities
lib/billing/                // Stripe integration
lib/analytics/              // Usage tracking
components/auth/            // Auth UI components
components/billing/         // Billing components
```

#### **🔄 Modified Features**
```typescript
// AI Features - conditional based on API keys
const aiFeatures = {
  chat: {
    available: true,
    enabled: !!process.env.OPENAI_API_KEY,
    setupMessage: 'Add OPENAI_API_KEY to .env.local to enable AI chat'
  },
  backgroundRemoval: {
    available: true,
    enabled: !!process.env.REPLICATE_API_KEY,
    setupMessage: 'Add REPLICATE_API_KEY to .env.local to enable background removal'
  },
  imageGeneration: {
    available: false, // Too expensive for self-hosted
    reason: 'Requires managed API key limits'
  }
}

// Landing page simplified
const landingPage = {
  pricing: 'hidden',           // No pricing section
  testimonials: 'simplified',  // Generic testimonials
  features: 'full',           // All features shown
  cta: 'Get Started',         // Direct to editor
}
```

### **User Preferences (Self-Hosted)**

#### **Option 1: File-Based (Recommended)**
```typescript
// lib/config/preferences.ts
interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  defaultTools: string[]
  aiSettings: AISettings
  exportPresets: ExportPreset[]
  canvasSettings: CanvasSettings
}

// Storage locations (in order of priority)
const preferencesPaths = [
  './config/user-preferences.json',     // Project-specific
  '~/.foto-fun/preferences.json',       // User home directory
  process.env.FOTO_FUN_CONFIG,          // Environment variable
]

// Implementation
class FilePreferencesManager {
  private preferencesPath: string
  
  constructor() {
    this.preferencesPath = this.findPreferencesFile()
  }
  
  async load(): Promise<UserPreferences> {
    try {
      const data = await fs.readFile(this.preferencesPath, 'utf8')
      return { ...defaultPreferences, ...JSON.parse(data) }
    } catch {
      return defaultPreferences
    }
  }
  
  async save(preferences: UserPreferences): Promise<void> {
    await fs.writeFile(this.preferencesPath, JSON.stringify(preferences, null, 2))
  }
  
  // Auto-save on changes with debouncing
  private debouncedSave = debounce(this.save.bind(this), 1000)
}
```

#### **Option 2: SQLite (If Database Needed)**
```typescript
// lib/db/sqlite-client.ts
import Database from 'better-sqlite3'

const db = new Database('./foto-fun.db')

// Simple preferences table
db.exec(`
  CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

class SQLitePreferencesManager {
  save(key: string, value: any) {
    const stmt = db.prepare('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)')
    stmt.run(key, JSON.stringify(value))
  }
  
  load(key: string, defaultValue: any = null) {
    const stmt = db.prepare('SELECT value FROM preferences WHERE key = ?')
    const row = stmt.get(key)
    return row ? JSON.parse(row.value) : defaultValue
  }
}
```

### **Project Storage (Self-Hosted)**
```typescript
// Projects always stored locally for self-hosted
interface SelfHostedProjectStorage {
  storage: 'browser-indexeddb',
  autoSave: true,
  maxProjects: 100, // No cloud limits
  export: {
    formats: ['.fotofun', '.json'],
    location: 'downloads'
  },
  import: {
    dragDrop: true,
    fileInput: true
  }
}
```

---

## 📦 **Distribution Strategy**

### **Hybrid Distribution Approach**

#### **Primary: NPM Package (Recommended)**
```bash
# Instant setup for users
npx create-foto-fun@latest my-editor
cd my-editor

# Configure (optional - only for AI features)
cp .env.example .env.local
# Add API keys if desired

# Run
bun dev
```

**Package Structure:**
```
create-foto-fun/
├── template/                 # Clean template without cloud features
│   ├── app/
│   │   ├── (editor)/        # Editor routes only
│   │   ├── api/             # No auth routes
│   │   └── globals.css
│   ├── components/
│   │   ├── editor/          # All editor components
│   │   ├── ui/              # Base UI components
│   │   └── (no auth/)       # Auth components excluded
│   ├── lib/
│   │   ├── editor/          # Editor logic
│   │   ├── ai/              # AI features (conditional)
│   │   └── (no auth/)       # Auth logic excluded
│   ├── .env.example         # Template environment file
│   ├── package.json         # Dependencies for self-hosted
│   └── README.md            # Self-hosted setup guide
├── bin/
│   └── create-foto-fun.js   # CLI script
└── package.json             # Package metadata
```

**CLI Implementation:**
```typescript
// bin/create-foto-fun.js
#!/usr/bin/env node

import { program } from 'commander'
import fs from 'fs-extra'
import path from 'path'

program
  .argument('<project-name>', 'Name of the project')
  .option('--template <template>', 'Template to use', 'default')
  .action(async (projectName, options) => {
    const projectPath = path.resolve(projectName)
    
    // Copy template files
    await fs.copy(
      path.join(__dirname, '../template'),
      projectPath,
      { filter: excludeCloudFiles }
    )
    
    // Update package.json
    const packageJson = await fs.readJson(path.join(projectPath, 'package.json'))
    packageJson.name = projectName
    await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 })
    
    console.log(`✅ Created ${projectName}`)
    console.log(`📁 cd ${projectName}`)
    console.log(`📦 bun install`)
    console.log(`🚀 bun dev`)
  })

function excludeCloudFiles(src: string): boolean {
  const cloudOnlyPaths = [
    '/app/auth/',
    '/app/billing/',
    '/app/team/',
    '/middleware.ts',
    '/lib/auth/',
    '/lib/billing/',
    '/components/auth/',
    '/components/billing/'
  ]
  
  return !cloudOnlyPaths.some(path => src.includes(path))
}
```

#### **Secondary: Fork-Friendly Repository**
```bash
# For developers who want full control
git clone https://github.com/your-org/foto-fun
cd foto-fun

# Self-hosted setup
cp .env.example .env.local
bun install
bun dev
```

**Repository Structure:**
```
foto-fun/                    # Main repository
├── app/                     # Full app (cloud + self-hosted)
├── components/              # All components
├── lib/                     # All libraries
├── docs/                    # Documentation
├── scripts/
│   ├── build-cloud.js       # Build cloud version
│   └── build-self-hosted.js # Build self-hosted package
├── .env.example             # Environment template
└── package.json             # Full dependencies
```

### **Build Process**

#### **Cloud Build (Vercel/Railway)**
```typescript
// scripts/build-cloud.js
export default {
  name: 'cloud',
  include: ['**/*'],                    // Include everything
  env: {
    NEXT_PUBLIC_DEPLOYMENT: 'cloud',
    NEXT_PUBLIC_ENABLE_AUTH: 'true',
    NEXT_PUBLIC_ENABLE_BILLING: 'true'
  }
}
```

#### **Self-Hosted Package Build**
```typescript
// scripts/build-self-hosted.js
export default {
  name: 'self-hosted',
  exclude: [
    'app/auth/**',
    'app/billing/**',
    'app/team/**',
    'middleware.ts',
    'lib/auth/**',
    'lib/billing/**',
    'components/auth/**',
    'components/billing/**'
  ],
  env: {
    NEXT_PUBLIC_DEPLOYMENT: 'self-hosted',
    NEXT_PUBLIC_ENABLE_AUTH: 'false',
    NEXT_PUBLIC_ENABLE_BILLING: 'false'
  },
  transforms: [
    // Remove auth middleware
    {
      file: 'next.config.js',
      remove: ['authMiddleware']
    },
    // Update landing page
    {
      file: 'app/page.tsx',
      replace: {
        'PricingSection': 'SelfHostedSection',
        'AuthButton': 'GetStartedButton'
      }
    }
  ]
}
```

---

## 🚀 **Setup Instructions**

### **Self-Hosted Installation**

#### **Option 1: NPM Package (Easiest)**
```bash
# 1. Create new project
npx create-foto-fun@latest my-photo-editor
cd my-photo-editor

# 2. Install dependencies
bun install

# 3. Optional: Add AI features
cp .env.example .env.local
# Edit .env.local and add:
# OPENAI_API_KEY=sk-...
# REPLICATE_API_KEY=r8_...

# 4. Start development
bun dev

# 5. Build for production
bun build

# 6. Start production server
bun start
```

#### **Option 2: Git Clone (For Developers)**
```bash
# 1. Clone repository
git clone https://github.com/your-org/foto-fun
cd foto-fun

# 2. Switch to self-hosted mode
export FOTO_FUN_MODE=self-hosted

# 3. Install dependencies
bun install

# 4. Optional: Configure AI
cp .env.example .env.local
# Add API keys as above

# 5. Start development
bun dev
```

### **Docker Setup (Self-Hosted)**
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  foto-fun:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_DEPLOYMENT=self-hosted
    volumes:
      - ./config:/app/config
      - ./data:/app/data
    restart: unless-stopped
```

### **Environment Configuration**

#### **Cloud Environment**
```bash
# .env (cloud)
NEXT_PUBLIC_DEPLOYMENT=cloud
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Server-side
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk-...
REPLICATE_API_KEY=r8_...
```

#### **Self-Hosted Environment**
```bash
# .env.local (self-hosted)
NEXT_PUBLIC_DEPLOYMENT=self-hosted

# Optional: AI features
OPENAI_API_KEY=sk-...
REPLICATE_API_KEY=r8_...

# Optional: Analytics (self-hosted)
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

---

## 🔧 **Feature Comparison**

| Feature | Cloud | Self-Hosted | Notes |
|---------|-------|-------------|-------|
| **Core Editor** | ✅ | ✅ | Identical functionality |
| **50+ Tools** | ✅ | ✅ | All tools work the same |
| **AI Chat** | ✅ | ✅* | *Requires user API key |
| **AI Background Removal** | ✅ | ✅* | *Requires user API key |
| **AI Face Enhancement** | ✅ | ✅* | *Requires user API key |
| **AI Image Generation** | ✅ | ❌ | Too expensive for self-hosted |
| **User Authentication** | ✅ | ❌ | Single-user mode |
| **Team Workspaces** | ✅ | ❌ | Cloud infrastructure required |
| **Cloud Storage** | ✅ | ❌ | Local storage only |
| **Real-time Collaboration** | ✅ | ❌ | Requires cloud infrastructure |
| **Usage Analytics** | ✅ | ❌ | Privacy-first approach |
| **Automatic Updates** | ✅ | Manual | User controls updates |
| **Project Files** | Local + Cloud | Local Only | .fotofun files work the same |
| **Export Formats** | ✅ | ✅ | All formats supported |
| **Plugin System** | ✅ | ✅ | Same extensibility |
| **Custom Themes** | ✅ | ✅ | Same theming system |

---

## 🎯 **User Experience Comparison**

### **Cloud User Journey**
1. **Visit website** → **Sign up** → **Choose plan**
2. **Access editor** → **All features enabled**
3. **Create projects** → **Auto-saved to cloud**
4. **Invite team members** → **Real-time collaboration**
5. **Usage tracked** → **Billing automated**

### **Self-Hosted User Journey**
1. **Run `npx create-foto-fun`** → **Instant setup**
2. **Access editor** → **All core features work**
3. **Add API keys** → **AI features unlock**
4. **Create projects** → **Saved locally**
5. **Share via export** → **Manual file sharing**

---

## 🔒 **Security & Privacy**

### **Cloud Version**
- ✅ **SOC 2 compliant** infrastructure
- ✅ **Data encryption** at rest and in transit
- ✅ **Regular security audits**
- ⚠️ **Data stored on our servers**

### **Self-Hosted Version**
- ✅ **Complete data control** - everything stays local
- ✅ **No telemetry** or tracking
- ✅ **Air-gapped operation** possible
- ✅ **User controls all security** measures

---

## 📈 **Maintenance & Updates**

### **Cloud Version**
- ✅ **Automatic updates** with new features
- ✅ **Security patches** applied immediately
- ✅ **Infrastructure managed** by us
- ✅ **24/7 monitoring** and support

### **Self-Hosted Version**
- 🔄 **Manual updates** via npm or git pull
- 🔄 **User applies** security patches
- 🔄 **User manages** infrastructure
- 🔄 **Community support** via GitHub

### **Update Process (Self-Hosted)**
```bash
# NPM package updates
npx create-foto-fun@latest my-editor --update

# Git repository updates
git pull origin main
bun install
bun build
```

---

## 🤝 **Migration Path**

### **Cloud to Self-Hosted**
```typescript
// Export cloud data
const exportData = {
  projects: await cloudStorage.exportAllProjects(),
  preferences: await cloudStorage.getUserPreferences(),
  customPresets: await cloudStorage.getCustomPresets()
}

// Import to self-hosted
await selfHosted.importProjects(exportData.projects)
await selfHosted.setPreferences(exportData.preferences)
await selfHosted.importPresets(exportData.customPresets)
```

### **Self-Hosted to Cloud**
```typescript
// Export self-hosted data
const exportData = {
  projects: await indexedDB.exportAllProjects(),
  preferences: await fileSystem.readPreferences(),
  customPresets: await fileSystem.readCustomPresets()
}

// Import to cloud (after account creation)
await cloudAPI.importProjects(exportData.projects)
await cloudAPI.updatePreferences(exportData.preferences)
await cloudAPI.importPresets(exportData.customPresets)
```

---

## 🎯 **Conclusion**

The hybrid approach provides:

- **☁️ Cloud users** get a managed, collaborative experience with automatic updates
- **🏠 Self-hosted users** get complete control, privacy, and customization
- **🔄 Both versions** maintain feature parity for core editing functionality
- **📦 Distribution strategy** maximizes adoption through multiple channels

This architecture ensures that FotoFun can serve both enterprise teams needing managed solutions and individual developers wanting complete control over their tools. 