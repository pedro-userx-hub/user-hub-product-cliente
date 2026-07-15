# Design Tokens

Canonical tokens extracted from Figma "userx - Design System Legado"
(fileKey `7us7JBODltrMYjR33joZA3`). Use these values in every project.

Legacy note: the Figma file contains overlapping naming schemes
(`Spacing/`, `spacing/`, `Spacing System/`, `borderRadius/`, `Radius/`;
and two type families Open Sans + Inter). The set below is the normalized
canonical version. Prefer Open Sans.

## Colors

### Brand (purple) — primary action / buttons
| Token | Hex |
|-------|-----|
| brand/200 | `#e4cefc` |
| brand/600 (base) | `#8f5cb8` |
| brand/700 (hover) | `#9b6ac9` |

### Primary (navy/blue)
| Token | Hex |
|-------|-----|
| primary/50 | `#fcfdfe` |
| primary/200 | `#ebf2fd` |
| primary/300 | `#deebfe` |
| primary/900 (main) | `#1b365d` |

### Neutral (grayscale)
| Token | Hex |
|-------|-----|
| neutral/0 (white) | `#ffffff` |
| neutral/50 | `#fafafa` |
| neutral/100 | `#f5f5f5` |
| neutral/200 | `#ebebeb` |
| neutral/300 | `#e0e0e0` |
| neutral/400 | `#a3a3a3` |
| neutral/600 | `#525252` |
| neutral/800 | `#262626` |
| neutral/900 | `#171717` |

### Gray (text / borders — Tailwind-like ramp)
| Token | Hex |
|-------|-----|
| gray/50 | `#f9fafb` |
| gray/200 | `#e5e7eb` |
| gray/300 | `#d1d5db` |
| gray/500 | `#6b7280` |
| gray/600 | `#4b5563` |
| gray/800 | `#1f2937` |

### Semantic
| Purpose | Token | Hex |
|---------|-------|-----|
| Error / danger | red/50 | `#fef2f2` |
| | red/100 | `#fee2e2` |
| | red/200 | `#fecaca` |
| | red/700 | `#b91c1c` |
| | red/800 | `#991b1b` |
| | red/900 | `#7f1d1d` |
| | error/ring | `#dc2626` |
| Success | green/100 | `#dcfce7` |
| | green/700 | `#15803d` |
| | green/900 | `#14532d` |
| Warning | yellow/50 | `#fefce8` |
| | yellow/900 | `#713f12` |
| Info | blue/100 | `#dbeafe` |
| | blue/600 | `#2563eb` |
| | blue/900 | `#1e3a8a` |
| Accent | accent | `#3e63dd` |

## Typography

- **Family (canonical):** `"Open Sans", sans-serif`
- **Legacy family:** `"Inter"` — some legacy components use Inter; migrate to Open Sans.

| Scale | Size | Line-height |
|-------|------|-------------|
| xs | 12px | 16px |
| sm | 14px | 20px |
| base | 16px | 24px |

Weights: regular `400`, medium `500`, semibold `600`, bold `700`.

Named text styles:
- `base/semibold` → Open Sans 16/24, 600
- `sm/semibold` → Open Sans 14/20, 600
- `xs/semibold` → Open Sans 12/16, 600
- `sm/medium` → Open Sans 14/20, 500
- `body` → 16/24, 400

## Spacing (4px grid)

| Token | Value |
|-------|-------|
| 0 | 0 |
| 1 | 4px |
| 2 | 8px |
| 3 | 12px |
| 4 | 16px |
| 6 | 24px |

## Radius

| Token | Value |
|-------|-------|
| sm | 4px (buttons) |
| md | 8px |
| lg | 12px |

## Borders

- Control border width: `1.5px`
- Default border color: `gray/300` (`#d1d5db`)

## Shadows

- `shadow/md`: `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)`
- `shadow/sm` (2dp): `0 1px 1px rgba(0,0,0,.05), 0 0 1px rgba(0,0,0,.25)`
- `shadow/error-ring`: `0 0 0 2px #dc2626`

## Copy-paste: CSS custom properties

```css
:root {
  /* brand */
  --ds-brand-200: #e4cefc;
  --ds-brand-600: #8f5cb8;
  --ds-brand-700: #9b6ac9;
  /* primary */
  --ds-primary-50: #fcfdfe;
  --ds-primary-200: #ebf2fd;
  --ds-primary-300: #deebfe;
  --ds-primary-900: #1b365d;
  /* neutral */
  --ds-neutral-0: #ffffff;
  --ds-neutral-50: #fafafa;
  --ds-neutral-100: #f5f5f5;
  --ds-neutral-200: #ebebeb;
  --ds-neutral-300: #e0e0e0;
  --ds-neutral-400: #a3a3a3;
  --ds-neutral-600: #525252;
  --ds-neutral-800: #262626;
  --ds-neutral-900: #171717;
  /* gray */
  --ds-gray-50: #f9fafb;
  --ds-gray-200: #e5e7eb;
  --ds-gray-300: #d1d5db;
  --ds-gray-500: #6b7280;
  --ds-gray-600: #4b5563;
  --ds-gray-800: #1f2937;
  /* semantic */
  --ds-red-50: #fef2f2;
  --ds-red-100: #fee2e2;
  --ds-red-200: #fecaca;
  --ds-red-700: #b91c1c;
  --ds-red-800: #991b1b;
  --ds-red-900: #7f1d1d;
  --ds-error-ring: #dc2626;
  --ds-green-100: #dcfce7;
  --ds-green-700: #15803d;
  --ds-green-900: #14532d;
  --ds-yellow-50: #fefce8;
  --ds-yellow-900: #713f12;
  --ds-blue-100: #dbeafe;
  --ds-blue-600: #2563eb;
  --ds-blue-900: #1e3a8a;
  --ds-accent: #3e63dd;
  /* typography */
  --ds-font-family: "Open Sans", sans-serif;
  --ds-font-xs: 12px;
  --ds-font-sm: 14px;
  --ds-font-base: 16px;
  --ds-lh-xs: 16px;
  --ds-lh-sm: 20px;
  --ds-lh-base: 24px;
  --ds-fw-regular: 400;
  --ds-fw-medium: 500;
  --ds-fw-semibold: 600;
  --ds-fw-bold: 700;
  /* spacing */
  --ds-space-0: 0;
  --ds-space-1: 4px;
  --ds-space-2: 8px;
  --ds-space-3: 12px;
  --ds-space-4: 16px;
  --ds-space-6: 24px;
  /* radius */
  --ds-radius-sm: 4px;
  --ds-radius-md: 8px;
  --ds-radius-lg: 12px;
  /* border */
  --ds-border-width: 1.5px;
  --ds-border-color: #d1d5db;
  /* shadows */
  --ds-shadow-sm: 0 1px 1px rgba(0,0,0,.05), 0 0 1px rgba(0,0,0,.25);
  --ds-shadow-md: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1);
  --ds-shadow-error-ring: 0 0 0 2px #dc2626;
}
```

## Copy-paste: TypeScript tokens

```ts
export const tokens = {
  color: {
    brand: { 200: "#e4cefc", 600: "#8f5cb8", 700: "#9b6ac9" },
    primary: { 50: "#fcfdfe", 200: "#ebf2fd", 300: "#deebfe", 900: "#1b365d" },
    neutral: {
      0: "#ffffff", 50: "#fafafa", 100: "#f5f5f5", 200: "#ebebeb",
      300: "#e0e0e0", 400: "#a3a3a3", 600: "#525252", 800: "#262626", 900: "#171717",
    },
    gray: { 50: "#f9fafb", 200: "#e5e7eb", 300: "#d1d5db", 500: "#6b7280", 600: "#4b5563", 800: "#1f2937" },
    red: { 50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d" },
    green: { 100: "#dcfce7", 700: "#15803d", 900: "#14532d" },
    yellow: { 50: "#fefce8", 900: "#713f12" },
    blue: { 100: "#dbeafe", 600: "#2563eb", 900: "#1e3a8a" },
    accent: "#3e63dd",
    errorRing: "#dc2626",
  },
  font: {
    family: '"Open Sans", sans-serif',
    size: { xs: 12, sm: 14, base: 16 },
    lineHeight: { xs: 16, sm: 20, base: 24 },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 6: 24 },
  radius: { sm: 4, md: 8, lg: 12 },
  border: { width: 1.5, color: "#d1d5db" },
  shadow: {
    sm: "0 1px 1px rgba(0,0,0,.05), 0 0 1px rgba(0,0,0,.25)",
    md: "0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)",
    errorRing: "0 0 0 2px #dc2626",
  },
} as const;
```
