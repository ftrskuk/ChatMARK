// ============================================================
// types/state.ts — Central state type definitions
// ============================================================
// Derived from actual runtime shapes in src/state.js

import type {
  Bookmark,
  BookmarkAnchor,
  BookmarkHistoryEntry,
  BookmarkUiStateMap,
  PopupLayout,
} from "./bookmark.js";

/**
 * Drag session state for bookmark reordering.
 */
export interface BookmarkDragSession {
  /** Bookmark ID being dragged */
  bookmarkId: string;

  /** Starting Y position */
  startY: number;

  /** Current Y position */
  currentY: number;

  /** Original index in the list */
  originalIndex: number;

  /** Whether this is a valid drop target */
  isValid: boolean;
}

/**
 * Popup resize session state.
 */
export interface PopupResizeSession {
  /** Bookmark ID being resized */
  bookmarkId: string;

  /** Starting dimensions */
  startWidth: number;
  startHeight: number;

  /** Starting mouse position */
  startX: number;
  startY: number;

  /** Which resize handle is active */
  handle: "se" | "sw" | "ne" | "nw" | "e" | "w" | "n" | "s";
}

/**
 * Selection anchor for creating new bookmarks.
 */
export type SelectionAnchor = BookmarkAnchor;

/**
 * History entry for undo/redo functionality.
 */
/**
 * Central application state.
 * This is the single source of truth for all mutable state.
 */
export interface AppState {
  // ---- Bookmark data ----
  /** Map of URL key → bookmark array (legacy v1 format) */
  bookmarksByUrl: Record<string, Bookmark[]>;

  /** Map of URL hash → shard index entry (v2 format) */
  bookmarkShardIndexByUrlHash: Record<
    string,
    { urlKey: string; count: number; updatedAt: number }
  >;

  /** Map of bookmark ID → popup layout dimensions */
  popupLayoutByBookmarkId: Record<string, PopupLayout>;

  /** Map of URL key → UI state entry */
  bookmarkUiStateByUrl: BookmarkUiStateMap;

  /** Current normalized URL key */
  currentUrlKey: string;

  /** Current page's bookmarks */
  currentBookmarks: Bookmark[];

  /** Manual sort order (overrides creation order) */
  manualOrderBookmarkIds: string[];

  /** Current search query for filtering bookmarks */
  bookmarkSearchQuery: string;

  // ---- DOM references ----
  root: HTMLElement | null;
  railViewport: HTMLElement | null;
  railScrollHitbox: HTMLElement | null;
  railLayerViewport: HTMLElement | null;
  railScrollSpacer: HTMLElement | null;
  railScrollbar: HTMLElement | null;
  railScrollbarTrack: HTMLElement | null;
  railScrollbarThumb: HTMLElement | null;
  railScrollbarDrag: HTMLElement | null;
  searchInput: HTMLInputElement | null;
  searchClearButton: HTMLElement | null;
  searchStatus: HTMLElement | null;
  layer: HTMLElement | null;
  addTab: HTMLElement | null;
  saveToast: HTMLElement | null;
  selectionTrigger: HTMLElement | null;
  sandboxCardLayer: HTMLElement | null;
  emptyTab: HTMLElement | null;
  popup: HTMLElement | null;
  popupForm: HTMLFormElement | null;
  popupInput: HTMLInputElement | null;
  scrollMask: HTMLElement | null;
  scrollProgressFill: HTMLElement | null;

  // ---- UI interaction state ----
  popupColorIndex: number;
  colorPicker: HTMLElement | null;
  colorPickerBookmarkId: string;
  colorPickerLockedBookmarkId: string;
  editLockedBookmarkId: string;
  pendingAnchor: SelectionAnchor | null;
  pendingBookmarkId: string;
  lastHref: string;
  activeBookmarkId: string;
  hoveredBookmarkId: string;
  focusedBookmarkId: string;
  createPopupPreservedExpandedBookmarkId: string;
  pinnedBookmarkIds: string[];
  expandedPinnedBookmarkIds: string[];
  expandedPopupContentBookmarkIds: string[];
  expandedBookmarkId: string;
  resizeLockedExpandedBookmarkId: string;
  popupResizeSession: PopupResizeSession | null;
  resizeSettlingBookmarkId: string;

  // ---- Selection state ----
  selectionAnchor: SelectionAnchor | null;
  selectionAnchorCachedAt: number;
  selectionPopupPosition: { x: number; y: number } | null;
  selectionUiFrame: number;

  // ---- Timers (timeout IDs) ----
  activeTimer: number;
  highlightStartTimer: number;
  highlightTimer: number;
  postScrollTimer: number;
  scrollMaskRevealTimer: number;
  resizeSettleTimer: number;
  addTabFeedbackTimer: number;
  saveToastTimer: number;

  // ---- Scroll state ----
  hiddenScrollActive: boolean;
  scrollProgressValue: number;
  highlightedElement: HTMLElement | null;
  highlightedInlineNode: Node | null;
  highlightedInlineNodes: Node[];

  // ---- Storage reload suppression ----
  popupLayoutReloadSuppressAt: number;
  bookmarkBucketReloadSuppressAt: number;
  bookmarkUiStateReloadSuppressAt: number;

  // ---- Undo/Redo ----
  bookmarkUndoStack: BookmarkHistoryEntry[];
  bookmarkRedoStack: BookmarkHistoryEntry[];

  // ---- Drag & drop ----
  bookmarkDragSession: BookmarkDragSession | null;
  bookmarkDragIndicator: HTMLElement | null;
  bookmarkDragSuppressClickBookmarkId: string;
  bookmarkDragSuppressClickTimer: number;
  bookmarkCreateInteractionGuardCount: number;

  // ---- Rail display ----
  railOpacity: number;
  railEnabled: boolean;
  topRightUiObserver: MutationObserver | null;
  topRightUiRefreshFrame: number;
  _updateBannerDismissed: string;

  // ---- 2-pass navigation ----
  navigateSessionId: number;
  domStableObserver: MutationObserver | null;

  // ---- Frame relay ----
  frameRelayDebugEnabled: boolean;

  // ---- Sandbox card ----
  hoveredSandboxCardKey: string;
  lastSandboxCardKey: string;
  lastSandboxCardInteractedAt: number;
  sandboxCardHighlightPulseTimer: number;
  sandboxCardRenderFrame: number;
}
