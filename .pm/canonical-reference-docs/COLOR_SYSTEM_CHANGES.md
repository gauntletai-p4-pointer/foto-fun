# Color System Simplification

## Overview
We've simplified the color system from 15+ color variations to a core set of 5 colors, using opacity-based variations for different states and hierarchy.

## Core Colors

### Essential Colors (kept)
- `--background`: App shell background (light: #F5F4ED, dark: #212020)
- `--foreground`: Main text color (light: #1A1A1A, dark: #FAFAFA)  
- `--content-background`: Canvas background (light: #FAF9F5, dark: #191817)
- `--primary`: Blue accent color (#3B82F6)
- `--destructive`: Error/warning color (#EF4444)
- `--ring`: Focus ring color (same as primary)

### Removed/Replaced Colors
The following colors have been replaced with opacity-based variations:
- `--card` → `--background`
- `--popover` → `--background` with shadow
- `--secondary` → `foreground/5` for backgrounds
- `--accent` → `primary/10` or `foreground/5`
- `--muted` → `--background`
- `--muted-foreground` → `foreground/60`
- All sidebar-specific colors → main color system

## New Patterns

### Text Hierarchy
- Primary text: `text-foreground`
- Secondary text: `text-foreground/60`
- Disabled text: `text-foreground/30`

### Background Hierarchy
- Subtle background: `bg-foreground/5`
- Medium background: `bg-foreground/10`
- Active/selected state: `bg-primary/10`

### Borders
- Default border: `border-foreground/10`
- Hover border: `border-foreground/20`
- Active border: `border-primary/50`

### Interactive States
- Default: Base colors
- Hover: Opacity modifiers (e.g., `hover:bg-foreground/5`)
- Active: Deeper opacity (e.g., `active:bg-foreground/10`)
- Selected: Primary color with low opacity (`bg-primary/10`)

## Component Updates

### Buttons
- Primary: Solid primary color with `hover:bg-primary/90`
- Secondary: `bg-foreground/5` with `hover:bg-foreground/10`
- Ghost: Transparent with `hover:bg-foreground/5`
- Outline: Transparent with `border-foreground/10`

### Inputs
- Transparent background
- `border-foreground/10` default
- `border-foreground/20` on hover
- `border-primary` with ring on focus

### Panels & Cards
- Use main background color
- Hierarchy through borders and shadows
- No separate card/popover backgrounds

### Tooltips & Dropdowns
- Same background as app shell
- Use shadows for elevation
- Consistent border treatment

## Benefits
1. **Reduced Complexity**: From 15+ colors to 5 core colors
2. **Better Maintainability**: Fewer CSS variables to manage
3. **Consistent Hover States**: All use opacity modifiers
4. **Clear Visual Hierarchy**: Through opacity levels instead of different colors
5. **Unified Light/Dark Modes**: Same patterns work in both themes

## Migration Notes
- Legacy color mappings are kept in CSS for backward compatibility
- These will be phased out once all components are updated
- The system now relies on Tailwind's opacity modifiers for variations 