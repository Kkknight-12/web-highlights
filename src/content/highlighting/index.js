/**
 * Highlighting Module Exports
 * Central export point for all highlighting functionality
 */

export { HighlightEngine } from './highlight-engine.js'
export { HighlightRestorer } from './highlight-restorer.js'
export { HighlightStorage } from './highlight-storage.js'
export { 
  HIGHLIGHT_COLORS, 
  generateHighlightId, 
  HIGHLIGHT_CLASS_BASE,
  CONTAINER_TAGS,
  BLOCK_TAGS
} from './highlight-constants.js'
export {
  getCleanText,
  getContainerInfo,
  findTextPositionInCleanText,
  findTextNodes,
  createRangeForText,
  isBlockBoundary
} from './text-finder.js'
export {
  getTextNodesInRange,
  createHighlightWrapper,
  wrapTextNodes,
  unwrapHighlight,
  mergeAdjacentTextNodes
} from './dom-highlighter.js'