# Testing WebGL Filters

## Setup

1. Start the development server:
   ```bash
   bun dev
   ```

2. Open the app at http://localhost:3000

## Creating a Test Image

1. Open the file `/public/create-test-image.html` in your browser
2. Click "Download Test Image" to save a colorful test image
3. This will create an image with gradients, shapes, and text - perfect for testing filters

## Testing the Brightness Tool (Migrated to WebGL)

1. In the FotoFun editor, click **File > Open** (or drag and drop) to load your test image
2. Select the **Brightness Tool** from the tool palette (Sun icon, shortcut: B)
3. You should see a brightness slider in the tool options bar at the top
4. Adjust the slider from -100% to +100% to see real-time brightness changes
5. The filter should apply instantly with GPU acceleration

### What to Test:
- Smooth real-time preview as you drag the slider
- No lag or stuttering on large images
- Brightness range from very dark (-100%) to very bright (+100%)
- The adjustment value should be displayed next to the slider

## Testing the Vintage Effects Tool (New WebGL-Only)

1. With an image loaded, select the **Vintage Effects Tool** (Camera icon, shortcut: V)
2. You'll see a custom UI with 5 vintage effect options
3. Click on different effects to apply them:
   - **Brownie**: Classic brownie camera effect with warm tones
   - **Vintage Pinhole**: Pinhole camera effect with vignetting
   - **Kodachrome**: Vibrant Kodachrome film simulation
   - **Technicolor**: Classic Technicolor film effect
   - **Polaroid**: Instant camera effect with faded edges

### What to Test:
- Each effect should apply instantly
- Effects should completely transform the image's color palette
- The selected effect should be highlighted with a border
- "Remove Effect" button should restore the original image

## Performance Testing

1. Try loading a large image (4K or higher)
2. Apply filters - they should still be responsive
3. Compare with non-WebGL filters (if any remain) - WebGL should be noticeably faster

## Known Limitations

- Preview thumbnails in the Vintage Effects tool are disabled for now
- Some browsers may not support WebGL (rare, but possible)
- First filter application may have a slight delay as WebGL initializes

## Troubleshooting

If filters don't work:
1. Check the browser console for errors
2. Ensure WebGL is supported: Visit https://get.webgl.org/
3. Try refreshing the page
4. Check that the WebGLImageFilter library loaded (look for network requests to jsdelivr.net)

## Next Steps

Once these filters are working well, we can:
1. Migrate more filters (Contrast, Saturation, Hue, etc.)
2. Add filter chaining (apply multiple filters)
3. Implement preview thumbnails for vintage effects
4. Add more WebGL-only effects (edge detection, color shift, etc.) 