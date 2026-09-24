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
