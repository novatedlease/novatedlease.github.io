// Node 22+ ships a native (but broken-without-a-file-path) `localStorage`/
// `sessionStorage` global that shadows jsdom's own implementation once the
// jsdom test environment is active, leaving `window.localStorage` present but
// non-functional (`{}`, no `getItem`). Force-install a working in-memory
// implementation regardless of which one "won" — avoids depending on a
// Node-version-specific CLI flag to disable Node's native version.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

for (const key of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(window, key, {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}
