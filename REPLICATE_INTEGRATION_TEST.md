# Replicate Integration Test Guide - Server-Side Implementation

## Implementation Summary

Epic 5.33 has been successfully implemented with **server-side API key security**! The following components have been created:

### 🔒 **Security-First Architecture**
- ✅ **API key stays server-side only** - Never exposed to client
- ✅ **Server-side Replicate calls** - All AI requests go through our server
- ✅ **Client calls our API** - Browser never talks to Replicate directly

### 1. Server-Side Replicate Client (`lib/ai/server/replicateClient.ts`)
- ✅ Server-only Replicate client with error handling
- ✅ Uses `REPLICATE_API_KEY` environment variable (server-side only)
- ✅ Proper error categorization (rate limits, payment, service unavailable)

### 2. Server API Route (`app/api/ai/replicate/generate-image/route.ts`)
- ✅ Next.js API route for image generation
- ✅ Input validation with Zod schemas
- ✅ Proper error handling and responses
- ✅ Uses server-side Replicate client

### 3. Image Generation Tool (`lib/ai/tools/ImageGenerationTool.ts`)
- ✅ Server-side execution only
- ✅ Guards against client-side instantiation
- ✅ Uses server Replicate client for AI SDK tool registration

### 4. Image Generation Adapter (`lib/ai/adapters/tools/imageGeneration.ts`)
- ✅ Client-side calls our server API (not Replicate directly)
- ✅ Server-side overrides for AI SDK tool registration
- ✅ Handles canvas integration
- ✅ Proper scaling and positioning of generated images

### 5. Registry Integration
- ✅ Auto-discovery of Replicate adapters
- ✅ Works on both server and client sides
- ✅ Registered alongside existing canvas tool adapters

### 6. Empty Canvas Support
- ✅ AI Chat now works with empty canvases
- ✅ Users can start projects by generating images
- ✅ Dynamic quick actions based on canvas content
- ✅ Context-aware placeholder text and welcome messages

### 7. Smart Positioning System
- ✅ Generated images no longer replace existing content
- ✅ Intelligent placement algorithm finds empty areas
- ✅ Prioritizes right, left, below, above existing content
- ✅ Grid-based fallback search for complex layouts
- ✅ Maintains 20px spacing between images

### 8. Layer Integration
- ✅ Each generated image creates a new layer automatically
- ✅ Descriptive layer names based on prompt content
- ✅ Proper layer management with unique IDs
- ✅ Generated images appear in the Layers panel
- ✅ Full layer functionality (visibility, opacity, reordering)
- ✅ **FIXED**: Images no longer replace existing content
- ✅ **FIXED**: Drag & drop images now properly create layers

## How to Test

### Prerequisites
Make sure you have `REPLICATE_API_KEY` set in your `.env.local` file:
```
REPLICATE_API_KEY=r8_your_api_key_here
```

**Note**: No `NEXT_PUBLIC_` prefix needed! The API key stays server-side only.

### Test Steps

1. **Start the development server** (already running)
   ```bash
   bun run dev
   ```

2. **Open the application** in your browser (typically `http://localhost:3000`)

3. **Navigate to the editor** (you should see the canvas and AI chat panel)

   **Note**: You can now start with an empty canvas! No need to upload an image first.

4. **Test Image Generation with Empty Canvas** by sending one of these messages to the AI chat:
   - "Generate an image of a serene mountain landscape at sunset"
   - "Create a futuristic robot in a cyberpunk city"
   - "Generate a photo of a cat wearing a hat"

5. **Test with Existing Content** (multiple images):
   - Upload an image to the canvas first
   - Ask the AI to generate additional content (e.g., "generate a sunset landscape")
   - The new image should appear in an empty area near the existing image
   - Try generating multiple images to see smart positioning in action

6. **Test Smart Positioning Scenarios**:
   - **Empty Canvas**: Generate first image → should be centered
   - **Single Image**: Generate second image → should appear to the right of first
   - **Multiple Images**: Generate third image → should find best empty space
   - **Complex Layout**: Add images manually, then generate → should avoid overlapping

7. **Test Layer Integration**:
   - **Generate Image**: Each generation should create a new layer
   - **Layer Names**: Check that layers have descriptive names (e.g., "Mountain Sunset" for "mountain landscape at sunset")
   - **Layer Panel**: Verify generated images appear in the Layers panel
   - **Layer Controls**: Test visibility toggle, opacity, and reordering on generated image layers
   - **Multiple Generations**: Each should create separate layers with unique names
   - **No Replacement**: Verify existing images are preserved when generating new ones

8. **Test Drag & Drop Integration**:
   - **Single Image**: Drag an image file to empty canvas → should create "Background" layer
   - **Multiple Images**: Drag additional images → should create new layers with file names
   - **Preservation**: Existing images should remain visible when dragging new ones

### Expected Behavior

1. **AI Chat Recognition**: The AI should recognize the request as an image generation task
2. **Tool Selection**: The AI will use the `generateImage` tool automatically
3. **Server API Call**: Browser makes POST request to `/api/ai/replicate/generate-image`
4. **Server Processing**: Server calls Replicate API with your server-side API key
5. **Image Return**: Server returns generated image URL to browser
6. **Canvas Update**: The generated image appears on the canvas with smart positioning:
   - Empty canvas: Image is centered
   - With existing content: Image is placed in nearby empty area (right, left, below, above)
   - Multiple images: Each new image finds the best non-overlapping position
   - **New Layer**: Each generated image automatically creates a new layer
7. **Success Message**: The AI confirms the generation was successful

### Debugging

#### Browser Console (Client-Side)
- `[ImageGenerationAdapter] Generating image with params:` - Shows parameters sent to server
- `[ImageGenerationAdapter] Server response:` - Shows response from our API
- `[ImageGenerationAdapter] Image added to canvas` - Confirms canvas integration
- **No Replicate logs** - Client never talks to Replicate directly

#### Server Logs (Terminal)
- `[Generate Image API] Processing request...` - Server received request
- `[ServerReplicateClient] Running model:` - Server calling Replicate
- `[Generate Image API] Generation completed in X ms` - Server processing complete

## Architecture Highlights

### 🔐 **Security-First Design**
```typescript
// NEW: Server-Side Flow
User Request → AI Chat → Server Tool → Our API → Replicate → Server → Client

// OLD: Client-Side Flow (REMOVED)
User Request → AI Chat → Client Tool → Replicate → Client
```

### Unified Adapter Pattern (Enhanced)
```typescript
// Canvas Tool → Adapter → AI Chat (unchanged)
cropTool → CropToolAdapter → AI can use it

// AI-Native Tool → Server API → Adapter → AI Chat (new secure flow)
Client: fetch('/api/ai/replicate/generate-image') → ImageGenerationAdapter
Server: serverReplicateClient.run() → Replicate API
```

### Dual Execution Model
- **Server-side**: Tool registration for AI SDK, uses `REPLICATE_API_KEY`
- **Client-side**: Canvas manipulation, calls our API routes
- **API Key**: Never exposed to browser, stays server-side only

### AI SDK v5 Integration
- Uses `inputSchema` (not `parameters`) for AI SDK v5 compatibility
- Server-side tool registration with API route execution
- Client-side adapter calls our server API

### Error Handling
- Server-side API key validation
- Detailed error messages for users
- Proper HTTP status codes and error responses

## Next Steps

This implementation provides the foundation for adding more AI-Native Tools:
- Background removal
- Image upscaling
- Object inpainting
- Face enhancement

Each new tool follows the same pattern:
1. Create AI-Native Tool class
2. Create Tool Adapter
3. Register in `autoDiscoverAdapters()`

## Success Criteria Met

✅ **Architecture Compliance**: AI-Native Tools in `lib/ai/tools/`, Tool Adapters in `lib/ai/adapters/tools/`
✅ **Security**: API key stays server-side only, never exposed to client
✅ **Server Integration**: Next.js API route handles Replicate calls
✅ **Unified Registry**: Single adapter registry for all tools
✅ **AI Chat Compatible**: Users can request image generation naturally (works with empty canvas)
✅ **Canvas Integration**: Generated images appear on canvas automatically with smart positioning and layer creation
✅ **Error Handling**: Proper validation and error responses

## 🔒 **Security Benefits Achieved**

- **API Key Protection**: `REPLICATE_API_KEY` never ships to client
- **Server-Side Validation**: All requests validated on server before Replicate
- **No Client Dependencies**: Browser never imports Replicate package
- **Audit Trail**: All AI requests logged on server side

The implementation successfully fulfills Epic 5.33 requirements with enhanced security! 