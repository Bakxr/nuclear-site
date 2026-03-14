import { useEffect, useRef } from "react";

function getFocusableElements(node) {
  return [...node.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )];
}

export default function useDialog(isOpen, onClose) {
  const dialogRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousActiveRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialogNode = dialogRef.current;
    const focusables = dialogNode ? getFocusableElements(dialogNode) : [];
    const firstFocusable = focusables[0];

    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      dialogNode?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab" || !dialogNode) return;

      const currentFocusables = getFocusableElements(dialogNode);
      if (currentFocusables.length === 0) {
        event.preventDefault();
        dialogNode.focus();
        return;
      }

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActiveRef.current instanceof HTMLElement && previousActiveRef.current.isConnected) {
        previousActiveRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return dialogRef;
}
