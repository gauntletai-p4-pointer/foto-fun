# FotoFun Feature Configuration Guide

## Overview

FotoFun uses a simple feature toggle system that works for both cloud and self-hosted deployments:

- **Cloud Users**: All features available, just toggle on/off
- **Self-Hosted Users**: All features visible, get setup help when enabling

## Quick Start

1. Open **File → Settings** (or press ⌘,)
2. Browse features by category
3. Toggle features on/off
4. For self-hosted: See setup instructions when enabling features

## Default Features

The following features are enabled by default:
- **AI Chat Assistant** - Ready to use with your OpenAI API key
- **Version History** - Track changes to your projects

## Feature Categories

### AI Features
- **AI Chat Assistant** - Natural language photo editing (Stable)
- **AI Background Removal** - Remove backgrounds using AI (Coming Soon)
- **AI Face Enhancement** - Enhance facial features (Beta)
- **AI Image Upscaling** - Upscale images 2x, 4x, or 8x (Coming Soon)
- **AI Smart Erase** - Remove unwanted objects (Beta)
- **AI Generation** - Generate images from text (Coming Soon, Cloud Only)

### Collaboration
- **Real-Time Collaboration** - Multiple users editing simultaneously (Coming Soon)
- **Comments & Feedback** - Leave comments on specific areas (Coming Soon)
- **Version History** - Track and restore previous versions (Stable)
- **Cloud Sync** - Automatic backup and sync (Coming Soon, Cloud Only)

### Cloud Services
- **Cloud Storage** - Store images and projects in the cloud (Coming Soon)
- **Team Workspaces** - Organize work in teams (Coming Soon, Cloud Only)
- **Usage Analytics** - Track usage metrics (Coming Soon, Cloud Only)

### Advanced Editing
- **Plugin System** - Extend functionality with plugins (Beta)
- **Macros & Automation** - Record and replay editing sequences (Coming Soon)
- **Batch Processing** - Process multiple images at once (Coming Soon)
- **RAW Processing** - Edit RAW image formats (Beta)

## For Self-Hosted Users

When you enable a feature that needs configuration, you'll see setup instructions. For example:

### AI Chat Setup
```bash
# Add to your .env.local file:
OPENAI_API_KEY=sk-...
```

### AI Image Features Setup
```bash
# Run the AI service container:
docker run -p 8080:8080 fotofun/ai-service

# Add to your .env.local file:
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8080
```

### Real-Time Collaboration Setup
1. Enable Supabase Realtime in your project dashboard
2. Set `NEXT_PUBLIC_ENABLE_REALTIME=true` in `.env.local`

## For Cloud Users

All features are pre-configured. Just toggle them on/off in settings. Some features may require specific subscription plans.

## Feature Status

- **Stable**: Ready for production use
- **Beta**: Feature complete but may have bugs
- **Coming Soon**: Under development
- **Cloud Only**: Available only for cloud deployments

## Environment Variables

### Required for all deployments:
```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Optional (defaults to self-hosted):
```bash
NEXT_PUBLIC_DEPLOYMENT=self-hosted  # or 'cloud'
```

### Optional for specific features:
```bash
# AI Chat
OPENAI_API_KEY=sk-...

# AI Image Services
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8080
NEXT_PUBLIC_AI_SERVICE_KEY=your-service-key

# Real-time Collaboration
NEXT_PUBLIC_ENABLE_REALTIME=true

# Analytics (Cloud only)
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## Using Features in Code

```typescript
import { FeatureGate } from '@/components/ui/feature-gate'
import { FEATURES } from '@/lib/config/features'

// Conditionally render based on feature
<FeatureGate feature={FEATURES.AI_CHAT}>
  <AIChat />
</FeatureGate>

// With fallback
<FeatureGate 
  feature={FEATURES.AI_BACKGROUND_REMOVAL}
  fallback={<div>Background removal not enabled</div>}
>
  <BackgroundRemovalTool />
</FeatureGate>
```

## Troubleshooting

### Feature Not Working After Enabling

1. **Check the setup instructions** - Did you complete all steps?
2. **Restart the app** - Some features require a restart
3. **Check browser console** - Look for error messages
4. **Verify services** - Ensure external services are running

### Common Issues

**AI Chat not working:**
- Verify `OPENAI_API_KEY` is set in `.env.local`
- Check the API key is valid
- Restart the development server

**AI features show errors:**
- Ensure AI service is running: `docker ps`
- Check service health: `curl http://localhost:8080/health`
- Verify `NEXT_PUBLIC_AI_SERVICE_URL` is set correctly

## Privacy & Security

- **Self-hosted**: All data stays on your infrastructure
- **API Keys**: Never exposed to the browser
- **Feature Toggles**: Stored locally in your browser
- **No Telemetry**: We don't track feature usage

## Getting Help

- **Documentation**: https://fotofun.app/docs
- **GitHub Issues**: https://github.com/fotofun/fotofun/issues
- **Community**: https://github.com/fotofun/fotofun/discussions 