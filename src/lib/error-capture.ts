let lastError: unknown = null;

if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as {
    addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  };
  if (typeof g.addEventListener === "function") {
    g.addEventListener("error", (event: unknown) => {
      const e = event as { error?: unknown };
      lastError = e?.error ?? event;
    });
    g.addEventListener("unhandledrejection", (event: unknown) => {
      const e = event as { reason?: unknown };
      lastError = e?.reason ?? event;
    });
  }
}

export function consumeLastCapturedError(): unknown {
  const e = lastError;
  lastError = null;
  return e;
}