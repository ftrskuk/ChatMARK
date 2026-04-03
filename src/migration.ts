import state from "./state.js";
import { storageGet, storageSet } from "./storage.js";
import {
  PRIMARY_STORAGE_KEY,
  BOOKMARK_SHARD_INDEX_STORAGE_KEY,
  BOOKMARK_UI_STATE_STORAGE_KEY,
  POPUP_LAYOUT_STORAGE_KEY,
} from "./constants.js";
import {
  normalizeUrlKey,
  extractBookmarkBuckets,
  normalizeBookmarkList,
  getBookmarkShardBucketStorageKey,
  getBookmarkShardUrlHash,
  normalizeBookmarkShardIndexMap,
  buildBookmarkShardIndexEntry,
  getBookmarkUiStateShardStorageKey,
  getPopupLayoutShardStorageKey,
} from "./bookmarks.js";
import type {
  Bookmark,
  BookmarkShardIndexMap,
  BookmarkUiStateEntry,
  PopupLayoutMap,
} from "../types/bookmark.js";

export interface MigrationCallbacks {
  normalizeBookmarkUiStateMap?:
    | ((value: unknown) => Record<string, BookmarkUiStateEntry>)
    | null;
  normalizeBookmarkUiStateEntry?:
    | ((value: unknown) => BookmarkUiStateEntry)
    | null;
  hasMeaningfulBookmarkUiStateEntry?:
    | ((entry: BookmarkUiStateEntry) => boolean)
    | null;
  normalizePopupLayoutMap?: ((value: unknown) => PopupLayoutMap) | null;
}

let _normalizeBookmarkUiStateMap:
  | ((value: unknown) => Record<string, BookmarkUiStateEntry>)
  | null = null;
let _normalizeBookmarkUiStateEntry:
  | ((value: unknown) => BookmarkUiStateEntry)
  | null = null;
let _hasMeaningfulBookmarkUiStateEntry:
  | ((entry: BookmarkUiStateEntry) => boolean)
  | null = null;
let _normalizePopupLayoutMap: ((value: unknown) => PopupLayoutMap) | null =
  null;

export function setMigrationCallbacks(callbacks: MigrationCallbacks): void {
  _normalizeBookmarkUiStateMap = callbacks.normalizeBookmarkUiStateMap || null;
  _normalizeBookmarkUiStateEntry =
    callbacks.normalizeBookmarkUiStateEntry || null;
  _hasMeaningfulBookmarkUiStateEntry =
    callbacks.hasMeaningfulBookmarkUiStateEntry || null;
  _normalizePopupLayoutMap = callbacks.normalizePopupLayoutMap || null;
}

export async function loadLegacyBookmarksForCurrentUrl(
  urlKey: string,
): Promise<Bookmark[]> {
  const normalizedUrlKey = normalizeUrlKey(urlKey);
  if (!normalizedUrlKey) {
    return [];
  }

  const rawStorage = await storageGet([
    PRIMARY_STORAGE_KEY,
    "chatgptBookmarksByUrl",
    "bookmarks",
    normalizedUrlKey,
  ]);
  const buckets = extractBookmarkBuckets(rawStorage);
  return normalizeBookmarkList(
    buckets[normalizedUrlKey] || [],
    normalizedUrlKey,
  );
}

export async function migrateLegacyBookmarksToBookmarkShard(
  urlKey: string,
  bookmarks: Bookmark[],
): Promise<void> {
  const normalizedUrlKey = normalizeUrlKey(urlKey);
  const bucketKey = getBookmarkShardBucketStorageKey(normalizedUrlKey);
  const urlHash = getBookmarkShardUrlHash(normalizedUrlKey);
  if (!normalizedUrlKey || !bucketKey || !urlHash) {
    return;
  }

  const nextIndex = Object.assign(
    {},
    normalizeBookmarkShardIndexMap(state.bookmarkShardIndexByUrlHash),
  );
  const normalizedBookmarks = normalizeBookmarkList(
    bookmarks || [],
    normalizedUrlKey,
  );
  const payload: Record<string, unknown> = {};
  payload[bucketKey] = normalizedBookmarks;
  payload[BOOKMARK_SHARD_INDEX_STORAGE_KEY] = Object.assign({}, nextIndex, {
    [urlHash]: buildBookmarkShardIndexEntry(
      normalizedUrlKey,
      normalizedBookmarks,
    ),
  });
  state.bookmarkShardIndexByUrlHash = normalizeBookmarkShardIndexMap(
    payload[BOOKMARK_SHARD_INDEX_STORAGE_KEY] as BookmarkShardIndexMap,
  );
  await storageSet(payload);
}

export async function loadLegacyBookmarkUiStateForCurrentUrl(
  urlKey: string,
): Promise<BookmarkUiStateEntry | null> {
  const normalizedUrlKey = normalizeUrlKey(urlKey);
  if (!normalizedUrlKey) {
    return null;
  }

  const rawStorage = await storageGet([BOOKMARK_UI_STATE_STORAGE_KEY]);
  const normalizedMap = _normalizeBookmarkUiStateMap
    ? _normalizeBookmarkUiStateMap(rawStorage[BOOKMARK_UI_STATE_STORAGE_KEY])
    : {};
  const entry: BookmarkUiStateEntry = _normalizeBookmarkUiStateEntry
    ? _normalizeBookmarkUiStateEntry(normalizedMap[normalizedUrlKey])
    : normalizedMap[normalizedUrlKey] || {
        pinnedBookmarkIds: [],
        expandedPinnedBookmarkIds: [],
        expandedPopupContentBookmarkIds: [],
        manualOrderBookmarkIds: [],
      };
  return _hasMeaningfulBookmarkUiStateEntry
    ? _hasMeaningfulBookmarkUiStateEntry(entry)
      ? entry
      : null
    : null;
}

export async function migrateLegacyBookmarkUiStateToShard(
  urlKey: string,
  entry: BookmarkUiStateEntry,
): Promise<void> {
  const normalizedUrlKey = normalizeUrlKey(urlKey);
  const uiStateKey = getBookmarkUiStateShardStorageKey(normalizedUrlKey);
  const normalizedEntry: BookmarkUiStateEntry = _normalizeBookmarkUiStateEntry
    ? _normalizeBookmarkUiStateEntry(entry)
    : entry;
  if (
    !normalizedUrlKey ||
    !uiStateKey ||
    !(_hasMeaningfulBookmarkUiStateEntry
      ? _hasMeaningfulBookmarkUiStateEntry(normalizedEntry)
      : false)
  ) {
    return;
  }

  const payload: Record<string, unknown> = {};
  payload[uiStateKey] = normalizedEntry;
  await storageSet(payload);
}

export async function loadLegacyPopupLayoutsForCurrentUrl(
  urlKey: string,
  bookmarks: Bookmark[],
): Promise<PopupLayoutMap> {
  const normalizedUrlKey = normalizeUrlKey(urlKey);
  if (!normalizedUrlKey) {
    return {};
  }

  const knownBookmarkIds = new Set(
    (Array.isArray(bookmarks) ? bookmarks : [])
      .map(function (bookmark) {
        return bookmark && bookmark.id ? bookmark.id : "";
      })
      .filter(Boolean),
  );
  if (!knownBookmarkIds.size) {
    return {};
  }

  const rawStorage = await storageGet([POPUP_LAYOUT_STORAGE_KEY]);
  const normalizedLayouts = _normalizePopupLayoutMap
    ? _normalizePopupLayoutMap(rawStorage[POPUP_LAYOUT_STORAGE_KEY])
    : {};
  const nextLayouts: PopupLayoutMap = {};
  Object.keys(normalizedLayouts).forEach(function (bookmarkId) {
    if (!knownBookmarkIds.has(bookmarkId)) {
      return;
    }
    nextLayouts[bookmarkId] = normalizedLayouts[bookmarkId];
  });
  return nextLayouts;
}

export async function migrateLegacyPopupLayoutsToShard(
  urlKey: string,
  layouts: PopupLayoutMap,
): Promise<void> {
  const normalizedUrlKey = normalizeUrlKey(urlKey);
  const popupLayoutKey = getPopupLayoutShardStorageKey(normalizedUrlKey);
  const normalizedLayouts = _normalizePopupLayoutMap
    ? _normalizePopupLayoutMap(layouts)
    : layouts || {};
  if (
    !normalizedUrlKey ||
    !popupLayoutKey ||
    !Object.keys(normalizedLayouts).length
  ) {
    return;
  }

  const payload: Record<string, unknown> = {};
  payload[popupLayoutKey] = normalizedLayouts;
  await storageSet(payload);
}
