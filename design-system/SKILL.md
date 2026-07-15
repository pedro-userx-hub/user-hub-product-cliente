---
name: design-system
description: >-
  UserX design system for Research Ops (UX research) — canonical design tokens,
  component specs, and interface architecture / UX guidelines extracted from
  Figma. Use whenever designing, building, styling, or reviewing UI in
  React/web projects: architecting screens and page layouts, defining
  information hierarchy, sidebars, headers, tables, forms, wizards,
  empty/loading/error states, or creating buttons, inputs, modals, toasts,
  badges, tabs and other components, or when the user mentions the design
  system, UserX, Research Ops, tokens, layout, UX, or wants consistent styling
  across repositories.
---

# UserX — Design System (Research Ops)

Canonical source of truth for building UI consistent with the Figma design
system "userx - Design System Legado". Apply this in **any** repository.

**Product context:** UserX (userxhub.com) is a B2B SaaS **Research Ops**
platform — infrastructure for UX research recruitment: recruiting participants,
managing moderated studies and usability tests, surveys, and team
collaboration. Interfaces should feel like a productive, data-driven research
operations tool.

> This is a **legacy** system: the Figma file mixes several token naming
> conventions (three spacing/radius schemes, two type families). The values
> below are the **cleaned, canonical** set to use going forward. Legacy
> variants are noted where relevant. Prefer the canonical values.

## How to apply

1. When designing a **screen or layout** (not just a single component), FIRST
   read [interface-guidelines.md](interface-guidelines.md) and run its
   "Processo Mental Obrigatório" before placing any component. Information
   architecture comes before visual composition.
2. When building web UI, read [tokens.md](tokens.md) and use those values —
   never hardcode arbitrary colors, sizes, or spacing.
3. For a specific component, read [components.md](components.md) for its
   anatomy, sizes, states, and variants, then implement it in the target
   project's stack.
4. Match the target project's styling system (CSS Modules, styled-components,
   Tailwind, vanilla CSS). Do NOT introduce Tailwind unless the project already
   uses it. Default: emit CSS variables + plain CSS/CSS Modules.
5. Preserve exact visual values (spacing, radius, colors) from the tokens.
6. Default font family is **Open Sans**. Weights: 400 / 500 / 600 / 700.
7. Always design the required interface states: Loading (skeleton), Empty,
   Error, Success, No-permission, Partial content.

## Foundations at a glance

- **Brand action color:** purple `#8f5cb8` (hover `#9b6ac9`).
- **Primary (navy) main:** `#1b365d`.
- **Type scale:** 12 / 14 / 16 px, line-heights 16 / 20 / 24.
- **Spacing:** 4px base grid (4, 8, 12, 16, 24…).
- **Radius:** sm 4, md 8, lg 12.
- **Border:** 1.5px for inputs/controls.

## Component inventory

Available in Figma (see components.md for specs):
Button, Button link, Input, Select, Text Area, Radio, Checkbox, Toggle,
Tab, Tab (Item), TabII, Badge, Popover, Menu Item, List Item, Stepper,
Calendar, Toast, Alert Card, Modal.

## Updating from Figma

When the user asks to refresh the design system, re-read the Figma file
(fileKey `7us7JBODltrMYjR33joZA3`) with the Figma MCP `get_variable_defs` and
`get_design_context` per component, then update tokens.md / components.md.

## Additional resources

- Interface architecture & UX guidelines: [interface-guidelines.md](interface-guidelines.md)
- Design tokens: [tokens.md](tokens.md)
- Component specs: [components.md](components.md)
