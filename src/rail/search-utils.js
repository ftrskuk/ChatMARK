import { normalizeText } from "../text.js";
import { MAX_BOOKMARKS_PER_PAGE } from "../constants.js";
import { getDisplayOrderedBookmarks } from "./ordering.js";

export function getNormalizedBookmarkSearchQuery(value) {
  return normalizeText(value).toLowerCase();
}

export function getBookmarkSearchText(bookmark) {
  const anchor = bookmark && bookmark.anchor ? bookmark.anchor : null;
  return [
    bookmark && bookmark.label,
    bookmark && bookmark.snippet,
    anchor && anchor.selectionDisplayText,
    anchor && anchor.selectionTextRaw,
    anchor && anchor.selectionText,
    anchor && anchor.blockTextSnippet,
  ]
    .map(function (value) {
      return getNormalizedBookmarkSearchQuery(value);
    })
    .filter(Boolean)
    .join(" ");
}

export function bookmarkMatchesSearchQuery(bookmark, normalizedQuery) {
  if (!bookmark || !normalizedQuery) {
    return !normalizedQuery;
  }

  return getBookmarkSearchText(bookmark).indexOf(normalizedQuery) >= 0;
}

export function getFilteredBookmarks(
  currentBookmarks,
  manualOrderBookmarkIds,
  bookmarkSearchQuery,
) {
  const normalizedQuery = getNormalizedBookmarkSearchQuery(bookmarkSearchQuery);
  const displayOrderedBookmarks = getDisplayOrderedBookmarks(
    currentBookmarks,
    manualOrderBookmarkIds,
  );
  if (!normalizedQuery) {
    return displayOrderedBookmarks;
  }

  return displayOrderedBookmarks.filter(function (bookmark) {
    return bookmarkMatchesSearchQuery(bookmark, normalizedQuery);
  });
}

export function getBookmarkSearchStatusText(options) {
  const totalCount = Number(options && options.totalCount) || 0;
  const filteredCount = Number(options && options.filteredCount) || 0;
  const hasQuery = Boolean(options && options.hasQuery);

  if (!totalCount) {
    return hasQuery ? "No saved bookmarks yet" : "Select text, then press MARK";
  }

  if (!hasQuery) {
    if (totalCount >= MAX_BOOKMARKS_PER_PAGE) {
      return "All used";
    }
    return totalCount + "/" + MAX_BOOKMARKS_PER_PAGE + " saved";
  }

  return filteredCount + "/" + totalCount + " shown";
}

export function getBookmarkSearchStatusTitle(options) {
  const totalCount = Number(options && options.totalCount) || 0;
  const filteredCount = Number(options && options.filteredCount) || 0;
  const hasQuery = Boolean(options && options.hasQuery);

  if (!totalCount) {
    return hasQuery
      ? "There are no saved bookmarks on this page yet."
      : "Select any text in the conversation, then click MARK to save your first bookmark.";
  }

  if (!hasQuery) {
    return totalCount === 1
      ? "1 bookmark is saved on this page. (1 of " +
          MAX_BOOKMARKS_PER_PAGE +
          ")"
      : totalCount +
          " bookmarks are saved on this page. (" +
          totalCount +
          " of " +
          MAX_BOOKMARKS_PER_PAGE +
          ")";
  }

  return filteredCount === 1
    ? "1 of " + totalCount + " saved bookmarks matches this search."
    : filteredCount +
        " of " +
        totalCount +
        " saved bookmarks match this search.";
}

export function highlightMatchInElement(el, query) {
  var text = el.textContent;
  var lower = text.toLowerCase();
  var idx = lower.indexOf(query);
  if (idx < 0) return;
  var before = document.createTextNode(text.slice(0, idx));
  var mark = document.createElement("mark");
  mark.className = "cgptbm-search-match";
  mark.textContent = text.slice(idx, idx + query.length);
  var after = document.createTextNode(text.slice(idx + query.length));
  el.textContent = "";
  el.appendChild(before);
  el.appendChild(mark);
  el.appendChild(after);
}
