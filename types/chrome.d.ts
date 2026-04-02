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
  };
  runtime: {
    lastError?: {
      message?: string;
    };
  };
};

interface GlobalThis {
  chrome: typeof chrome;
}
