export interface BookmarkAnchor {
  anchorId: string;
  blockTag: string;
  blockFingerprint: string;
  messageFingerprint: string;
  messageRole: string;
  blockIndex: number;
  blockIndexInMessage: number;
  messageIndex: number;
  scrollRatio: number;
  selectionStart: number;
  selectionLength: number;
  selectionStartRatio: number;
  selectionPrefix: string;
  selectionSuffix: string;
  selectionContextFingerprint: string;
  selectionExactStart: number;
  selectionExactEnd: number;
  selectionRawPrefix: string;
  selectionRawSuffix: string;
  selectionDisplayText: string;
  selectionTextRaw: string;
  selectionCodeOffsetStart: number;
  selectionCodeOffsetEnd: number;
  selectionCodeLine: number;
  selectionCodeColumn: number;
  selectionCodeContextFingerprint: string;
  selectionSpanStartFingerprint: string;
  selectionSpanEndFingerprint: string;
  selectionSpanBlockCount: number;
  selectionSpanHead: string;
  selectionSpanMiddle: string;
  selectionSpanTail: string;
  selectionSpanMarkerSignature: string;
  sandboxCard: boolean;
  sandboxCardKey: string;
  sandboxCardIndex: number;
  sandboxCardFrameHref: string;
  sandboxCardFrameName: string;
  sandboxCardFrameSandbox: string;
  sandboxCardFrameFingerprint: string;
  sandboxCardFramePathFingerprint: string;
  sandboxCardContainerFingerprint: string;
  sandboxCardContainerPathFingerprint: string;
  sandboxCardPositionFingerprint: string;
  sandboxCardDomIndex: number;
  sandboxCardFrameSiblingIndex: number;
  sandboxCardFingerprint: string;
  frameRelay: boolean;
  frameRelayKey: string;
  frameRelayOrigin: string;
  frameRelayHref: string;
  frameRelayName: string;
  selectionText: string;
  blockTextSnippet: string;
  messageStableId: string;
}

export interface Bookmark {
  id: string;
  url: string;
  label: string;
  snippet: string;
  colorIndex: number;
  createdAt: number;
  anchor: BookmarkAnchor;
}

export interface BookmarkShardIndexEntry {
  urlKey: string;
  count: number;
  updatedAt: number;
}

export type BookmarkShardIndexMap = Record<string, BookmarkShardIndexEntry>;

export interface BookmarkUiStateEntry {
  pinnedBookmarkIds: string[];
  expandedPinnedBookmarkIds: string[];
  expandedPopupContentBookmarkIds: string[];
  manualOrderBookmarkIds: string[];
}

export type BookmarkUiStateMap = Record<string, BookmarkUiStateEntry>;

export interface PopupLayout {
  width: number;
  height: number;
}

export type PopupLayoutMap = Record<string, PopupLayout>;

export type BookmarkStateChangeAction =
  | "collapse-all"
  | "tab-extend"
  | "postit-extend"
  | "toggle-pin"
  | "toggle-expand"
  | "edit-label";

export interface BookmarkMutationHistoryEntry {
  type: "create" | "delete";
  urlKey: string;
  bookmark: Bookmark;
  popupLayout: PopupLayout | null;
  popupPinned: boolean;
  expansionPinned: boolean;
  popupContentExpanded: boolean;
  manualOrderBookmarkIds: string[];
}

export interface BookmarkStateHistoryEntry {
  type: "state-change";
  action: BookmarkStateChangeAction | string;
  urlKey: string;
  pinnedBookmarkIds: string[];
  expandedPinnedBookmarkIds: string[];
  expandedPopupContentBookmarkIds: string[];
  manualOrderBookmarkIds: string[];
  bookmarks: Bookmark[];
}

export type BookmarkHistoryEntry =
  | BookmarkMutationHistoryEntry
  | BookmarkStateHistoryEntry;
