export const MOD = process.platform === 'darwin' ? 'Meta' : 'Control'

export const SEL = {
  // Editor root
  editor: '.fp-editor',
  editorCanvas: '.fp-editor__canvas',
  editorMain: '.fp-editor__main',

  // Nodes
  node: (type: string) => `.fp-node[data-node-type="${type}"]`,
  nodeById: (id: string) => `[data-testid="node-${id}"]`,
  nodeSelected: '.fp-node--selected',
  nodeName: '.fp-node__name',
  nodeMenu: '.fp-node__menu',

  // Toolbar
  toolbar: '.fp-toolbar',
  toolbarButton: '.fp-toolbar__button',
  toolbarButtonActive: '.fp-toolbar__button--active',
  toolbarDivider: '.fp-toolbar__divider',

  // Command Palette
  cmdPalette: '.fp-command-palette',
  cmdPaletteInput: '.fp-command-palette__input',
  cmdPaletteItem: '.fp-command-palette__item',
  cmdPaletteItemActive: '.fp-command-palette__item--active',
  cmdPaletteBackdrop: '[data-testid="command-palette-backdrop"]',
  cmdPaletteCategory: '.fp-command-palette__category',
  cmdPaletteList: '.fp-command-palette__list',

  // Bottom Panel
  bottomPanel: '.fp-bottom-panel',
  bottomPanelYaml: '.fp-bottom-panel__yaml',
  bottomPanelTab: '.fp-bottom-panel__tab',
  bottomPanelTabActive: '.fp-bottom-panel__tab--active',
  bottomPanelClose: '.fp-bottom-panel__close',
  bottomPanelResize: '.fp-bottom-panel__resize',
  bottomPanelErrorList: '.fp-bottom-panel__error-list',

  // Zoom Controls
  zoomControls: '.fp-zoom-controls',
  zoomPercentage: '.fp-zoom-controls__percentage',
  zoomPercentageInput: '.fp-zoom-controls__percentage-input',

  // Lanes
  lane: '.fp-lane',
  laneById: (id: string) => `.fp-lane[data-lane-id="${id}"]`,
  laneCollapsed: '.fp-lane--collapsed',
  laneLov: '.fp-lane__lov',
  laneLovBadge: '.fp-lane__lov-badge',

  // Tabs
  tabBar: '.fp-tab-bar',
  tab: '.fp-tab',
  tabActive: '.fp-tab--active',
  tabById: (id: string) => `[data-testid="tab-${id}"]`,
  tabLabel: '.fp-tab__label',
  tabClose: '.fp-tab__close',

  // Node Popover
  popover: '.fp-node-popover',
  popoverHeader: '.fp-node-popover__header',
  popoverOpenEditor: '.fp-node-popover__open-editor',

  // Rules UI
  rulesEditor: '.fp-rules-editor',
  rulesPreview: '.fp-rules-preview',
  decisionTable: '.fp-decision-table',
  rulesToggle: '[data-testid="toggle-rules"]',
  alternateToggle: '[data-testid="toggle-alternate"]',
  rulesFileInput: '[data-testid="rules-file-input"]',
  rulesEvaluatorSelect: '[data-testid="rules-evaluator-select"]',

  // React Flow internals
  edge: '.react-flow__edge',
  reactFlow: '.react-flow',
  // React Flow node wrapper — use for clicks (RF registers handlers here)
  rfNode: (id: string) => `.react-flow__node[data-id="${id}"]`,
} as const

/**
 * Click a React Flow node reliably.
 * React Flow's background SVG intercepts pointer events, so we dispatch
 * a real click event on the RF node wrapper element.
 */
export async function clickNode(page: import('@playwright/test').Page, nodeId: string) {
  await page.locator(SEL.rfNode(nodeId)).dispatchEvent('click')
}

/** Double-click a React Flow node reliably. */
export async function dblClickNode(page: import('@playwright/test').Page, nodeId: string) {
  await page.locator(SEL.rfNode(nodeId)).dispatchEvent('dblclick')
}

export const EDITOR_URL = (variant: string) =>
  `/iframe.html?viewMode=story&id=editor-flowprinteditor--${variant}`

export const VIEWER_URL = (variant: string) =>
  `/iframe.html?viewMode=story&id=flowprintviewer--${variant}`
