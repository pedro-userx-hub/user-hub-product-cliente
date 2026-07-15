# Component Specs

Specs from Figma "userx - Design System Legado". Implement in the target
project's stack using values from [tokens.md](tokens.md). Preserve exact
sizes, radii, and colors.

## Button

**Sizes** (height / padding-x / font):
| Size | Height | Padding-X | Font |
|------|--------|-----------|------|
| Large | 48px | 20px | base 16/24 semibold |
| Medium | 40px | 16px | sm 14/20 semibold |
| Small | 32px | 12px | sm 14/20 semibold |

- Radius: `sm` (4px). Icon size: 24px (Large), gap 8px between icon and text.
- **Content:** `Icons + Text` or `Only Icons` (square: 48/40/32).

**Styles × states:**
| Style | Default bg / text / border | Hover | Disabled |
|-------|----------------------------|-------|----------|
| Filled | bg brand/600, text white | bg brand/700 | opacity 40% |
| Destructive | bg red/700, text white | bg red/800 | opacity 40% |
| Outline | transparent, text brand/600, border 1.5 brand/600 | bg brand/200 | gray border/text |
| Outline_Destructive | transparent, text red/700, border red/700 | bg red/50 | — |
| Clear | transparent, text brand/600, no border | bg brand/200 | gray text |
| Clear_Destructive | transparent, text red/700 | bg red/50 | — |

States present in Figma: Default, Hover, Press, Disabled.

### Reference implementation (React + TS, CSS variables)

```tsx
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "filled" | "outline" | "clear" | "destructive";
type Size = "large" | "medium" | "small";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const sizeStyle: Record<Size, React.CSSProperties> = {
  large: { height: 48, padding: "0 20px", fontSize: 16, lineHeight: "24px" },
  medium: { height: 40, padding: "0 16px", fontSize: 14, lineHeight: "20px" },
  small: { height: 32, padding: "0 12px", fontSize: 14, lineHeight: "20px" },
};

const variantStyle: Record<Variant, React.CSSProperties> = {
  filled: { background: "var(--ds-brand-600)", color: "#fff", border: "none" },
  destructive: { background: "var(--ds-red-700)", color: "#fff", border: "none" },
  outline: { background: "transparent", color: "var(--ds-brand-600)", border: "1.5px solid var(--ds-brand-600)" },
  clear: { background: "transparent", color: "var(--ds-brand-600)", border: "none" },
};

export function Button({
  variant = "filled", size = "large", iconLeft, iconRight, children, style, ...rest
}: ButtonProps) {
  return (
    <button
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: 8, borderRadius: "var(--ds-radius-sm)",
        fontFamily: "var(--ds-font-family)", fontWeight: 600, cursor: "pointer",
        ...sizeStyle[size], ...variantStyle[variant], ...style,
      }}
      {...rest}
    >
      {iconLeft}
      {children && <span>{children}</span>}
      {iconRight}
    </button>
  );
}
```

## Input

- States: Rest, Hover, Focus, Filled, Disabled, Error.
- Border: 1.5px `gray/300`; radius `md` (8px); padding 12px 16px; font base 16/24.
- Focus: border brand/600. Error: border red/700 + focus ring `shadow/error-ring`.
- Disabled: bg gray/50, text gray/500.
- Anatomy: optional label (sm/semibold), field, optional helper/error text (xs).

## Select

Same visual as Input + trailing chevron icon (24px). States: Rest, Hover,
Focus, Filled, Disabled + a variant. Opens Popover/List for options.

## Text Area

Same as Input, multi-line, min-height ~80px, resizable vertical. 7 variants
including Disabled.

## Checkbox / Radio

- Box/circle 24px, border 1.5 gray/300, radius: checkbox `sm` (4px), radio full.
- Selected: fill brand/600, white check/dot. States: Default, Hover, Focus,
  Selected, Disabled, Error (red border). Checkbox also: Indeterminate.
- "+ Text" variants place a label left or right, gap 8px.

## Toggle (Switch)

- Track 44×24, knob 20px white. Off: track gray/300. On: track brand/600.
- States: Default, Hover, Focus, Selected × Position Off/On. "+ Text" variants.

## Tab / Tab (Item) / TabII

- Tab: Active yes/no × Icon yes/no × Notification counter yes/no. Active shows
  brand underline + brand text; inactive gray/600.
- Tab (Item): Default, Hover, Focus, Selected, Disabled.
- TabII: Rest, Hover, Selected (pill/segmented style).

## Badge

- Sizes: sm (h24), lg/xl (h28). Radius: full (pill).
- Colors: Brand, Gray, Green, Red, Yellow, Blue — each = tinted bg (color/100)
  + dark text (color/900). Font: xs/semibold or sm/semibold.

## Toast

- Variants: Success, Error, Warning, Info. Width ~353px, radius md, shadow md.
- Leading status icon + title (semibold) + message + optional close.
- Accent per type: green (success), red (error), yellow (warning), blue (info).

## Alert Card

- 5 variants: Warning, Info, Alert (neutral), Neutral, Success.
- Tinted background (color/50–100) + colored left border/icon + text.

## Modal

- Sizes: x-small, small, medium, large.
- Surface white, radius lg (12px), shadow md, padding 24px.
- Anatomy: header (title semibold + close), body, footer (action buttons right).
- Overlay: black ~40% opacity.

## Menu Item / List Item

- Height 48px, padding 12–16px, font base. States: Rest, Hover (bg gray/50),
  Selected/Clicked (bg primary/200 or brand tint).

## Stepper

- Step wrapper with numbered circles + labels; default and alternate variant.

## Calendar

- Variants: default, select one date, select range (two dates).
- Selected day: brand/600 bg white text; range: brand/200 fill between.

## Button link

- Text-only button styled as link (brand/600), 3 variants. No background.
