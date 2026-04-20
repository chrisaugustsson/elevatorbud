import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";

type AnnounceFn = (message: string) => void;

const LiveRegionContext = createContext<AnnounceFn | null>(null);

/**
 * Provides a stable aria-live polite region mounted at the auth shell layer.
 *
 * Consumers call `useAnnounce()` to push a message. Because the region lives
 * in the auth layout (outside any route-level keyed wrapper), announcements
 * survive the context-switch crossfade in $parentOrgId.tsx and are reliably
 * read by screen readers.
 */
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const announce = useCallback<AnnounceFn>((message) => {
    const el = ref.current;
    if (!el) return;
    // Clear first so assistive tech re-reads identical consecutive messages.
    el.textContent = "";
    // Next tick so the DOM mutation is observed as a change.
    requestAnimationFrame(() => {
      if (ref.current) ref.current.textContent = message;
    });
  }, []);

  return (
    <LiveRegionContext.Provider value={announce}>
      {children}
      <div ref={ref} aria-live="polite" aria-atomic="true" className="sr-only" />
    </LiveRegionContext.Provider>
  );
}

export function useAnnounce(): AnnounceFn {
  const fn = useContext(LiveRegionContext);
  if (!fn) {
    // Fail-soft: no-op if used outside provider so we don't crash unit tests etc.
    return () => {};
  }
  return fn;
}
