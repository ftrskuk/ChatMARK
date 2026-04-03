declare const chrome: {
  storage: {
    local: {
      get(
        keys: string | string[],
        callback: (items: Record<string, unknown>) => void,
      ): void;
      set(items: Record<string, unknown>, callback: () => void): void;
      remove(keys: string | string[], callback: () => void): void;
    };
    onChanged: {
      addListener(
        callback: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          areaName: string,
        ) => void,
      ): void;
      removeListener(callback: () => void): void;
    };
  };
  runtime: {
    lastError?: {
      message?: string;
    };
  };
};

declare global {
  interface Window {
    __cgptBookmarkTabsInitialized?: boolean;
  }
}

interface GlobalThis {
  chrome: typeof chrome;
}
