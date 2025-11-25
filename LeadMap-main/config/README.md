# Theme Configuration

This directory contains the centralized theme configuration for the NextDeal website.

## Files

- **`theme.ts`** - Main theme configuration file containing:
  - Branding information
  - Color palette
  - Typography settings (fonts, sizes, weights)
  - Layout and spacing constants
  - Component styles
  - Content constants

## Usage

Import the theme configuration in your components:

```typescript
import { COLORS, TYPOGRAPHY, LAYOUT, CONTENT } from '@/config/theme'
```

## Font Information

The website uses three main font families:

1. **Montserrat** - For headings (h1-h6)
   - Weights: 400, 500, 600, 700, 800
   - CSS Variable: `--font-montserrat`

2. **Inter** - For body text, paragraphs, labels
   - Weights: 400, 500, 600
   - CSS Variable: `--font-inter`

3. **Lato** - For buttons, badges, UI elements
   - Weights: 400, 700
   - CSS Variable: `--font-lato`

Fonts are loaded via Next.js font optimization in `app/layout.tsx` and configured in `tailwind.config.js`.

## Updating Theme

When making design changes:
1. Update the relevant constants in `theme.ts`
2. Reference this file when implementing changes
3. Keep font information here for easy reference if chat context runs out

