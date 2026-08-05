import { useEffect } from "react";

export interface ShortcutHandlers {
  focusSearch: () => void;
  focusJump: () => void;
  nextHit: () => void;
  prevHit: () => void;
  toggleReadingMode: () => void;
  clearAndBlur: () => void;
  toggleCheatsheet: () => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);

      if (e.key === "Escape") {
        handlers.clearAndBlur();
        return;
      }

      if (typing) return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          handlers.focusSearch();
          break;
        case "g":
          e.preventDefault();
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
        case "?":
          handlers.toggleCheatsheet();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
