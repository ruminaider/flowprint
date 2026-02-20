# ADR-006: ViewportPortal Lane Rendering

## Status

Accepted

## Date

2025-06-01

## Context

Flowprint blueprints organize nodes into horizontal lanes (similar to swimlanes in BPMN). Each lane has a header label and a background region that visually groups its nodes. React Flow manages its own viewport through CSS transforms — panning and zooming apply a `translate3d` and `scale` transform to an internal container, and all nodes within React Flow's canvas move with this transform automatically.

Lane backgrounds and headers, however, are not React Flow nodes. They are decorative layers that must visually sit behind the nodes and span the full width of the lane. This creates an alignment problem: these elements need to follow the same pan/zoom transforms as the nodes, but they exist outside React Flow's transformed container.

We tried several approaches before arriving at the current solution:

- **Rendering lanes as React Flow nodes**: lane backgrounds became part of the node z-ordering, causing interaction conflicts (clicks on the lane background intercepted node events) and making it impossible to have the background truly behind all nodes in the lane.
- **Absolute positioning with manual transform tracking**: we subscribed to React Flow's viewport state and applied matching CSS transforms to a separate div. This worked but was fragile — the lane layer lagged behind the viewport by a frame during rapid panning, causing visible jitter.
- **React Flow's built-in Background component pattern**: we studied how React Flow's `<Background>` component stays in sync and discovered it uses an internal viewport portal mechanism.

## Decision

We use a ViewportPortal pattern to render lane backgrounds and headers in sync with React Flow's viewport transforms:

1. **ViewportPortal component.** A wrapper component renders its children inside React Flow's transformed viewport layer, ensuring that any content within the portal receives the same `translate3d` and `scale` CSS transforms as nodes.

2. **Pointer-events layering.** The lane background layer has `pointer-events: none`, allowing mouse and touch events to pass through to the nodes beneath. Lane headers re-enable `pointer-events: auto` on their specific elements so they remain interactive (clickable, draggable for reordering).

3. **`nopan` class on lane headers.** React Flow interprets mouse drags on its canvas as pan gestures. Lane headers use React Flow's `nopan` CSS class to prevent header interactions (click-to-select, drag-to-reorder) from triggering canvas panning.

4. **Lane dimensions derived from node positions.** Lane height and vertical position are computed from the bounding box of the nodes assigned to each lane, with configurable padding. This means lanes resize automatically as nodes are added, removed, or repositioned.

## Consequences

### Positive

- Lane backgrounds and headers follow pan/zoom with zero visual lag because they share the same CSS transform context as React Flow's node layer — no frame-delay jitter.
- The pointer-events layering allows intuitive interaction: clicking on a lane background selects nothing (click passes through to canvas), clicking a node works normally, and clicking a lane header selects the lane.
- Lane rendering is decoupled from React Flow's node system, avoiding z-index battles and event interception issues that plagued the "lanes as nodes" approach.
- Automatic lane sizing from node bounding boxes means users never need to manually resize lanes; the layout adapts as nodes move.

### Negative

- The ViewportPortal pattern depends on React Flow's internal viewport transform structure. If React Flow changes how it applies transforms in a major version update, the portal layer will need to be updated accordingly.
- The `pointer-events: none` / `pointer-events: auto` layering requires careful management. Adding new interactive elements to the lane layer (e.g., inline lane controls) requires explicitly re-enabling pointer events, which is easy to forget.
- The `nopan` class is a React Flow-specific escape hatch. It is documented but not part of a formal API contract, making it a mild coupling risk across React Flow upgrades.
- Computing lane dimensions from node bounding boxes adds a layout computation on every node position change. For blueprints with hundreds of nodes this is negligible, but it is additional work on every drag event.
