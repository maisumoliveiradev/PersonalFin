# DESIGN-SYSTEM.md

## Strategy

The Design System is incremental. Do not build a complete component
library before product screens require it.

## Foundations

The foundation should define:

-   semantic color tokens;
-   typography scale;
-   spacing scale;
-   radius;
-   elevation/shadow;
-   breakpoints where applicable;
-   motion principles;
-   Light/Dark/System theme mapping.

## Implemented foundation (SDD-002)

Location: `apps/client/src/ui`.

-   **Color tokens** (`theme.ts`): `background`, `surface`, `text`,
    `textMuted`, `border`, `primary`, `onPrimary`, `danger`, each with
    Light and Dark values. `usePalette()` follows the operating-system
    theme (user-selected theme is not implemented yet; TD-005).
-   **Spacing:** `xs 4`, `sm 8`, `md 16`, `lg 24`, `xl 32`.
-   **Radius:** `md 8`. **Font sizes:** `caption 14`, `body 16`,
    `title 24`.
-   **Layout:** content width capped at 420 px for forms, centered, with
    safe-area handling.
-   **Components:** `Screen`, `Title` (header role), `TextField`
    (visible label, accessibility label and hint, 48 px minimum height),
    `Button` (`primary` and `link` variants, busy/disabled states, 48 px
    minimum height), `FormError` (alert role, polite live region),
    `LoadingScreen`, `BodyText` (regular and muted), `ListItem`
    (pressable row with title and subtitle, 56 px minimum height;
    SDD-003), `SectionTitle` (header role; SDD-004), `OptionGroup`
    (single-choice radio group rendered as chips, 44 px minimum height)
    and `StatusMessage` (success alert with `success` color token;
    SDD-005).

## Components

Create components only when justified by current product usage. Prefer
accessible primitives and consistent APIs.

Likely early components:

-   Button
-   Text/Input
-   Form field/error
-   Select
-   Card/Surface
-   Modal/Dialog when required
-   Navigation primitives
-   Feedback/loading/empty/error states

## Accessibility

WCAG 2.2 AA is the reference. Components should support keyboard/focus
behavior on Web and accessibility semantics on native platforms.

## Platform adaptation

Share tokens and semantic intent. A component does not need identical
rendering/interaction across Web and native when platform conventions
differ.

## Governance

When a reusable visual pattern appears repeatedly, promote it to the
Design System rather than copying local variants.
