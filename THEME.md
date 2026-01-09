# IBEX Sports Arena Theme Guide

## Overview

The theme system has been centralized to make it easy to change colors throughout the application. All theme colors are based on the logo colors: **Teal/Mint Green** and **Dark Navy Blue**.

## Theme Configuration

The main theme configuration is located in `lib/theme.ts`. This is the **single source of truth** for all colors.

### Current Theme Colors

- **Primary (Teal/Mint Green)**: `#2DD4BF`
  - Used for: Buttons, highlights, accents, active states
  - Hover: `#14B8A6` (darker teal)
  - Light: `#5EEAD4` (lighter teal)

- **Secondary (Dark Navy Blue)**: `#0F172A`
  - Used for: Text on primary backgrounds, dark accents

- **Accent (Cyan)**: `#06B6D4`
  - Used for: Additional highlights and accents

## How to Change Theme Colors

### Step 1: Update `lib/theme.ts`

Open `lib/theme.ts` and modify the color values:

```typescript
export const theme = {
  primary: {
    DEFAULT: "#2DD4BF",  // Change this to your new primary color
    dark: "#14B8A6",     // Change this to your new hover color
    light: "#5EEAD4",    // Change this to your new light variant
    rgb: "45, 212, 191", // Update RGB values to match new color
  },
  // ... other colors
};
```

### Step 2: Update CSS Files

After changing colors in `lib/theme.ts`, you need to update the following files:

1. **`app/globals.css`** - Search and replace:
   - `#2DD4BF` → Your new primary color
   - `#14B8A6` → Your new hover color
   - `#0F172A` → Your new secondary color (if changed)

2. **Component Files** - Search for color hex codes:
   ```bash
   # Find all instances
   grep -r "#2DD4BF" components/ app/
   ```

### Step 3: Update Component Files

The following files contain hardcoded color values that need to be updated:

- `components/Navbar.tsx`
- `components/sections/HeroSection.tsx`
- `components/sections/FacilitiesSection.tsx`
- `components/sections/GetInTouchSection.tsx`
- `components/sections/AmenitiesSection.tsx`
- `components/sections/MarqueeSection.tsx`
- `components/3d/HeroScene.tsx`
- `app/booking/page.tsx`
- `app/admin/page.tsx`
- `components/ui/*.tsx` (all UI components)

**Quick Find & Replace:**
```bash
# Replace primary color
find . -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" | xargs sed -i '' 's/#2DD4BF/#YOUR_NEW_COLOR/g'

# Replace hover color
find . -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" | xargs sed -i '' 's/#14B8A6/#YOUR_NEW_HOVER/g'
```

## Color Usage Guidelines

### Primary Color (`#2DD4BF`)
- ✅ Buttons and CTAs
- ✅ Active states and selections
- ✅ Links and hover effects
- ✅ Accent borders and highlights
- ✅ Icons and badges

### Secondary Color (`#0F172A`)
- ✅ Text on primary backgrounds
- ✅ Dark mode accents
- ✅ Card backgrounds (optional)

### When to Use Each Color

**Use Primary (Teal) for:**
- Interactive elements (buttons, links)
- Active/selected states
- Important highlights
- Call-to-action elements

**Use Secondary (Navy) for:**
- Text on light/colored backgrounds
- Dark mode elements
- Subtle backgrounds

## Future Improvements

To make theme changes even easier in the future, consider:

1. **CSS Variables**: Move all colors to CSS custom properties in `globals.css`
2. **Tailwind Config**: Add theme colors to `tailwind.config.ts`
3. **Theme Provider**: Create a React context for dynamic theme switching

## Current Color Palette

```
Primary:     #2DD4BF (Teal/Mint Green)
Primary Dark: #14B8A6 (Darker Teal - Hover)
Primary Light: #5EEAD4 (Lighter Teal)

Secondary:   #0F172A (Dark Navy Blue)

Accent:      #06B6D4 (Cyan)

Text:        #FFFFFF (White)
Text Secondary: #E2E8F0 (Light Gray)
Text Muted:  #94A3B8 (Muted Gray)
```

## Notes

- All yellow colors (`#ccff00`) have been replaced with teal (`#2DD4BF`)
- All black text on colored backgrounds has been changed to dark navy (`#0F172A`) for better contrast
- RGB values are included in the theme config for opacity variations
