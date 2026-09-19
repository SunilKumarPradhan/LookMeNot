import { useEffect } from "react";

export interface ShortcutHandlers {
  focusSearch: () => void;
  focusJump: () => void;
  nextHit: () => void;
  prevHit: () => void;
  toggleReadingMode: () => void;
  closePanel: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

export function useKeyboardShortcuts(enabled: boolean, handlers: ShortcutHandlers) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handlers.closePanel();
        return;
      }

      if (isTypingTarget(event.target)) return;

      switch (event.key) {
        case "/":
          event.preventDefault();
          handlers.focusSearch();
          break;
        case "g":
          event.preventDefault();
          handlers.focusJump();
          break;
        case "n":
          handlers.nextHit();
          break;
        case "N":
          handlers.prevHit();
          break;
        case "r":
          handlers.toggleReadingMode();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handlers]);
}
