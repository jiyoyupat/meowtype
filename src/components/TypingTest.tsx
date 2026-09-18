import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { generateShadows, generateWords } from "../lib/words";
import type { Result, WpmSample } from "../types";
import BongoCat from "./BongoCat";
import KeyMap from "./KeyMap";
import Draggable from "./Draggable";
import PopoutWindow from "./PopoutWindow";
import { useSettings } from "../contexts/SettingsContext";
import { FONT_FAMILIES } from "../contexts/SettingsContext";

function fontFamilyCss(id: string): string {
  return FONT_FAMILIES.find((f) => f.id === id)?.css ?? "'Roboto Mono', monospace";
}

type Props = {
  onFinish: (r: Result) => void;
  onRestart: () => void;
};

type CharState = "pending" | "correct" | "incorrect" | "extra";

export default function TypingTest({ onFinish, onRestart }: Props) {
  const {
    config,
    screenMode,
    tape,
    showBongo,
    showKeyMap,
    showCounter,
    bilingual,
    bilingualPopout,
    setBilingualPopout,
    shadowLanguage,
    bongoMoodMode,
    hardMode,
    resetVersion,
  } = useSettings();
  const shadowLang = shadowLanguage;
  const [words, setWords] = useState<string[]>(() =>
    generateWords(
      config.mode === "words" ? config.amount : 100,
      config.language
    )
  );
  const [shadows, setShadows] = useState<(string | null)[]>(() =>
    generateShadows(words, shadowLang)
  );
  const [typed, setTyped] = useState<string[]>([""]);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [isTyping, setIsTyping] = useState(false);
  const [wrongKeys, setWrongKeys] = useState<Set<string>>(new Set());

  const typingTimerRef = useRef<number | undefined>(undefined);
  const samplesRef = useRef<WpmSample[]>([]);
  const lastSampleSecRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Cumulative keystroke counters (monkeytype-parity accuracy): total
  // character keypresses ever made, and how many of those were wrong.
  // Unlike `stats.incorrect`, these DO NOT decrease when the user backspaces
  // to fix a typo — a wrong press still counts against accuracy.
  const totalCharPressRef = useRef<number>(0);
  const wrongCharPressRef = useRef<number>(0);

  const wordIdx = typed.length - 1;
  const input = typed[wordIdx] ?? "";

  const ensureMoreWords = useCallback(
    (nextIdx: number) => {
      if (config.mode !== "time") return;
      if (nextIdx > words.length - 20) {
        const more = generateWords(50, config.language);
        setWords((w) => [...w, ...more]);
        setShadows((s) => [...s, ...generateShadows(more, shadowLang)]);
      }
    },
    [config.mode, config.language, shadowLang, words.length]
  );

  const stats = useMemo(() => {
    let allCorrect = 0;
    let correctWord = 0;
    let incorrect = 0;
    let extra = 0;
    let missed = 0;
    for (let i = 0; i <= wordIdx && i < words.length; i++) {
      const target = words[i]!;
      const got = typed[i] ?? "";
      const isCurrent = i === wordIdx;
      const wordCorrect = got === target;
      const wordPartial = target.startsWith(got);
      const maxLen = Math.max(target.length, got.length);
      for (let j = 0; j < maxLen; j++) {
        const t = target[j];
        const g = got[j];
        if (g === undefined) {
          if (!isCurrent) missed++;
        } else if (t === undefined) {
          extra++;
        } else if (t === g) {
          allCorrect++;
          if (wordCorrect || (isCurrent && wordPartial)) {
            correctWord++;
          }
        } else {
          incorrect++;
        }
      }
      // trailing space credit for completed correct words (monkeytype parity)
      if (!isCurrent && wordCorrect) {
        allCorrect++;
        correctWord++;
      }
    }
    return { allCorrect, correctWord, incorrect, extra, missed };
  }, [typed, words, wordIdx]);

  const finish = useCallback(() => {
    if (startAt == null) return;
    const durationSec = Math.max(0.001, (Date.now() - startAt) / 1000);
    const minutes = durationSec / 60;
    // Accuracy uses cumulative keypresses (backspace does NOT undo a wrong
    // press). correctChars/incorrectChars mirror that model so the ratio
    // shown to the user matches the accuracy % they see. `stats.missed`
    // covers chars in a word the user skipped past (hit space early) —
    // those count against accuracy too but aren't in the press counter.
    const totalPresses = totalCharPressRef.current;
    const wrongPresses = wrongCharPressRef.current;
    const correctChars = Math.max(0, totalPresses - wrongPresses);
    const incorrectChars = wrongPresses + stats.missed;
    const totalChars = correctChars + incorrectChars;
    const wpm = stats.correctWord / 5 / minutes;
    // Raw WPM includes every char ever typed (including corrected typos),
    // per Monkeytype convention.
    const raw = totalPresses / 5 / minutes;
    const accuracy =
      totalChars === 0 ? 0 : (correctChars / totalChars) * 100;
    onFinish({
      wpm,
      raw,
      accuracy,
      correctChars,
      incorrectChars,
      totalChars,
      durationSec,
      mode: config.mode,
      amount: config.amount,
      // Report the language the viewer sees: shadow when bilingual is on,
      // source language otherwise.
      language: bilingual ? shadowLanguage : config.language,
      samples: samplesRef.current,
    });
  }, [
    onFinish,
    startAt,
    stats,
    config.mode,
    config.amount,
    config.language,
    bilingual,
    shadowLanguage,
  ]);

  // hard mode: end the test as soon as any typo is registered
  useEffect(() => {
    if (!hardMode) return;
    if (startAt == null) return;
    if (stats.incorrect + stats.extra > 0) {
      finish();
    }
  }, [hardMode, startAt, stats.incorrect, stats.extra, finish]);

  // ticking clock while active
  useEffect(() => {
    if (startAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [startAt]);

  // sample wpm each second + time-mode termination
  useEffect(() => {
    if (startAt == null) return;
    const elapsed = (now - startAt) / 1000;
    const sec = Math.floor(elapsed);
    if (sec > lastSampleSecRef.current) {
      for (let s = lastSampleSecRef.current + 1; s <= sec; s++) {
        const minutes = s / 60;
        const wpm = minutes > 0 ? stats.correctWord / 5 / minutes : 0;
        const raw =
          minutes > 0 ? totalCharPressRef.current / 5 / minutes : 0;
        samplesRef.current.push({
          t: s,
          wpm,
          raw,
          errors: wrongCharPressRef.current,
        });
      }
      lastSampleSecRef.current = sec;
    }
    if (config.mode === "time" && elapsed >= config.amount) {
      finish();
    }
  }, [now, startAt, stats, config, finish]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Ignore keys typed into any focused input/textarea/contenteditable
      // (e.g. the unlock password prompt) so the typing test doesn't
      // swallow them.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      const markTyping = () => {
        setIsTyping(true);
        if (typingTimerRef.current !== undefined) {
          window.clearTimeout(typingTimerRef.current);
        }
        typingTimerRef.current = window.setTimeout(
          () => setIsTyping(false),
          500
        );
      };

      // ctrl/meta + backspace → delete word
      if ((e.ctrlKey || e.metaKey) && e.key === "Backspace") {
        e.preventDefault();
        markTyping();
        setTyped((prev) => {
          const copy = [...prev];
          const idx = copy.length - 1;
          if (copy[idx]!.length > 0) {
            copy[idx] = "";
          } else if (idx > 0) {
            const prevWord = words[idx - 1]!;
            const prevTyped = copy[idx - 1]!;
            if (
              prevTyped.length !== prevWord.length ||
              prevTyped !== prevWord
            ) {
              copy.pop();
              copy[copy.length - 1] = "";
            }
          }
          return copy;
        });
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        markTyping();
        setTyped((prev) => {
          const copy = [...prev];
          const idx = copy.length - 1;
          if (copy[idx]!.length > 0) {
            copy[idx] = copy[idx]!.slice(0, -1);
          } else if (idx > 0) {
            const prevWord = words[idx - 1]!;
            const prevTyped = copy[idx - 1]!;
            // only go back if previous word has errors
            if (
              prevTyped.length !== prevWord.length ||
              prevTyped !== prevWord
            ) {
              copy.pop();
            }
          }
          return copy;
        });
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        // Anti spam-space: require at least one char typed in the current
        // word before accepting a space.
        if (input.length === 0) return;
        markTyping();
        // A word-separating space is a real keystroke — count it toward raw
        // WPM so raw stays >= net wpm (which credits +1 per completed word
        // for the trailing space, monkeytype-parity).
        totalCharPressRef.current += 1;
        setTyped((prev) => {
          const nextIdx = prev.length;
          if (nextIdx >= words.length) return prev;
          ensureMoreWords(nextIdx);
          const copy = [...prev];
          copy.push("");
          return copy;
        });
        // words-mode finish check happens in a separate effect
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        // mark this key as wrong if it doesn't match the expected char
        const targetWord = words[wordIdx] ?? "";
        const expected = targetWord[input.length];
        // cap runaway overflow: allow at most 5 extra chars past the
        // target word length (monkeytype-style). further keystrokes are
        // dropped so a stuck key or typo spree doesn't balloon the row.
        const MAX_EXTRAS = 5;
        if (input.length >= targetWord.length + MAX_EXTRAS) {
          return;
        }
        if (startAt == null) {
          setStartAt(Date.now());
          setNow(Date.now());
        }
        markTyping();
        const insertChar = e.key;
        // Cumulative accuracy tracking: every char keypress counts, and
        // wrong presses stay counted even if the user backspaces to fix.
        totalCharPressRef.current += 1;
        if (expected === undefined || e.key !== expected) {
          wrongCharPressRef.current += 1;
        }
        if (expected === undefined || e.key !== expected) {
          const k = e.key.toLowerCase();
          setWrongKeys((prev) => {
            if (prev.has(k)) return prev;
            const next = new Set(prev);
            next.add(k);
            return next;
          });
        }
        setTyped((prev) => {
          const copy = [...prev];
          const idx = copy.length - 1;
          copy[idx] = copy[idx] + insertChar;
          return copy;
        });
      }
    },
    [ensureMoreWords, input, input.length, onRestart, startAt, typed, words, wordIdx]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // clear wrongKeys on keyup / blur so the red flash is transient
  useEffect(() => {
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      setWrongKeys((prev) => {
        if (!prev.has(k)) return prev;
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    };
    const onBlur = () => setWrongKeys(new Set());
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== undefined) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  // words mode finish detection
  useEffect(() => {
    if (config.mode !== "words") return;
    if (startAt == null) return;
    const lastIdx = config.amount - 1;
    if (wordIdx > lastIdx) {
      finish();
      return;
    }
    if (wordIdx === lastIdx) {
      const target = words[lastIdx]!;
      if (input === target) {
        finish();
      }
    }
  }, [wordIdx, input, words, config, startAt, finish]);

  const elapsed = startAt == null ? 0 : (now - startAt) / 1000;
  const timeLeft =
    config.mode === "time" ? Math.max(0, config.amount - elapsed) : 0;
  const wordsProgress =
    config.mode === "words" ? `${Math.min(wordIdx, config.amount)}/${config.amount}` : "";

  const liveWpm =
    startAt == null || elapsed <= 0 ? 0 : stats.correctWord / 5 / (elapsed / 60);
  // warmup: suppress live WPM for the first moments so the cat mood doesn't
  // spike (a single correct word at 0.3s = 200+ WPM). Gate opens once
  // BOTH enough time has passed AND enough characters have been typed.
  const BONGO_WARMUP_SEC = 3;
  const BONGO_WARMUP_CHARS = 15;
  const typedCharCount = stats.allCorrect + stats.incorrect + stats.extra;
  const bongoWpm =
    elapsed < BONGO_WARMUP_SEC || typedCharCount < BONGO_WARMUP_CHARS
      ? 0
      : liveWpm;
  const errorCount = stats.incorrect + stats.extra;

  // Time-based mood curve: progress toward end of test drives mood.
  //   time mode  -> 1 - timeLeft/amount
  //   words mode -> wordIdx/amount
  // Thresholds: 0-40% normal, 40-75% excited, 75-100% panik.
  // Falls back to undefined when curve mode is off or before test starts,
  // so BongoCat's WPM-driven behavior stays intact.
  const bongoMoodOverride = useMemo<
    "normal" | "excited" | "panik" | undefined
  >(() => {
    if (bongoMoodMode !== "time") return undefined;
    if (startAt == null) return "normal";
    let progress = 0;
    if (config.mode === "time") {
      progress = 1 - Math.max(0, timeLeft) / config.amount;
    } else {
      progress = Math.min(wordIdx, config.amount) / config.amount;
    }
    progress = Math.max(0, Math.min(1, progress));
    if (progress >= 0.75) return "panik";
    if (progress >= 0.4) return "excited";
    return "normal";
  }, [bongoMoodMode, startAt, config.mode, config.amount, timeLeft, wordIdx]);

  // Bilingual keymap remap: when a correct keypress lands, show the English
  // shadow char on the keymap instead of the actually-typed source char.
  const expectedKey = useMemo(() => {
    const target = words[wordIdx];
    const ch = target ? target[input.length] : undefined;
    return ch ? ch.toLowerCase() : undefined;
  }, [words, wordIdx, input.length]);
  const shadowKey = useMemo(() => {
    if (!bilingual) return undefined;
    const shadow = shadows[wordIdx];
    const ch = shadow ? shadow[input.length] : undefined;
    return ch ? ch.toLowerCase() : undefined;
  }, [bilingual, shadows, wordIdx, input.length]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-5xl mx-auto px-6 focus:outline-none"
    >
      {/* draggable + resizable bongo cat */}
      {showBongo && (
        <Draggable
          key={`bongo-${resetVersion}`}
          storageKey="bongoDraggable"
          hideChrome={!!screenMode}
          defaultState={{
            x: -30,
            y: 41,
            s: 1.1466666666666667,
            r: -12.809439338350785,
          }}
        >
          <BongoCat
            wpm={bongoWpm}
            errorCount={errorCount}
            wrongKeys={wrongKeys}
            expectedKey={expectedKey}
            shadowKey={shadowKey}
            moodOverride={bongoMoodOverride}
          />
        </Draggable>
      )}

      {/* counter — separate div on the right, sits behind cat (cat can overlap vertically) */}
      <div
        className={
          "text-main text-2xl text-right leading-none -mt-10 mb-2 relative -z-10 " +
          (showCounter ? "" : "invisible")
        }
      >
        {startAt == null
          ? config.mode === "time"
            ? config.amount
            : `0/${config.amount}`
          : config.mode === "time"
            ? Math.ceil(timeLeft)
            : wordsProgress}
      </div>

      <WordsView
        words={words}
        shadows={shadows}
        typed={typed}
        currentWordIdx={wordIdx}
        limit={config.mode === "words" ? config.amount : undefined}
        isTyping={isTyping}
        tape={!!tape}
        bilingual={!!bilingual}
      />

      {bilingual && bilingualPopout && (
        <PopoutWindow
          title="meowtype — bilingual mirror"
          onClose={() => setBilingualPopout(false)}
        >
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg px-8 py-6 gap-6">
            <div className="w-full max-w-[60rem]">
              <WordsView
                words={words}
                shadows={shadows}
                typed={typed}
                currentWordIdx={wordIdx}
                limit={config.mode === "words" ? config.amount : undefined}
                isTyping={isTyping}
                tape={!!tape}
                bilingual={!!bilingual}
                mirror
              />
            </div>
            <button
              onClick={onRestart}
              className="text-sub hover:text-text transition-colors p-2"
              title="Restart"
              aria-label="Restart test"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v6h6" />
              </svg>
            </button>
          </div>
        </PopoutWindow>
      )}

      {bilingual && !bilingualPopout && (
        <div className="mt-6">
          <Draggable
            key={`bilingual-${resetVersion}`}
            storageKey="bilingualMirrorDraggable"
            hideChrome={!!screenMode}
          >
            <div className="w-[45rem] opacity-70">
              <WordsView
                words={words}
                shadows={shadows}
                typed={typed}
                currentWordIdx={wordIdx}
                limit={config.mode === "words" ? config.amount : undefined}
                isTyping={isTyping}
                tape={!!tape}
                bilingual={!!bilingual}
                mirror
              />
            </div>
          </Draggable>
        </div>
      )}

      <div className="mt-10">
        {showKeyMap && (
          <Draggable
            key={`keymap-${resetVersion}`}
            storageKey="keymapDraggable"
            hideChrome={!!screenMode}
          >
            <KeyMap
              wrongKeys={wrongKeys}
              expectedKey={expectedKey}
              shadowKey={shadowKey}
            />
          </Draggable>
        )}
      </div>

      {!screenMode && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onRestart}
            className="text-sub hover:text-text transition-colors p-2"
            title="Restart"
            aria-label="Restart test"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Sum offsetLeft/offsetTop up the offsetParent chain until reaching `ancestor`,
 * yielding a position in `ancestor`'s local (pre-transform) coordinate space.
 * Safer than getBoundingClientRect when a transformed parent scales the
 * subtree (e.g. the bilingual mirror inside Draggable).
 */
function offsetIn(
  el: HTMLElement,
  ancestor: HTMLElement
): { left: number; top: number } {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== ancestor) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { left: x, top: y };
}

function WordsView({
  words,
  shadows,
  typed,
  currentWordIdx,
  limit,
  isTyping,
  tape,
  bilingual,
  mirror,
}: {
  words: string[];
  shadows: (string | null)[];
  typed: string[];
  currentWordIdx: number;
  limit?: number;
  isTyping: boolean;
  tape: boolean;
  bilingual: boolean;
  mirror?: boolean;
}) {
  const { fontScale, fontWeight, letterSpacing, fontFamily, caretStyle, caretSmooth } =
    useSettings();
  const letterSpacingCss =
    letterSpacing === "tight"
      ? "0"
      : letterSpacing === "wide"
        ? "0.075em"
        : "0.025em";
  const shown = limit ? words.slice(0, limit) : words;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [stride, setStride] = useState(0);
  const [caret, setCaret] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    ready: boolean;
  }>({ x: 0, y: 0, w: 0, h: 0, ready: false });

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const currentEl = inner.querySelector<HTMLElement>(
      `[data-word-idx="${currentWordIdx}"]`
    );
    if (!currentEl) return;

    // stride + line scroll (only in non-tape mode)
    const lh = currentEl.offsetHeight;
    setStride(lh);

    // caret position — use offset* (pre-transform, local coordinates) so the
    // math stays correct when a parent applies transform: scale/rotate (e.g.
    // the bilingual mirror wrapped in Draggable). getBoundingClientRect would
    // otherwise return post-transform viewport pixels while the caret's own
    // translate is applied inside the same transformed content.
    const inputLen = typed[currentWordIdx]?.length ?? 0;
    const chars = currentEl.querySelectorAll<HTMLElement>("[data-char-idx]");
    let x: number, y: number, w: number, h: number;
    if (inputLen < chars.length) {
      const el = chars[inputLen]!;
      const o = offsetIn(el, inner);
      x = o.left;
      y = o.top;
      w = el.offsetWidth;
      h = el.offsetHeight;
    } else if (chars.length > 0) {
      const el = chars[chars.length - 1]!;
      const o = offsetIn(el, inner);
      x = o.left + el.offsetWidth;
      y = o.top;
      w = el.offsetWidth;
      h = el.offsetHeight;
    } else {
      const o = offsetIn(currentEl, inner);
      x = o.left;
      y = o.top;
      w = 0;
      h = currentEl.offsetHeight;
    }
    setCaret({ x, y, w, h, ready: true });

    if (tape) {
      setOffsetY(0);
      const vp = viewportRef.current;
      const vw = vp?.clientWidth ?? 0;
      const targetX = vw * 0.25;
      setOffsetX(Math.max(0, x - targetX));
    } else {
      setOffsetX(0);
      const currentTop = currentEl.offsetTop;
      const target = Math.max(0, Math.round(currentTop / lh) * lh - lh);
      setOffsetY(target);
    }
  }, [
    currentWordIdx,
    typed,
    shown.length,
    tape,
    fontScale,
    fontWeight,
    letterSpacingCss,
    fontFamily,
  ]);

  const viewportHeight = tape
    ? stride
      ? stride
      : "2rem"
    : stride
      ? stride * 3
      : "6rem";

  return (
    <div
      ref={viewportRef}
      className="overflow-hidden leading-relaxed select-none"
      style={{
        height: viewportHeight,
        fontSize: `${1.5 * fontScale}rem`,
        fontWeight,
        letterSpacing: letterSpacingCss,
        fontFamily: fontFamilyCss(fontFamily),
      }}
    >
      <div
        ref={innerRef}
        className="relative transition-transform duration-150 ease-out"
        style={{
          transform: `translate(-${offsetX}px, -${offsetY}px)`,
          textAlign: tape ? "left" : "justify",
          textAlignLast: "left",
          wordSpacing: "0.25rem",
          whiteSpace: tape ? "nowrap" : undefined,
        }}
      >
        {caretStyle !== "off" && (
          <div
            className={
              "absolute top-0 left-0 pointer-events-none will-change-transform " +
              (caretStyle === "block"
                ? "bg-main mix-blend-difference"
                : "bg-main") +
              " " +
              (isTyping ? "" : "caret")
            }
            style={{
              // translate3d forces GPU compositing → no per-frame layout
              transform: `translate3d(${caret.x}px, ${caret.y + (caretStyle === "underline" ? caret.h - 2 : 0)}px, 0)`,
              width:
                caretStyle === "bar"
                  ? 2
                  : caretStyle === "underline"
                    ? Math.max(caret.w, 8)
                    : caret.w || 2,
              height: caretStyle === "underline" ? 2 : caret.h,
              // linear easing for continuous motion — matches Monkeytype feel
              transition: caretSmooth
                ? "transform 100ms linear"
                : "none",
              opacity: caret.ready ? undefined : 0,
              borderRadius: caretStyle === "bar" ? 1 : 2,
            }}
          />
        )}
        {shown.flatMap((word, i) => {
          const got = typed[i] ?? "";
          const isPast = i < currentWordIdx;
          // In bilingual main view, render the shadow (other-language) chars;
          // the mirror row and non-bilingual mode render the source word.
          const displayFrom =
            bilingual && !mirror ? shadows[i] ?? word : word;
          return [
            <WordView
              key={i}
              idx={i}
              word={word}
              displayFrom={displayFrom}
              got={got}
              isPast={isPast}
            />,
            " ",
          ];
        })}
      </div>
    </div>
  );
}

function WordView({
  idx,
  word,
  displayFrom,
  got,
  isPast,
}: {
  idx: number;
  word: string;
  displayFrom: string;
  got: string;
  isPast: boolean;
}) {
  const chars: { ch: string; state: CharState }[] = [];
  const len = Math.max(word.length, got.length);
  for (let i = 0; i < len; i++) {
    const t = word[i];
    const g = got[i];
    // Preserve source-word comparison for state, but render `displayFrom`'s
    // char at the same index when available (bilingual shadow overlay).
    const shownCh = displayFrom[i] ?? t ?? g ?? "";
    if (t === undefined && g !== undefined) {
      chars.push({ ch: g, state: "extra" });
    } else if (g === undefined) {
      chars.push({ ch: shownCh, state: "pending" });
    } else if (t === g) {
      chars.push({ ch: shownCh, state: "correct" });
    } else {
      chars.push({ ch: shownCh, state: "incorrect" });
    }
  }

  const wordWrong =
    isPast && (got.length !== word.length || got !== word);

  return (
    <span
      data-word-idx={idx}
      className={
        "inline-block " +
        (wordWrong ? "underline decoration-error/70" : "")
      }
    >
      {chars.map((c, i) => (
        <span
          key={i}
          data-char-idx={i}
          className={
            c.state === "correct"
              ? "text-text"
              : c.state === "incorrect"
                ? "text-error"
                : c.state === "extra"
                  ? "text-error/70"
                  : "text-sub"
          }
        >
          {c.ch}
        </span>
      ))}
    </span>
  );
}
