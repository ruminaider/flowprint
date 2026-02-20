# ADR-005: Embeddable React Component

## Status

Accepted

## Date

2025-01-15

## Context

Workflow and blueprint editors are typically delivered as standalone web applications or SaaS products. Teams embed them via iframes or redirect users to a separate tool. This approach creates integration friction: iframes have cross-origin limitations, standalone apps require separate authentication, and the editing experience is disconnected from the team's own tooling.

We observed that engineering teams often want to embed blueprint editing directly into their own platforms — internal developer portals, deployment dashboards, or onboarding wizards. They need the editor to behave like any other React component in their application: receiving data as props, emitting changes via callbacks, and respecting the host application's design system.

We considered four delivery mechanisms:

- **SaaS application**: lowest integration effort for standalone use, but no embedding capability.
- **iframe embed**: embeddable but limited by cross-origin restrictions, separate styling, and postMessage-based communication.
- **Web Component**: framework-agnostic but requires a shadow DOM boundary that complicates styling, and React-inside-web-component has known friction points.
- **npm package (React component)**: deepest integration for React applications, with native props/callbacks and shared styling context.

## Decision

The Flowprint editor is published as an npm package (`@ruminaider/flowprint-editor`) exporting a controlled React component:

1. **Controlled component API.** The editor accepts `value` (a blueprint object) and `onChange` (a callback receiving the updated blueprint). The host application owns the state. This mirrors standard React patterns like form inputs.

2. **CSS custom properties for theming.** The editor exposes a set of CSS custom properties (colors, fonts, spacing) that host applications can override to match their design system. A separate stylesheet (`@ruminaider/flowprint-editor/styles.css`) provides sensible defaults.

3. **The standalone app is just another consumer.** The `flowprint-app` package imports the editor component and wraps it with file I/O, routing, and persistence. It has no privileged access to editor internals. Any capability available to the standalone app is available to any consumer of the npm package.

4. **No editor-internal network calls.** The editor component does not fetch data or call APIs. All data flows through props. This makes the editor usable in air-gapped environments, test harnesses, and Storybook without mocking network layers.

## Consequences

### Positive

- Teams can embed the blueprint editor in their own React applications with standard `npm install` and component composition, no iframes or auth delegation needed.
- The controlled component pattern makes the editor predictable and testable: pass in state, assert on onChange output, no hidden internal state mutations.
- Theming via CSS custom properties works across any CSS strategy the host application uses (CSS modules, Tailwind, styled-components) without build tool coupling.
- The standalone app proves that the npm package is sufficient for a full editing experience — it serves as both a product and a reference integration.
- No network dependency means the editor works in unit tests, Storybook stories, and CI environments without network mocking.

### Negative

- React is a hard dependency. Teams using Vue, Angular, or Svelte cannot embed the editor without a React bridge layer or a rewrite.
- The host application must manage blueprint state, serialization, and persistence. This is more work than a SaaS product that handles storage automatically.
- CSS custom properties require the host to actively theme the editor; without customization, the default styles may clash with the host application's design system.
- Publishing as an npm package means consumers must keep the dependency updated. Breaking changes in the editor API require coordinated upgrades across consuming applications.
- The editor's bundle size is added to the host application's bundle, which may be a concern for applications that only need blueprint editing in a small part of their interface.
