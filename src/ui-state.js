// ============================================================
// store/ui-state.js — 북마크 UI 상태 영속화 (핀, 확장, 정렬 등)
// ============================================================
// 비유: "인테리어 설정 저장". 어떤 북마크가 펼쳐져 있는지, 핀되어 있는지 등
//       UI 레이아웃 상태를 storage에 저장/복원합니다.

import state from './state.js';
import { storageGet, storageSet, storageRemove } from './storage.js';
import {
  normalizeUrlKey,
  getBookmarkUiStateShardStorageKey,
  getPopupLayoutShardStorageKey
} from './bookmarks.js';

// ---- 콜백 주입 (순환 의존 방지) ----
// UI layer (store → ui 방향 금지)
let _releaseResizeLockedExpandedBookmarkForInteraction = null;
let _syncExpandedBookmarkState = null;
let _syncHistoryControls = null;
let _pushStateChangeEntry = null;

// popup.js (DOM 측정 체인 포함)
let _normalizePopupLayout = null;

// pre-collapse guard (rail.js 측 잠금 해제용)
let _preCollapseGuard = null;

export function setUiStateCallbacks(callbacks) {
  _releaseResizeLockedExpandedBookmarkForInteraction = callbacks.releaseResizeLockedExpandedBookmarkForInteraction || null;
  _syncExpandedBookmarkState = callbacks.syncExpandedBookmarkState || null;
  _syncHistoryControls = callbacks.syncHistoryControls || null;
  _pushStateChangeEntry = callbacks.pushStateChangeEntry || null;
  _normalizePopupLayout = callbacks.normalizePopupLayout || null;
  _preCollapseGuard = callbacks.preCollapseGuard || null;
}

// ---- Collapse/Expand-all 백업 (메모리 전용, 비영속) ----
// 상호 배타: 한쪽 백업이 존재하면 다른 쪽은 활성화 불가
let _collapseBackup = null;
// _expandBackup / _expandPhase 제거됨 — 독립 버튼 방식으로 전환

export function invalidateAllBulkBackups() {
  _collapseBackup = null;
}

export function hasCollapseBackup() {
  return _collapseBackup !== null;
}

export function hasExpandBackup() {
  return false;
}

export function hasExpandedPinnedState() {
  return Boolean(
    (Array.isArray(state.pinnedBookmarkIds) && state.pinnedBookmarkIds.length) ||
    (Array.isArray(state.expandedPinnedBookmarkIds) && state.expandedPinnedBookmarkIds.length) ||
    (Array.isArray(state.expandedPopupContentBookmarkIds) && state.expandedPopupContentBookmarkIds.length)
  );
}

function hasCollapsedBookmarks() {
  const currentIds = Array.isArray(state.currentBookmarks)
    ? state.currentBookmarks.map(function (b) { return b.id; })
    : [];
  if (!currentIds.length) return false;
  const pinned = Array.isArray(state.pinnedBookmarkIds) ? state.pinnedBookmarkIds : [];
  const expanded = Array.isArray(state.expandedPinnedBookmarkIds) ? state.expandedPinnedBookmarkIds : [];
  return currentIds.some(function (id) {
    return pinned.indexOf(id) < 0 || expanded.indexOf(id) < 0;
  });
}

export function canCollapseAll() {
  return !_collapseBackup && hasExpandedPinnedState();
}

export function canExpandAll() {
  return hasCollapsedBookmarks();
}

export async function collapseAllBookmarks() {
  if (!hasExpandedPinnedState()) {
    return;
  }

  if (_pushStateChangeEntry) _pushStateChangeEntry("collapse-all");
  if (_preCollapseGuard) _preCollapseGuard();



  _collapseBackup = {
    pinnedBookmarkIds: (Array.isArray(state.pinnedBookmarkIds) ? state.pinnedBookmarkIds.slice() : []),
    expandedPinnedBookmarkIds: (Array.isArray(state.expandedPinnedBookmarkIds) ? state.expandedPinnedBookmarkIds.slice() : []),
    expandedPopupContentBookmarkIds: (Array.isArray(state.expandedPopupContentBookmarkIds) ? state.expandedPopupContentBookmarkIds.slice() : []),
    urlKey: state.currentUrlKey
  };

  state.pinnedBookmarkIds = [];
  state.expandedPinnedBookmarkIds = [];
  state.expandedPopupContentBookmarkIds = [];
  if (_syncExpandedBookmarkState) _syncExpandedBookmarkState({ full: true });
  await persistBookmarkUiState();
}

export async function restoreCollapsedBookmarks() {
  if (!_collapseBackup) {
    return;
  }

  if (_collapseBackup.urlKey !== state.currentUrlKey) {
    _collapseBackup = null;
    return;
  }

  state.pinnedBookmarkIds = _collapseBackup.pinnedBookmarkIds.slice();
  state.expandedPinnedBookmarkIds = _collapseBackup.expandedPinnedBookmarkIds.slice();
  state.expandedPopupContentBookmarkIds = _collapseBackup.expandedPopupContentBookmarkIds.slice();
  _collapseBackup = null;
  if (_syncExpandedBookmarkState) _syncExpandedBookmarkState({ full: true });
  await persistBookmarkUiState();
}

// ---- 독립 버튼: Tab Extension / Post-it Extension ----

// Tab Extension: pin on/off 토글 (post-it 건드리지 않음)
export async function expandAllBookmarks() {
  const currentIds = Array.isArray(state.currentBookmarks)
    ? state.currentBookmarks.map(function (b) { return b.id; })
    : [];
  if (!currentIds.length) {
    return;
  }

  if (_pushStateChangeEntry) _pushStateChangeEntry("tab-extend");
  if (_preCollapseGuard) _preCollapseGuard();
  if (_collapseBackup) _collapseBackup = null;

  if (isAllPinned()) {
    state.expandedPinnedBookmarkIds = [];
  } else {
    state.expandedPinnedBookmarkIds = currentIds.slice();
  }
  if (_syncExpandedBookmarkState) _syncExpandedBookmarkState({ full: true });
  await persistBookmarkUiState();
}

// 모두 pinned 여부
export function isAllPinned() {
  var currentIds = Array.isArray(state.currentBookmarks)
    ? state.currentBookmarks.map(function (b) { return b.id; })
    : [];
  if (!currentIds.length) return false;
  var expanded = Array.isArray(state.expandedPinnedBookmarkIds) ? state.expandedPinnedBookmarkIds : [];
  return currentIds.every(function (id) { return expanded.indexOf(id) >= 0; });
}

// Tab Extension disabled 조건: 북마크 없을 때만
export function canExpandAllTabs() {
  var currentIds = Array.isArray(state.currentBookmarks)
    ? state.currentBookmarks.map(function (b) { return b.id; })
    : [];
  return currentIds.length > 0;
}

// Post-it Extension: on/off 토글 (pin 건드리지 않음)
export async function expandAllPostits() {
  const currentIds = Array.isArray(state.currentBookmarks)
    ? state.currentBookmarks.map(function (b) { return b.id; })
    : [];
  if (!currentIds.length) {
    return;
  }

  if (_pushStateChangeEntry) _pushStateChangeEntry("postit-extend");
  if (isAllPostits()) {
    state.pinnedBookmarkIds = [];
  } else {
    state.pinnedBookmarkIds = currentIds.slice();
  }
  if (_syncExpandedBookmarkState) _syncExpandedBookmarkState({ full: true });
  await persistBookmarkUiState();
}

// 모든 post-it 표시 여부
export function isAllPostits() {
  var currentIds = Array.isArray(state.currentBookmarks)
    ? state.currentBookmarks.map(function (b) { return b.id; })
    : [];
  if (!currentIds.length) return false;
  var pinned = Array.isArray(state.pinnedBookmarkIds) ? state.pinnedBookmarkIds : [];
  return currentIds.every(function (id) { return pinned.indexOf(id) >= 0; });
}

// Post-it Extension disabled 조건: 북마크 없을 때만
export function canExpandAllPostits() {
  var currentIds = Array.isArray(state.currentBookmarks)
    ? state.currentBookmarks.map(function (b) { return b.id; })
    : [];
  return currentIds.length > 0;
}

// ============================================================
// 북마크 ID 유틸
// ============================================================

export function buildKnownBookmarkIdMap(bookmarks) {
  const knownBookmarkIds = {};
  (Array.isArray(bookmarks) ? bookmarks : []).forEach(function (bookmark) {
    if (bookmark && bookmark.id) {
      knownBookmarkIds[bookmark.id] = true;
    }
  });
  return knownBookmarkIds;
}

function getBookmarkIdList(bookmarks) {
  return (Array.isArray(bookmarks) ? bookmarks : [])
    .map(function (bookmark) {
      return bookmark && bookmark.id ? bookmark.id : "";
    })
    .filter(Boolean);
}

function areBookmarkIdListsEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

// ============================================================
// Interaction ID 관리
// ============================================================

export function sanitizeBookmarkInteractionId(bookmarkId, knownBookmarkIds) {
  if (!bookmarkId) {
    return "";
  }

  if (knownBookmarkIds && knownBookmarkIds[bookmarkId]) {
    return bookmarkId;
  }

  return "";
}

export function sanitizeBookmarkInteractionIds(bookmarkIds, knownBookmarkIds) {
  if (!Array.isArray(bookmarkIds) || !bookmarkIds.length) {
    return [];
  }

  const seen = {};
  return bookmarkIds.filter(function (bookmarkId) {
    if (!bookmarkId || seen[bookmarkId]) {
      return false;
    }
    if (knownBookmarkIds && !knownBookmarkIds[bookmarkId]) {
      return false;
    }
    seen[bookmarkId] = true;
    return true;
  });
}

export function removeBookmarkInteractionId(bookmarkIds, bookmarkId) {
  if (!Array.isArray(bookmarkIds) || !bookmarkIds.length) {
    return [];
  }

  return bookmarkIds.filter(function (id) {
    return id && id !== bookmarkId;
  });
}

// ============================================================
// 수동 정렬
// ============================================================

function getDisplayOrderedBookmarks(bookmarks, manualOrderBookmarkIds) {
  const source = Array.isArray(bookmarks) ? bookmarks.slice() : [];
  if (!source.length || !Array.isArray(manualOrderBookmarkIds) || !manualOrderBookmarkIds.length) {
    return source;
  }

  const bookmarkById = {};
  source.forEach(function (bookmark) {
    if (bookmark && bookmark.id) {
      bookmarkById[bookmark.id] = bookmark;
    }
  });

  const ordered = [];
  const usedBookmarkIds = {};
  manualOrderBookmarkIds.forEach(function (bookmarkId) {
    if (!bookmarkId || usedBookmarkIds[bookmarkId] || !bookmarkById[bookmarkId]) {
      return;
    }

    usedBookmarkIds[bookmarkId] = true;
    ordered.push(bookmarkById[bookmarkId]);
  });

  source.forEach(function (bookmark) {
    if (!bookmark || !bookmark.id || usedBookmarkIds[bookmark.id]) {
      return;
    }

    ordered.push(bookmark);
  });

  return ordered;
}

export function normalizeManualOrderBookmarkIds(bookmarks, manualOrderBookmarkIds) {
  const source = Array.isArray(bookmarks) ? bookmarks.slice() : [];
  if (!source.length) {
    return [];
  }

  const knownBookmarkIds = buildKnownBookmarkIdMap(source);
  const sanitizedManualOrder = sanitizeBookmarkInteractionIds(manualOrderBookmarkIds, knownBookmarkIds);
  if (!sanitizedManualOrder.length) {
    return [];
  }

  const defaultIds = getBookmarkIdList(source);
  const orderedIds = getBookmarkIdList(getDisplayOrderedBookmarks(source, sanitizedManualOrder));
  if (!orderedIds.length || areBookmarkIdListsEqual(defaultIds, orderedIds)) {
    return [];
  }

  return orderedIds;
}

// ============================================================
// UI State 정규화 + 영속화
// ============================================================

export function normalizeBookmarkUiStateMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized = {};
  Object.keys(value).forEach(function (urlKey) {
    const normalizedUrlKey = normalizeUrlKey(urlKey);
    if (!normalizedUrlKey) {
      return;
    }

    const entry = normalizeBookmarkUiStateEntry(value[urlKey]);
    if (
      !entry.pinnedBookmarkIds.length &&
      !entry.expandedPinnedBookmarkIds.length &&
      !entry.expandedPopupContentBookmarkIds.length &&
      !entry.manualOrderBookmarkIds.length
    ) {
      return;
    }

    normalized[normalizedUrlKey] = entry;
  });

  return normalized;
}

export function normalizeBookmarkUiStateEntry(value) {
  const entry = value && typeof value === "object" ? value : {};
  return {
    pinnedBookmarkIds: sanitizeBookmarkInteractionIds(entry.pinnedBookmarkIds),
    expandedPinnedBookmarkIds: sanitizeBookmarkInteractionIds(entry.expandedPinnedBookmarkIds),
    expandedPopupContentBookmarkIds: sanitizeBookmarkInteractionIds(entry.expandedPopupContentBookmarkIds),
    manualOrderBookmarkIds: sanitizeBookmarkInteractionIds(entry.manualOrderBookmarkIds)
  };
}

export function hasMeaningfulBookmarkUiStateEntry(entry) {
  return Boolean(
    entry &&
    (
      (Array.isArray(entry.pinnedBookmarkIds) && entry.pinnedBookmarkIds.length) ||
      (Array.isArray(entry.expandedPinnedBookmarkIds) && entry.expandedPinnedBookmarkIds.length) ||
      (Array.isArray(entry.expandedPopupContentBookmarkIds) && entry.expandedPopupContentBookmarkIds.length) ||
      (Array.isArray(entry.manualOrderBookmarkIds) && entry.manualOrderBookmarkIds.length)
    )
  );
}

export function buildSingleBookmarkUiStateObject(urlKey, entry) {
  const normalizedUrlKey = normalizeUrlKey(urlKey);
  const normalizedEntry = normalizeBookmarkUiStateEntry(entry);
  if (!normalizedUrlKey || !hasMeaningfulBookmarkUiStateEntry(normalizedEntry)) {
    return {};
  }

  const nextState = {};
  nextState[normalizedUrlKey] = normalizedEntry;
  return nextState;
}

function getCurrentBookmarkUiStateEntry() {
  return normalizeBookmarkUiStateEntry({
    pinnedBookmarkIds: state.pinnedBookmarkIds,
    expandedPinnedBookmarkIds: state.expandedPinnedBookmarkIds,
    expandedPopupContentBookmarkIds: state.expandedPopupContentBookmarkIds,
    manualOrderBookmarkIds: state.manualOrderBookmarkIds
  });
}

export function applyCurrentBookmarkUiState() {
  invalidateAllBulkBackups();
  const entry = normalizeBookmarkUiStateEntry(state.bookmarkUiStateByUrl[state.currentUrlKey]);
  const knownBookmarkIds = buildKnownBookmarkIdMap(state.currentBookmarks);
  state.pinnedBookmarkIds = sanitizeBookmarkInteractionIds(entry.pinnedBookmarkIds, knownBookmarkIds);
  state.expandedPinnedBookmarkIds = sanitizeBookmarkInteractionIds(entry.expandedPinnedBookmarkIds, knownBookmarkIds);
  state.expandedPopupContentBookmarkIds = sanitizeBookmarkInteractionIds(entry.expandedPopupContentBookmarkIds, knownBookmarkIds);
  state.manualOrderBookmarkIds = normalizeManualOrderBookmarkIds(state.currentBookmarks, entry.manualOrderBookmarkIds);
}

export async function persistBookmarkUiState() {
  const entry = getCurrentBookmarkUiStateEntry();
  const normalizedUrlKey = normalizeUrlKey(state.currentUrlKey);
  const uiStateKey = getBookmarkUiStateShardStorageKey(normalizedUrlKey);

  if (!normalizedUrlKey || !uiStateKey) {
    return;
  }

  state.bookmarkUiStateByUrl = buildSingleBookmarkUiStateObject(normalizedUrlKey, entry);
  state.bookmarkUiStateReloadSuppressAt = Date.now();

  if (!hasMeaningfulBookmarkUiStateEntry(entry)) {
    await storageRemove(uiStateKey);
    return;
  }

  const payload = {};
  payload[uiStateKey] = normalizeBookmarkUiStateEntry(entry);
  await storageSet(payload);
}

// ============================================================
// 핀/확장 토글
// ============================================================

export async function togglePinnedBookmark(bookmarkId) {
  const nextBookmarkId = bookmarkId || "";
  if (!nextBookmarkId) {
    return;
  }

  if (_pushStateChangeEntry) _pushStateChangeEntry("toggle-pin");
  invalidateAllBulkBackups();
  if (_releaseResizeLockedExpandedBookmarkForInteraction) _releaseResizeLockedExpandedBookmarkForInteraction(nextBookmarkId);
  const pinnedBookmarkIds = Array.isArray(state.pinnedBookmarkIds) ? state.pinnedBookmarkIds.slice() : [];
  const pinnedIndex = pinnedBookmarkIds.indexOf(nextBookmarkId);
  if (pinnedIndex >= 0) {
    pinnedBookmarkIds.splice(pinnedIndex, 1);
  } else {
    pinnedBookmarkIds.push(nextBookmarkId);
  }

  state.pinnedBookmarkIds = pinnedBookmarkIds;
  if (_syncExpandedBookmarkState) _syncExpandedBookmarkState({ full: true });
  if (_syncHistoryControls) _syncHistoryControls();
  await persistBookmarkUiState();
}

export async function toggleExpandedPinnedBookmark(bookmarkId) {
  const nextBookmarkId = bookmarkId || "";
  if (!nextBookmarkId) {
    return;
  }

  if (_pushStateChangeEntry) _pushStateChangeEntry("toggle-expand");
  invalidateAllBulkBackups();
  if (_releaseResizeLockedExpandedBookmarkForInteraction) _releaseResizeLockedExpandedBookmarkForInteraction(nextBookmarkId);
  const expandedPinnedBookmarkIds = Array.isArray(state.expandedPinnedBookmarkIds)
    ? state.expandedPinnedBookmarkIds.slice()
    : [];
  const pinnedIndex = expandedPinnedBookmarkIds.indexOf(nextBookmarkId);
  if (pinnedIndex >= 0) {
    expandedPinnedBookmarkIds.splice(pinnedIndex, 1);
  } else {
    expandedPinnedBookmarkIds.push(nextBookmarkId);
  }

  state.expandedPinnedBookmarkIds = expandedPinnedBookmarkIds;
  if (_syncExpandedBookmarkState) _syncExpandedBookmarkState({ full: true });
  if (_syncHistoryControls) _syncHistoryControls();
  await persistBookmarkUiState();
}

export function isBookmarkPopupPinned(bookmarkId) {
  return Boolean(bookmarkId && Array.isArray(state.pinnedBookmarkIds) && state.pinnedBookmarkIds.indexOf(bookmarkId) >= 0);
}

export function isBookmarkExpansionPinned(bookmarkId) {
  return Boolean(bookmarkId && Array.isArray(state.expandedPinnedBookmarkIds) && state.expandedPinnedBookmarkIds.indexOf(bookmarkId) >= 0);
}

// ============================================================
// 팝업 레이아웃 영속화
// ============================================================

export function deletePopupLayout(bookmarkId) {
  if (!bookmarkId || !state.popupLayoutByBookmarkId || !Object.prototype.hasOwnProperty.call(state.popupLayoutByBookmarkId, bookmarkId)) {
    return false;
  }

  const nextLayouts = Object.assign({}, state.popupLayoutByBookmarkId);
  delete nextLayouts[bookmarkId];
  state.popupLayoutByBookmarkId = nextLayouts;
  return true;
}

export function normalizePopupLayoutMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized = {};
  Object.keys(value).forEach(function (bookmarkId) {
    const layout = _normalizePopupLayout ? _normalizePopupLayout(value[bookmarkId]) : null;
    if (!layout) {
      return;
    }
    normalized[bookmarkId] = layout;
  });
  return normalized;
}

export async function persistPopupLayouts() {
  const normalizedUrlKey = normalizeUrlKey(state.currentUrlKey);
  const popupLayoutKey = getPopupLayoutShardStorageKey(normalizedUrlKey);
  if (!normalizedUrlKey || !popupLayoutKey) {
    return;
  }

  state.popupLayoutReloadSuppressAt = Date.now();

  const knownBookmarkIds = new Set(
    state.currentBookmarks.map(function (bookmark) {
      return bookmark && bookmark.id ? bookmark.id : "";
    }).filter(Boolean)
  );
  const nextLayouts = {};
  Object.keys(normalizePopupLayoutMap(state.popupLayoutByBookmarkId)).forEach(function (bookmarkId) {
    if (!knownBookmarkIds.has(bookmarkId)) {
      return;
    }
    nextLayouts[bookmarkId] = state.popupLayoutByBookmarkId[bookmarkId];
  });
  state.popupLayoutByBookmarkId = normalizePopupLayoutMap(nextLayouts);

  if (!Object.keys(state.popupLayoutByBookmarkId).length) {
    await storageRemove(popupLayoutKey);
    return;
  }

  const payload = {};
  payload[popupLayoutKey] = normalizePopupLayoutMap(state.popupLayoutByBookmarkId);
  await storageSet(payload);
}
