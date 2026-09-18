import { useEffect } from "react";

export default function AboutModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-bg border border-sub/30 p-6 text-sm text-sub font-mono leading-relaxed shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg text-text font-bold">about meowtype</h2>
          <button
            onClick={onClose}
            className="text-sub hover:text-error text-lg leading-none px-1"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          <p>
            it started with a very silly reason: i wanted a bongo cat in my
            typing test. monkeytype is great and all, but it was
            suspiciously cat-less, and my brain kind of refused to type
            until this was fixed.
          </p>
          <p>
            then the scope crept, as scopes do. i make content sometimes,
            and every time a typing test needs to appear on screen it turns
            into a whole production — record separately, screen capture,
            crop, green screen, chroma key, layer the mic audio, pray. so i
            thought: what if one button could just hand me a screen
            recording <em>and</em> clean mic audio, ready to drop into a
            video?
          </p>
          <p>
            so here it is. one tab, one keystroke, one very content cat.
          </p>
          <p className="pt-2 text-xs text-sub/70 border-t border-sub/20 mt-4">
            bongo cat is a meme created by{" "}
            <a
              href="https://twitter.com/DitzyFlama"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text"
            >
              DitzyFlama
            </a>{" "}
            (
            <a
              href="https://twitter.com/DitzyFlama/status/993487015499853824"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text"
            >
              tweet
            </a>
            ) using{" "}
            <a
              href="https://twitter.com/StrayRogue"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text"
            >
              StrayRogue
            </a>
            's{" "}
            <a
              href="https://twitter.com/StrayRogue/status/992994454058381312"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text"
            >
              drawing of a cat
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
