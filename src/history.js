// ============================================================
// ui/history.js — 북마크 실행취소(Undo) / 다시실행(Redo)
// ============================================================
// 비유: "Ctrl+Z 기능". 북마크 생성/삭제를 되돌릴 수 있는 기록을 관리합니다.
//       DOM 렌더링(controls UI)은 rail.js에 위임합니다.

import state from './state.js';
import { logWarn } from './log.js';
import { BOOKMARK_HISTORY_LIMIT } from './constants.js';
import {
  normalizeUrlKey,
  normalizeBookmarkList,
  persistBookmarks,
  refreshCurrentBookmarksView,
  handleBookmarkRemove
} from './bookmarks.js';
import {
  sanitizeBookmarkInteractionIds,
  removeBookmarkInteractionId,
  normalizeManualOrderBookmarkIds,
  deletePopupLayout,
  persistBookmarkUiState,
  persistPopupLayouts,
  isBookmarkPopupPinned,
  isBookmarkExpansionPinned,
  invalidateAllBulkBackups
} from './ui-state.js';
import { normalizePopupLayout } from './popup.js';

// ---- 콜백 주입 (순환 의존 방지) ----
// rail.js (UI layer)
let _pulseTab = null;
let _syncBookmarkHistoryControlsToCurrentRail = null;

// rail.js (popup 상태 — DOM 의존)
let _getPopupLayout = null;
let _isPopupContentExpanded = null;
let _setPopupContentExpanded = null;

export function setHistoryCallbacks(callbacks) {
  _pulseTab = callbacks.pulseTab || null;
  _syncBookmarkHistoryControlsToCurrentRail = callbacks.syncBookmarkHistoryControlsToCurrentRail || null;
  _getPopupLayout = callbacks.getPopupLayout || null;
  _isPopupContentExpanded = callbacks.isPopupContentExpanded || null;
  _setPopupContentExpanded = callbacks.setPopupContentExpanded || null;
}

// ============================================================
// 복사 / 스택 유틸
// ============================================================

function cloneBookmarkHistoryValue(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return null;
  }
}

function cloneBookmarkHistoryEntry(entry) {
  return cloneBookmarkHistoryValue(entry);
}

function trimBookmarkHistoryStack(stack) {
  const nextStack = Array.isArray(stack) ? stack.slice() : [];
  if (nextStack.length <= BOOKMARK_HISTORY_LIMIT) {
    return nextStack;
  }
  return nextStack.slice(nextStack.length - BOOKMARK_HISTORY_LIMIT);
}

// ============================================================
// 스택 조회
// ============================================================

function getUndoBookmarkHistoryEntry() {
  const stack = Array.isArray(state.bookmarkUndoStack) ? state.bookmarkUndoStack : [];
  const entry = stack[stack.length - 1];
  if (!entry || entry.urlKey !== state.currentUrlKey) {
    return null;
  }
  return entry;
}

function getRedoBookmarkHistoryEntry() {
  const stack = Array.isArray(state.bookmarkRedoStack) ? state.bookmarkRedoStack : [];
  const entry = stack[stack.length - 1];
  if (!entry || entry.urlKey !== state.currentUrlKey) {
    return null;
  }
  return entry;
}

export function canUndoBookmarkHistory() {
  return Boolean(getUndoBookmarkHistoryEntry());
}

export function canRedoBookmarkHistory() {
  return Boolean(getRedoBookmarkHistoryEntry());
}

// ============================================================
// 스택 Push / Pop
// ============================================================

export function pushUndoBookmarkHistory(entry, options) {
  const nextOptions = options || {};
  const nextEntry = cloneBookmarkHistoryEntry(entry);
  if (!nextEntry) {
    return;
  }

  state.bookmarkUndoStack = trimBookmarkHistoryStack(
    (Array.isArray(state.bookmarkUndoStack) ? state.bookmarkUndoStack : []).concat(nextEntry)
  );
  if (!nextOptions.preserveRedo) {
    state.bookmarkRedoStack = [];
  }
}

function pushRedoBookmarkHistory(entry) {
  const nextEntry = cloneBookmarkHistoryEntry(entry);
  if (!nextEntry) {
    return;
  }

  state.bookmarkRedoStack = trimBookmarkHistoryStack(
    (Array.isArray(state.bookmarkRedoStack) ? state.bookmarkRedoStack : []).concat(nextEntry)
  );
}

function popUndoBookmarkHistory() {
  const stack = Array.isArray(state.bookmarkUndoStack) ? state.bookmarkUndoStack.slice() : [];
  const entry = stack.pop() || null;
  state.bookmarkUndoStack = stack;
  return entry;
}

function popRedoBookmarkHistory() {
  const stack = Array.isArray(state.bookmarkRedoStack) ? state.bookmarkRedoStack.slice() : [];
  const entry = stack.pop() || null;
  state.bookmarkRedoStack = stack;
  return entry;
}

// ============================================================
// 히스토리 엔트리 생성 / 복원
// ============================================================

export function buildBookmarkHistoryEntry(type, bookmark) {
  const bookmarkCopy = cloneBookmarkHistoryValue(bookmark);
  if (!bookmarkCopy || !bookmarkCopy.id) {
    return null;
  }

  return {
    type: type,
    urlKey: normalizeUrlKey(bookmarkCopy.url || state.currentUrlKey),
    bookmark: bookmarkCopy,
    popupLayout: cloneBookmarkHistoryValue(_getPopupLayout ? _getPopupLayout(bookmarkCopy.id) : null),
    popupPinned: isBookmarkPopupPinned(bookmarkCopy.id),
    expansionPinned: isBookmarkExpansionPinned(bookmarkCopy.id),
    popupContentExpanded: _isPopupContentExpanded ? _isPopupContentExpanded(bookmarkCopy.id) : false,
    manualOrderBookmarkIds: cloneBookmarkHistoryValue(state.manualOrderBookmarkIds)
  };
}

function addBookmarkInteractionId(bookmarkIds, bookmarkId) {
  const nextBookmarkIds = Array.isArray(bookmarkIds) ? bookmarkIds.slice() : [];
  if (!bookmarkId || nextBookmarkIds.indexOf(bookmarkId) >= 0) {
    return nextBookmarkIds;
  }
  nextBookmarkIds.push(bookmarkId);
  return nextBookmarkIds;
}

async function restoreBookmarkHistoryEntry(entry) {
  const bookmark = cloneBookmarkHistoryValue(entry && entry.bookmark);
  const urlKey = normalizeUrlKey(entry && (entry.urlKey || (bookmark && bookmark.url)) || "");
  if (!bookmark || !bookmark.id || !urlKey || urlKey !== state.currentUrlKey) {
    return null;
  }

  const nextBookmarks = state.currentBookmarks
    .filter(function (item) {
      return item && item.id !== bookmark.id;
    })
    .concat(bookmark);

  state.bookmarksByUrl[urlKey] = normalizeBookmarkList(nextBookmarks, urlKey);

  if (entry && entry.popupLayout) {
    state.popupLayoutByBookmarkId = Object.assign({}, state.popupLayoutByBookmarkId, {
      [bookmark.id]: normalizePopupLayout(entry.popupLayout)
    });
  } else {
    deletePopupLayout(bookmark.id);
  }

  state.pinnedBookmarkIds = sanitizeBookmarkInteractionIds(
    entry && entry.popupPinned
      ? addBookmarkInteractionId(state.pinnedBookmarkIds, bookmark.id)
      : removeBookmarkInteractionId(state.pinnedBookmarkIds, bookmark.id)
  );
  state.expandedPinnedBookmarkIds = sanitizeBookmarkInteractionIds(
    entry && entry.expansionPinned
      ? addBookmarkInteractionId(state.expandedPinnedBookmarkIds, bookmark.id)
      : removeBookmarkInteractionId(state.expandedPinnedBookmarkIds, bookmark.id)
  );
  if (_setPopupContentExpanded) _setPopupContentExpanded(bookmark.id, Boolean(entry && entry.popupContentExpanded));
  state.manualOrderBookmarkIds = normalizeManualOrderBookmarkIds(
    state.bookmarksByUrl[urlKey],
    entry && Array.isArray(entry.manualOrderBookmarkIds) ? entry.manualOrderBookmarkIds : state.manualOrderBookmarkIds
  );

  try {
    await persistBookmarks();
  } catch (error) {
    logWarn("restoreBookmarkHistoryEntry: persist failed", error);
  }
  await persistBookmarkUiState();
  await persistPopupLayouts();
  refreshCurrentBookmarksView();
  return bookmark;
}

// ============================================================
// 상태 스냅샷 기반 히스토리 (state-change)
// ============================================================

export function buildStateChangeEntry(action) {
  return {
    type: "state-change",
    action: action || "",
    urlKey: state.currentUrlKey,
    pinnedBookmarkIds: Array.isArray(state.pinnedBookmarkIds) ? state.pinnedBookmarkIds.slice() : [],
    expandedPinnedBookmarkIds: Array.isArray(state.expandedPinnedBookmarkIds) ? state.expandedPinnedBookmarkIds.slice() : [],
    expandedPopupContentBookmarkIds: Array.isArray(state.expandedPopupContentBookmarkIds) ? state.expandedPopupContentBookmarkIds.slice() : [],
    manualOrderBookmarkIds: Array.isArray(state.manualOrderBookmarkIds) ? state.manualOrderBookmarkIds.slice() : [],
    bookmarks: cloneBookmarkHistoryValue(state.currentBookmarks)
  };
}

async function restoreStateChangeEntry(entry) {
  if (!entry || entry.urlKey !== state.currentUrlKey) {
    return;
  }
  state.pinnedBookmarkIds = Array.isArray(entry.pinnedBookmarkIds) ? entry.pinnedBookmarkIds.slice() : [];
  state.expandedPinnedBookmarkIds = Array.isArray(entry.expandedPinnedBookmarkIds) ? entry.expandedPinnedBookmarkIds.slice() : [];
  state.expandedPopupContentBookmarkIds = Array.isArray(entry.expandedPopupContentBookmarkIds) ? entry.expandedPopupContentBookmarkIds.slice() : [];
  state.manualOrderBookmarkIds = Array.isArray(entry.manualOrderBookmarkIds) ? entry.manualOrderBookmarkIds.slice() : [];
  if (Array.isArray(entry.bookmarks)) {
    state.bookmarksByUrl[entry.urlKey] = normalizeBookmarkList(entry.bookmarks, entry.urlKey);
  }
  try {
    await persistBookmarks();
  } catch (error) {
    logWarn("restoreStateChangeEntry: persist failed", error);
  }
  await persistBookmarkUiState();
  refreshCurrentBookmarksView();
}

// ============================================================
// Undo / Redo 핸들러
// ============================================================

export async function handleUndoBookmarkHistory(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const entry = popUndoBookmarkHistory();
  if (!entry || entry.urlKey !== state.currentUrlKey) {
    if (entry) {
      pushUndoBookmarkHistory(entry, { preserveRedo: true });
    }
    return;
  }

  if (entry.type === "create") {
    invalidateAllBulkBackups();
    const currentBookmark = state.currentBookmarks.find(function (bookmark) {
      return bookmark && bookmark.id === entry.bookmark.id;
    });
    const redoEntry = currentBookmark ? buildBookmarkHistoryEntry("create", currentBookmark) : cloneBookmarkHistoryEntry(entry);
    await handleBookmarkRemove(entry.bookmark.id, { skipHistory: true });
    pushRedoBookmarkHistory(redoEntry);
    if (_syncBookmarkHistoryControlsToCurrentRail) _syncBookmarkHistoryControlsToCurrentRail();
    return;
  }

  if (entry.type === "delete") {
    invalidateAllBulkBackups();
    const restoredBookmark = await restoreBookmarkHistoryEntry(entry);
    pushRedoBookmarkHistory(entry);
    if (_syncBookmarkHistoryControlsToCurrentRail) _syncBookmarkHistoryControlsToCurrentRail();
    if (restoredBookmark) {
      if (_pulseTab) _pulseTab(restoredBookmark.id);
    }
    return;
  }

  if (entry.type === "state-change") {
    const redoEntry = buildStateChangeEntry(entry.action);
    await restoreStateChangeEntry(entry);
    pushRedoBookmarkHistory(redoEntry);
    if (_syncBookmarkHistoryControlsToCurrentRail) _syncBookmarkHistoryControlsToCurrentRail();
  }
}

export async function handleRedoBookmarkHistory(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const entry = popRedoBookmarkHistory();
  if (!entry || entry.urlKey !== state.currentUrlKey) {
    if (entry) {
      pushRedoBookmarkHistory(entry);
    }
    return;
  }

  if (entry.type === "create") {
    invalidateAllBulkBackups();
    const restoredBookmark = await restoreBookmarkHistoryEntry(entry);
    pushUndoBookmarkHistory(entry, { preserveRedo: true });
    if (_syncBookmarkHistoryControlsToCurrentRail) _syncBookmarkHistoryControlsToCurrentRail();
    if (restoredBookmark) {
      if (_pulseTab) _pulseTab(restoredBookmark.id);
    }
    return;
  }

  if (entry.type === "delete") {
    invalidateAllBulkBackups();
    const currentBookmark = state.currentBookmarks.find(function (bookmark) {
      return bookmark && bookmark.id === entry.bookmark.id;
    });
    const undoEntry = currentBookmark ? buildBookmarkHistoryEntry("delete", currentBookmark) : cloneBookmarkHistoryEntry(entry);
    await handleBookmarkRemove(entry.bookmark.id, { skipHistory: true });
    pushUndoBookmarkHistory(undoEntry, { preserveRedo: true });
    if (_syncBookmarkHistoryControlsToCurrentRail) _syncBookmarkHistoryControlsToCurrentRail();
    return;
  }

  if (entry.type === "state-change") {
    const undoEntry = buildStateChangeEntry(entry.action);
    await restoreStateChangeEntry(entry);
    pushUndoBookmarkHistory(undoEntry, { preserveRedo: true });
    if (_syncBookmarkHistoryControlsToCurrentRail) _syncBookmarkHistoryControlsToCurrentRail();
  }
}
