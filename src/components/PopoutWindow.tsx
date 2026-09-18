import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  title?: string;
  width?: number;
  height?: number;
  onClose?: () => void;
  /**
   * When true (default), keydown/keyup events fired inside the popout are
   * re-dispatched on the parent `window`, so global keyboard listeners
   * (e.g. TypingTest) keep working even while the popout is focused.
   */
  forwardKeyboard?: boolean;
  children: ReactNode;
};

/**
 * Opens a native browser window (via window.open) and portals children into
 * its <body>. Copies stylesheets, fonts, and theme classes/vars from the
 * parent document so the popout renders identically. Watches the parent
 * <body> for class/style changes and mirrors them so theme switches stay in
 * sync. Closes automatically when the parent unmounts / tab closes.
 *
 * Used to detach the bilingual mirror into its own window — handy for
 * screen recording, since you can position the popout outside the capture
 * region (or on another monitor).
 */
export default function PopoutWindow({
  title = "meowtype",
  width = 800,
  height = 320,
  onClose,
  forwardKeyboard = true,
  children,
}: Props) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // Distinguishes user-initiated close (X button, Cmd+W) from programmatic
  // close via our cleanup. Programmatic closes must NOT trigger onClose —
  // otherwise a parent re-render that unmounts+remounts PopoutWindow (e.g.
  // TypingTest restart) would toggle the parent's "popout enabled" state
  // off even though the user never asked to close it.
  const closingProgrammatically = useRef(false);

  useEffect(() => {
    const features = [
      `width=${width}`,
      `height=${height}`,
      "menubar=no",
      "toolbar=no",
      "location=no",
      "status=no",
      "resizable=yes",
      "scrollbars=yes",
    ].join(",");
    const w = window.open("", "meowtype-popout", features);
    if (!w) {
      // popup blocked
      onClose?.();
      return;
    }
    w.document.title = title;

    // Clone stylesheets + font links from parent <head>. Vite injects
    // styles as inline <style> tags in dev and a <link rel="stylesheet">
    // in prod — clone both so the popout renders identically.
    const headNodes = document.head.querySelectorAll(
      'link[rel="stylesheet"], link[rel="preconnect"], link[rel="icon"], style',
    );
    headNodes.forEach((node) => {
      w.document.head.appendChild(node.cloneNode(true));
    });

    // Mirror body class (theme-*, screen-mode) and inline style (custom
    // theme CSS vars) from the parent.
    const b = w.document.body;
    const syncBody = () => {
      b.className = document.body.className;
      const parentStyle = document.body.getAttribute("style") ?? "";
      b.setAttribute("style", `${parentStyle};margin:0;padding:0`);
    };
    syncBody();

    setContainer(b);

    const bodyObserver = new MutationObserver(syncBody);
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    // Also watch parent <head> for new/removed style tags (Vite HMR
    // hot-reload adds new <style> nodes on CSS edits).
    const headObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (
            n.nodeType === Node.ELEMENT_NODE &&
            (n.nodeName === "STYLE" || n.nodeName === "LINK")
          ) {
            w.document.head.appendChild(n.cloneNode(true));
          }
        });
      }
    });
    headObserver.observe(document.head, { childList: true });

    const handlePopoutUnload = () => {
      if (closingProgrammatically.current) return;
      onClose?.();
    };
    w.addEventListener("beforeunload", handlePopoutUnload);

    const handleParentUnload = () => w.close();
    window.addEventListener("beforeunload", handleParentUnload);

    // Forward keyboard events to the parent window so listeners registered
    // on `window` (typing test) keep receiving keys while the popout has
    // focus. Prevent default in the popout for keys that would otherwise
    // scroll / navigate (Space, Backspace, Tab, arrows).
    const shouldPreventDefault = (key: string) =>
      key === " " ||
      key === "Backspace" ||
      key === "Tab" ||
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "ArrowLeft" ||
      key === "ArrowRight";
    const forwardKey = (e: KeyboardEvent) => {
      if (shouldPreventDefault(e.key)) e.preventDefault();
      const cloned = new KeyboardEvent(e.type, {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        repeat: e.repeat,
        bubbles: true,
        cancelable: true,
      });
      // Dispatch on `document` so it bubbles up to `window` — this way
      // listeners registered on either target (typing test on window,
      // BongoCat/KeyMap on document) all fire.
      document.dispatchEvent(cloned);
    };
    if (forwardKeyboard) {
      w.addEventListener("keydown", forwardKey);
      w.addEventListener("keyup", forwardKey);
    }

    return () => {
      bodyObserver.disconnect();
      headObserver.disconnect();
      window.removeEventListener("beforeunload", handleParentUnload);
      w.removeEventListener("beforeunload", handlePopoutUnload);
      if (forwardKeyboard) {
        w.removeEventListener("keydown", forwardKey);
        w.removeEventListener("keyup", forwardKey);
      }
      closingProgrammatically.current = true;
      w.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}
