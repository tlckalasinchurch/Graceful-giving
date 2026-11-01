import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Automatically cleanup DOM after each test
afterEach(() => {
  cleanup();
});

// Node >= 22 defines a global `localStorage` stub whose getter stays undefined
// unless the Node webstorage feature is enabled. The vitest environment copies
// that stub onto the jsdom window (an own accessor shadows jsdom's), so
// tests that persist data there see undefined. Detect a non-working storage
// and restore an in-memory one; on environments where the stub is absent or
// functional this is a no-op.
function storageIsBroken(storage: unknown): boolean {
  const s = storage as Partial<Storage> | null | undefined;
  return !s || typeof s.clear !== "function" || typeof s.setItem !== "function";
}

// This setup also runs for server tests in the node environment, where there
// is no window — guard every reference like the polyfills below.
if (typeof window !== "undefined") {
  if (
    storageIsBroken(window.localStorage) ||
    storageIsBroken(window.sessionStorage)
  ) {
    for (const name of ["localStorage", "sessionStorage"] as const) {
      const data = new Map<string, string>();
      const memoryStorage = {
        get length() {
          return data.size;
        },
        clear: () => data.clear(),
        getItem: (key: string) => data.get(key) ?? null,
        key: (index: number) => [...data.keys()][index] ?? null,
        removeItem: (key: string) => {
          data.delete(key);
        },
        setItem: (key: string, value: string) => {
          data.set(key, String(value));
        },
      };
      Object.defineProperty(window, name, {
        configurable: true,
        get: () => memoryStorage,
      });
    }
  }
}

// Polyfill window.matchMedia if undefined in jsdom
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Polyfill ResizeObserver if undefined in jsdom
if (typeof window !== "undefined" && !window.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserver;
}
