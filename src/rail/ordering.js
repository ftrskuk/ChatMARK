export function getDisplayOrderedBookmarks(bookmarks, manualOrderBookmarkIds) {
  const source = Array.isArray(bookmarks) ? bookmarks.slice() : [];
  if (
    !source.length ||
    !Array.isArray(manualOrderBookmarkIds) ||
    !manualOrderBookmarkIds.length
  ) {
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
    if (
      !bookmarkId ||
      usedBookmarkIds[bookmarkId] ||
      !bookmarkById[bookmarkId]
    ) {
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

export function getBookmarkIdList(bookmarks) {
  return (Array.isArray(bookmarks) ? bookmarks : [])
    .map(function (bookmark) {
      return bookmark && bookmark.id ? bookmark.id : "";
    })
    .filter(Boolean);
}

export function areBookmarkIdListsEqual(left, right) {
  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length !== right.length
  ) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export function computeTabPositions(bookmarks, options, layoutConfig) {
  const nextOptions = options || {};
  const nextLayoutConfig = layoutConfig || {};
  const topLimit = Number(nextLayoutConfig.topLimit) || 0;
  const collapsedHeight = Number(nextLayoutConfig.collapsedHeight) || 0;
  const tabStackGap = Number(nextLayoutConfig.tabStackGap) || 0;
  const clamp = nextLayoutConfig.clamp;
  const expandedBookmarkId = nextOptions.expandedBookmarkId || "";
  const heightByBookmarkId =
    nextOptions.heightByBookmarkId &&
    typeof nextOptions.heightByBookmarkId === "object"
      ? nextOptions.heightByBookmarkId
      : null;
  const expandedHeight = Number.isFinite(nextOptions.expandedHeight)
    ? Math.max(collapsedHeight, Math.ceil(nextOptions.expandedHeight))
    : collapsedHeight;
  const previewGapIndex = Number.isInteger(nextOptions.previewGapIndex)
    ? typeof clamp === "function"
      ? clamp(
          nextOptions.previewGapIndex,
          0,
          Array.isArray(bookmarks) ? bookmarks.length : 0,
        )
      : nextOptions.previewGapIndex
    : -1;
  const previewGapHeight = Number.isFinite(nextOptions.previewGapHeight)
    ? Math.max(0, Math.ceil(nextOptions.previewGapHeight))
    : 0;
  const sorted = bookmarks.map(function (bookmark) {
    return {
      bookmark: bookmark,
    };
  });

  const positioned = sorted.map(function (entry) {
    const measuredHeight = heightByBookmarkId
      ? heightByBookmarkId[entry.bookmark.id]
      : NaN;
    const height = Number.isFinite(measuredHeight)
      ? Math.max(collapsedHeight, Math.ceil(measuredHeight))
      : entry.bookmark.id === expandedBookmarkId
        ? expandedHeight
        : collapsedHeight;
    return {
      bookmark: entry.bookmark,
      height: height,
      top: topLimit,
    };
  });
  let cursorTop = topLimit;
  positioned.forEach(function (entry, index) {
    if (previewGapIndex === index) {
      cursorTop += previewGapHeight;
    }
    entry.top = cursorTop;
    cursorTop += entry.height + tabStackGap;
  });

  return positioned.map(function (entry) {
    return {
      bookmark: entry.bookmark,
      top: Math.round(entry.top),
      height: Math.round(entry.height),
    };
  });
}
