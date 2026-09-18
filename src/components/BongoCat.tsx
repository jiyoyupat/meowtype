import { useEffect, useRef, useState } from "react";
import catImg from "../assets/bongo/cat.png";
import pawLeftImg from "../assets/bongo/paw-left.png";
import pawRightImg from "../assets/bongo/paw-right.png";

const HYPER_WPM_THRESHOLD = 140;
const EXCITED_WPM_THRESHOLD = 120;
const LAZY_WPM_THRESHOLD = 80;
// hysteresis bands to prevent flickering around thresholds
const HYPER_EXIT = 133;
const EXCITED_EXIT = 110;
const LAZY_EXIT = 88;

const LEFT_CODES = new Set([
  "Backquote",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Tab",
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyT",
  "CapsLock",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyG",
  "ShiftLeft",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyV",
  "KeyB",
  "ControlLeft",
  "AltLeft",
  "MetaLeft",
]);

// key position map on the bongo cat's local keyboard SVG (inside translate(210 145) skewY(13))
// keys are mirrored horizontally: cat sits behind keyboard, so cat's right-hand keys (l,p,m) appear on viewer's LEFT (near paw-right).
// row Y is also cat-perspective: spacebar is at the front of the keyboard
// (nearest the cat, small y), so going away from cat the order is
// zxcv → asdf → qwerty (qwerty is the "top row" of alpha keys, i.e. the
// row farthest from the typist — which is the cat here).
const KEY_POSITIONS: Record<string, { x: number; y: number }> = (() => {
  const map: Record<string, { x: number; y: number }> = {};
  const rows: Array<{ keys: string[]; y: number; startX: number; spacing: number }> = [
    // reversed so left-hand keys (q,w,e...) end up on viewer's RIGHT (near paw-left)
    { keys: ["m", "n", "b", "v", "c", "x", "z"], y: 24, startX: 80, spacing: 55 },
    { keys: ["l", "k", "j", "h", "g", "f", "d", "s", "a"], y: 36, startX: 50, spacing: 52 },
    { keys: ["p", "o", "i", "u", "y", "t", "r", "e", "w", "q"], y: 48, startX: 25, spacing: 52 },
  ];
  for (const { keys, y, startX, spacing } of rows) {
    keys.forEach((k, i) => {
      map[k] = { x: startX + i * spacing, y };
    });
  }
  map[" "] = { x: 260, y: 10 };
  // non-alphabet keys: keep the same mirrored/perspective convention
  // (cat's LEFT-side keys land on VIEWER's RIGHT). Numbers and punctuation
  // are intentionally skipped.
  //   row y=48: qwerty row (top row of alpha keys from cat's view)
  //   row y=36: asdf row
  //   row y=24: zxcv row
  //   row y=10: spacebar / modifier row
  map["Backspace"] = { x: 8, y: 48 };
  map["Tab"] = { x: 515, y: 48 };
  map["CapsLock"] = { x: 505, y: 36 };
  map["Enter"] = { x: 15, y: 36 };
  map["ShiftRight"] = { x: 30, y: 24 };
  map["ShiftLeft"] = { x: 460, y: 24 };
  map["ControlRight"] = { x: 20, y: 10 };
  map["MetaRight"] = { x: 55, y: 10 };
  map["AltRight"] = { x: 95, y: 10 };
  map["AltLeft"] = { x: 425, y: 10 };
  map["MetaLeft"] = { x: 465, y: 10 };
  map["ControlLeft"] = { x: 500, y: 10 };
  return map;
})();

// e.code values of special (non-alphabet) keys we want to visualize on
// the bongo cat keyboard. Numbers and punctuation are intentionally
// excluded.
const SPECIAL_CODES = new Set([
  "Backspace",
  "Tab",
  "CapsLock",
  "Enter",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

const CSS = `
#bongoCat {
  --main-color: #e2b714;
  --sub-color: #646669;
  --text-color: #d1d0c5;
  --error-color: #ca4754;
  position: relative;
  width: 300px;
  aspect-ratio: 800 / 450;
  margin: 0 auto 0;
  pointer-events: none;
  user-select: none;
}
#bongoCat > .layer {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
}
/* cat.png is 800x450 (dark theme only, black fill removed). */
#bongoCat .cat-body {
  background-image: url(${catImg});
  background-size: 100% 100%;
  background-position: 0 0;
}
/* paw sprites 1600x450: 2 states side-by-side (up | down). */
#bongoCat .paw {
  background-size: 200% 100%;
  background-position: 0 0;
}
#bongoCat .paw-left {
  background-image: url(${pawLeftImg});
}
#bongoCat .paw-right {
  background-image: url(${pawRightImg});
}
#bongoCat.tapLeft .paw-left {
  background-position: 100% 0;
}
#bongoCat.tapRight .paw-right {
  background-position: 100% 0;
}

/* idle: gentle breathing on body + paws (only when mood is neutral) */
#bongoCat:not(.excited):not(.lazy):not(.hyper):not(.panik):not(.angry) .cat-body,
#bongoCat:not(.excited):not(.lazy):not(.hyper):not(.panik):not(.angry) .paw-left,
#bongoCat:not(.excited):not(.lazy):not(.hyper):not(.panik):not(.angry) .paw-right {
  animation: catBreathe 3.6s ease-in-out infinite;
  transform-origin: center bottom;
}
/* idle: eye blink on normal face (irregular ~6s cycle) */
#bongoCat .face-normal .eye {
  animation: eyeBlink 6s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

#bongoCat .overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
#bongoCat .keyboard-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
#bongoCat .angry-mark,
#bongoCat .star,
#bongoCat .zzz,
#bongoCat .face-excited,
#bongoCat .face-hyper,
#bongoCat .face-lazy,
#bongoCat .face-angry,
#bongoCat .face-panik,
#bongoCat .sweat,
#bongoCat .exclaim,
#bongoCat .shock-lines,
#bongoCat .keyboard-crack {
  opacity: 0;
}
#bongoCat .face-normal { opacity: 1; }

/* angry: red marks + shake + angry face */
#bongoCat.angry .angry-mark,
#bongoCat.angry .face-angry { opacity: 1; }
#bongoCat.angry .face-normal { opacity: 0; }
#bongoCat.angry {
  animation: bongoShake 0.12s ease-in-out 3;
}

/* excited: stars twinkle + wiggle + excited face */
#bongoCat.excited:not(.angry):not(.hyper) .star {
  opacity: 1;
  animation: starTwinkle 0.5s ease-in-out infinite;
  transform-origin: center;
}
#bongoCat.excited:not(.angry):not(.hyper) .face-excited { opacity: 1; }
#bongoCat.excited:not(.angry):not(.hyper) .face-normal { opacity: 0; }
#bongoCat.excited:not(.angry):not(.hyper) {
  animation: bongoWiggle 0.18s ease-in-out infinite;
  transform-origin: center bottom;
}

/* lazy: floating Z's + slouch + lazy face */
#bongoCat.lazy:not(.angry):not(.excited):not(.hyper) .zzz {
  animation: zFloat 2.4s ease-in-out infinite;
}
#bongoCat.lazy:not(.angry):not(.excited):not(.hyper) .zzz-2 { animation-delay: 1.2s; }
#bongoCat.lazy:not(.angry):not(.excited):not(.hyper) .face-lazy { opacity: 1; }
#bongoCat.lazy:not(.angry):not(.excited):not(.hyper) .face-normal { opacity: 0; }
#bongoCat.lazy:not(.angry):not(.excited):not(.hyper) {
  animation: bongoSlouch 3s ease-in-out infinite;
  transform-origin: center bottom;
}

/* hyper: fire eyes + cracked keyboard + afterimage trail + fast shake */
#bongoCat.hyper:not(.angry) .face-hyper { opacity: 1; }
#bongoCat.hyper:not(.angry) .face-normal,
#bongoCat.hyper:not(.angry) .face-excited { opacity: 0; }
#bongoCat.hyper .keyboard-crack { opacity: 1; }
#bongoCat.hyper .keyboard-crack path {
  animation: crackFlicker 0.28s steps(2) infinite;
}
#bongoCat.hyper .star {
  opacity: 1;
  animation: starTwinkle 0.3s ease-in-out infinite;
  transform-origin: center;
}
#bongoCat.hyper .flame-outer {
  animation: flameFlicker 0.14s ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: center bottom;
}
#bongoCat.hyper .flame-inner {
  animation: flameFlicker 0.11s ease-in-out infinite alternate-reverse;
  transform-box: fill-box;
  transform-origin: center bottom;
}
#bongoCat.hyper:not(.angry) {
  animation: bongoHyperShake 0.09s linear infinite;
  transform-origin: center bottom;
  filter:
    drop-shadow(-5px 0 rgba(255, 120, 0, 0.55))
    drop-shadow(-11px 0 rgba(255, 40, 80, 0.35))
    drop-shadow(-18px 0 rgba(255, 20, 40, 0.18));
}

/* panik: worried face + sweat drops + "!!" bounce + fast tiny jitter */
#bongoCat.panik:not(.angry):not(.hyper) .face-panik { opacity: 1; }
#bongoCat.panik:not(.angry):not(.hyper) .face-normal { opacity: 0; }
#bongoCat.panik:not(.angry):not(.hyper) .sweat {
  opacity: 1;
  animation: sweatDrip 1s ease-in infinite;
  transform-box: fill-box;
  transform-origin: center top;
}
#bongoCat.panik:not(.angry):not(.hyper) .sweat-2 { animation-delay: 0.35s; }
#bongoCat.panik:not(.angry):not(.hyper) .sweat-3 { animation-delay: 0.7s; }
#bongoCat.panik:not(.angry):not(.hyper) .exclaim {
  opacity: 1;
  animation: exclaimWobble 0.28s ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: center bottom;
}
#bongoCat.panik:not(.angry):not(.hyper) .exclaim-2 {
  animation: exclaimWobble2 0.24s ease-in-out infinite alternate;
  animation-delay: 0.12s;
}
#bongoCat.panik:not(.angry):not(.hyper) .exclaim-3 {
  animation: exclaimWobble 0.32s ease-in-out infinite alternate;
  animation-delay: 0.22s;
}
#bongoCat.panik:not(.angry):not(.hyper) .shock-lines {
  opacity: 1;
  animation: shockFlicker 0.16s steps(2) infinite;
  transform-box: fill-box;
  transform-origin: center center;
}
#bongoCat.panik:not(.angry):not(.hyper) {
  animation: bongoTremble 0.06s linear infinite;
  transform-origin: center bottom;
  filter:
    drop-shadow(-3px 0 rgba(120, 180, 255, 0.4))
    drop-shadow(3px 0 rgba(120, 180, 255, 0.4))
    drop-shadow(0 -2px rgba(200, 220, 240, 0.25));
}

@keyframes bongoShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
@keyframes bongoWiggle {
  0%, 100% { transform: rotate(-1deg) translateY(0); }
  50% { transform: rotate(1deg) translateY(-2px); }
}
@keyframes bongoSlouch {
  0%, 100% { transform: translateY(2px) rotate(-0.5deg); }
  50% { transform: translateY(5px) rotate(0.5deg); }
}
@keyframes starTwinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
@keyframes zFloat {
  0% { opacity: 0; transform: translate(0, 4px); }
  30% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; transform: translate(-6px, -14px); }
}
@keyframes bongoHyperShake {
  0%   { transform: translate(0, 0) rotate(-1.5deg); }
  25%  { transform: translate(-2px, -1px) rotate(1.5deg); }
  50%  { transform: translate(2px, 1px) rotate(-1deg); }
  75%  { transform: translate(-1px, 1px) rotate(1deg); }
  100% { transform: translate(0, 0) rotate(-1.5deg); }
}
@keyframes flameFlicker {
  0%   { transform: scaleY(1) scaleX(1); }
  100% { transform: scaleY(1.2) scaleX(0.85); }
}
@keyframes crackFlicker {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
@keyframes bongoTremble {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-2px, 0.5px); }
  40%  { transform: translate(2px, -0.5px); }
  60%  { transform: translate(-2px, 0); }
  80%  { transform: translate(2px, 0.5px); }
  100% { transform: translate(0, 0); }
}
@keyframes sweatDrip {
  0%   { opacity: 0; transform: translate(0, -4px) scale(0.8); }
  20%  { opacity: 1; transform: translate(0, 0) scale(1); }
  80%  { opacity: 1; transform: translate(0, 18px) scale(1); }
  100% { opacity: 0; transform: translate(0, 24px) scale(0.9); }
}
@keyframes exclaimWobble {
  0%   { transform: translateY(0) rotate(-6deg) scale(1); }
  100% { transform: translateY(-7px) rotate(4deg) scale(1.2); }
}
@keyframes exclaimWobble2 {
  0%   { transform: translateY(-2px) rotate(6deg) scale(1); }
  100% { transform: translateY(-9px) rotate(-4deg) scale(1.15); }
}
@keyframes shockFlicker {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(1.08); }
}
@keyframes catBreathe {
  0%, 100% { transform: translateY(0) scaleY(1); }
  50%      { transform: translateY(-1.5px) scaleY(1.02); }
}
@keyframes eyeBlink {
  0%, 94%, 100% { transform: scaleY(1); }
  96%, 99%      { transform: scaleY(0.1); }
}
`;

export default function BongoCat({
  wpm,
  errorCount,
  wrongKeys,
  expectedKey,
  shadowKey,
  moodOverride,
}: {
  wpm: number;
  errorCount: number;
  wrongKeys?: Set<string>;
  // Bilingual remap: when a physical press matches `expectedKey` (source
  // target char), display `shadowKey` (English) as the highlighted key.
  expectedKey?: string;
  shadowKey?: string;
  // External mood override (e.g. time-based curve). When set, WPM->mood is
  // bypassed. `angry` still takes precedence over this.
  moodOverride?: "normal" | "excited" | "lazy" | "hyper" | "panik";
}) {
  const [tapLeft, setTapLeft] = useState(false);
  const [tapRight, setTapRight] = useState(false);
  const [angry, setAngry] = useState(false);
  const [mood, setMood] = useState<"normal" | "excited" | "lazy" | "hyper" | "panik">(
    "normal"
  );
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  const activeSidesRef = useRef<Map<string, "left" | "right">>(new Map());
  const lastSpaceSideRef = useRef<"left" | "right">("right");
  const prevErrorRef = useRef(errorCount);
  const angryTimerRef = useRef<number | undefined>(undefined);
  const displayForPhysicalRef = useRef<Map<string, string>>(new Map());
  const expectedKeyRef = useRef(expectedKey);
  const shadowKeyRef = useRef(shadowKey);
  useEffect(() => {
    expectedKeyRef.current = expectedKey;
  }, [expectedKey]);
  useEffect(() => {
    shadowKeyRef.current = shadowKey;
  }, [shadowKey]);

  useEffect(() => {
    const keySide = (code: string): "left" | "right" => {
      if (LEFT_CODES.has(code)) return "left";
      if (code === "Space") {
        const next = lastSpaceSideRef.current === "left" ? "right" : "left";
        lastSpaceSideRef.current = next;
        return next;
      }
      return "right";
    };

    const trackKey = (e: KeyboardEvent): string | null => {
      if (e.key === " " || e.code === "Space") return " ";
      if (SPECIAL_CODES.has(e.code)) return e.code;
      if (e.key.length === 1) return e.key.toLowerCase();
      return null;
    };

    const onDown = (e: KeyboardEvent) => {
      const side = activeSidesRef.current.get(e.code) ?? keySide(e.code);
      activeSidesRef.current.set(e.code, side);
      if (side === "left") setTapLeft(true);
      else setTapRight(true);
      const k = trackKey(e);
      if (k) {
        const shadow = shadowKeyRef.current;
        const expected = expectedKeyRef.current;
        const shouldRemap =
          expected && k.length === 1 && k === expected;
        const display = shouldRemap ? shadow ?? expected! : k;
        if (KEY_POSITIONS[display]) {
          displayForPhysicalRef.current.set(k, display);
          setPressed((prev) => {
            if (prev.has(display)) return prev;
            const next = new Set(prev);
            next.add(display);
            return next;
          });
        }
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const side = activeSidesRef.current.get(e.code);
      activeSidesRef.current.delete(e.code);
      if (side) {
        const stillHeld = Array.from(activeSidesRef.current.values()).includes(
          side
        );
        if (!stillHeld) {
          if (side === "left") setTapLeft(false);
          else setTapRight(false);
        }
      }
      const k = trackKey(e);
      if (k) {
        const display = displayForPhysicalRef.current.get(k) ?? k;
        displayForPhysicalRef.current.delete(k);
        setPressed((prev) => {
          if (!prev.has(display)) return prev;
          const next = new Set(prev);
          next.delete(display);
          return next;
        });
      }
    };
    const onBlur = () => {
      setPressed(new Set());
      displayForPhysicalRef.current.clear();
      activeSidesRef.current.clear();
      setTapLeft(false);
      setTapRight(false);
    };
    document.addEventListener("keydown", onDown);
    document.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (errorCount > prevErrorRef.current) {
      setAngry(true);
      if (angryTimerRef.current !== undefined) {
        window.clearTimeout(angryTimerRef.current);
      }
      angryTimerRef.current = window.setTimeout(() => setAngry(false), 600);
    }
    prevErrorRef.current = errorCount;
  }, [errorCount]);

  useEffect(() => {
    return () => {
      if (angryTimerRef.current !== undefined) {
        window.clearTimeout(angryTimerRef.current);
      }
    };
  }, []);

  // hysteresis-based mood switching to avoid flickering
  useEffect(() => {
    if (moodOverride !== undefined) return;
    setMood((prev) => {
      if (wpm <= 0) return "normal";
      if (prev === "hyper") {
        if (wpm < HYPER_EXIT) {
          if (wpm >= EXCITED_EXIT) return "excited";
          return wpm < LAZY_WPM_THRESHOLD ? "lazy" : "normal";
        }
        return "hyper";
      }
      if (prev === "excited") {
        if (wpm >= HYPER_WPM_THRESHOLD) return "hyper";
        if (wpm < EXCITED_EXIT) {
          return wpm < LAZY_WPM_THRESHOLD ? "lazy" : "normal";
        }
        return "excited";
      }
      if (prev === "lazy") {
        if (wpm >= HYPER_WPM_THRESHOLD) return "hyper";
        if (wpm >= EXCITED_WPM_THRESHOLD) return "excited";
        if (wpm >= LAZY_EXIT) return "normal";
        return "lazy";
      }
      // normal
      if (wpm >= HYPER_WPM_THRESHOLD) return "hyper";
      if (wpm >= EXCITED_WPM_THRESHOLD) return "excited";
      if (wpm < LAZY_WPM_THRESHOLD) return "lazy";
      return "normal";
    });
  }, [wpm, moodOverride]);

  const effectiveMood = moodOverride ?? mood;
  const excited = effectiveMood === "excited";
  const lazy = effectiveMood === "lazy";
  const hyper = effectiveMood === "hyper";
  const panik = effectiveMood === "panik";

  const cls = [
    tapLeft ? "tapLeft" : "",
    tapRight ? "tapRight" : "",
    angry ? "angry" : "",
    excited ? "excited" : "",
    lazy ? "lazy" : "",
    hyper ? "hyper" : "",
    panik ? "panik" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <style>{CSS}</style>
      <div id="bongoCat" className={cls}>
        <div className="layer cat-body" />
        <svg
          className="keyboard-svg"
          viewBox="0 0 800 450"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* desk edge — tilted matching keyboard perspective (13°) */}
          <line
            x1="10"
            y1="115"
            x2="790"
            y2="295"
            stroke="var(--text-color)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* hand-drawn outline keyboard, spacebar edge (top) faces cat */}
          <g transform="translate(210 145) skewY(13)">
            {/* body outline: slightly wobbly bezier corners */}
            <path
              d="M 6 2 Q 260 -2 514 4 Q 522 30 516 58 Q 260 62 4 56 Q -2 30 6 2 Z"
              fill="none"
              stroke="var(--text-color)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* spacebar at top (closest to cat) */}
            <line
              x1="140"
              y1="10"
              x2="380"
              y2="10"
              stroke="var(--text-color)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* key row hints below spacebar */}
            {[24, 36, 48].map((y, i) => (
              <line
                key={`row-${i}`}
                x1="18"
                y1={y}
                x2="502"
                y2={y}
                stroke="var(--text-color)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="4 6"
                opacity="0.55"
              />
            ))}
            {/* per-key press highlights (reflects live keystrokes) */}
            {Array.from(pressed).map((k) => {
              const pos = KEY_POSITIONS[k];
              if (!pos) return null;
              const isWrong = wrongKeys?.has(k);
              return (
                <circle
                  key={`hit-${k}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={k === " " ? 10 : 6}
                  fill={isWrong ? "var(--error-color)" : "var(--main-color)"}
                  opacity="0.85"
                />
              );
            })}
            {/* hyper: cracked keyboard */}
            <g className="keyboard-crack">
              <path
                d="M90 4 L108 18 L96 28 L118 42 L108 56"
                stroke="var(--error-color)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M108 18 L124 14 M96 28 L82 32 M118 42 L134 40"
                stroke="var(--error-color)"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M240 6 L226 22 L246 32 L232 48 L250 58"
                stroke="var(--error-color)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M226 22 L212 20 M246 32 L262 30 M232 48 L218 52"
                stroke="var(--error-color)"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M400 8 L418 22 L406 38 L424 52"
                stroke="var(--error-color)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M418 22 L434 18 M406 38 L392 42"
                stroke="var(--error-color)"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </g>
        </svg>
        <div className="layer paw paw-left" />
        <div className="layer paw paw-right" />
        <svg
          className="overlay"
          viewBox="0 0 800 450"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* face — normal (default) */}
          <g className="face face-normal">
            <g className="eye eye-l">
              <circle cx="449" cy="110" r="7" fill="var(--text-color)" />
            </g>
            <g className="eye eye-r">
              <circle cx="548" cy="139" r="7" fill="var(--text-color)" />
            </g>
            <path
              d="M485 178 Q500 188 515 180"
              stroke="var(--text-color)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          {/* face — excited (sparkle eyes + open smile w/ tongue) */}
          <g className="face face-excited">
            <circle cx="449" cy="110" r="10" fill="var(--text-color)" />
            <circle cx="548" cy="139" r="10" fill="var(--text-color)" />
            <circle cx="452" cy="106" r="3" fill="var(--main-color)" />
            <circle cx="551" cy="135" r="3" fill="var(--main-color)" />
            <ellipse
              cx="500"
              cy="182"
              rx="20"
              ry="12"
              fill="var(--text-color)"
            />
            <ellipse
              cx="500"
              cy="185"
              rx="11"
              ry="7"
              fill="var(--main-color)"
            />
          </g>
          {/* face — lazy (sleepy curved eyes + tiny mouth) */}
          <g className="face face-lazy">
            <path
              d="M440 112 Q449 118 458 108"
              stroke="var(--text-color)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M539 141 Q548 147 557 137"
              stroke="var(--text-color)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse
              cx="500"
              cy="186"
              rx="7"
              ry="4"
              fill="var(--text-color)"
            />
          </g>
          {/* face — angry (> < eyes + frown) */}
          <g className="face face-angry">
            <path
              d="M440 104 L458 110 L440 116"
              stroke="var(--text-color)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M557 133 L540 139 L557 145"
              stroke="var(--text-color)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M485 188 Q500 176 515 186"
              stroke="var(--text-color)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          {/* face — hyper (fire eyes + toothy grin) */}
          <g className="face face-hyper">
            {/* left flame eye */}
            <g transform="translate(449 110)">
              <path
                className="flame-outer"
                d="M0 -16 Q -9 -6 -8 4 Q -6 12 0 12 Q 6 12 8 4 Q 9 -6 0 -16 Z"
                fill="var(--error-color)"
              />
              <path
                className="flame-inner"
                d="M0 -10 Q -5 -3 -4 4 Q 0 8 4 4 Q 5 -3 0 -10 Z"
                fill="var(--main-color)"
              />
            </g>
            {/* right flame eye */}
            <g transform="translate(548 139)">
              <path
                className="flame-outer"
                d="M0 -16 Q -9 -6 -8 4 Q -6 12 0 12 Q 6 12 8 4 Q 9 -6 0 -16 Z"
                fill="var(--error-color)"
              />
              <path
                className="flame-inner"
                d="M0 -10 Q -5 -3 -4 4 Q 0 8 4 4 Q 5 -3 0 -10 Z"
                fill="var(--main-color)"
              />
            </g>
            {/* toothy grin */}
            <path
              d="M476 174 L524 174 L518 194 L512 184 L506 196 L500 184 L494 196 L488 184 L482 194 Z"
              fill="var(--text-color)"
              stroke="var(--error-color)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>
          {/* face — panik (wide worried eyes + zigzag mouth) */}
          <g className="face face-panik">
            {/* left worried eye: big circle + small shrunken pupil (up-left) */}
            <circle cx="449" cy="110" r="11" fill="var(--text-color)" />
            <circle cx="446" cy="107" r="2.5" fill="var(--sub-color)" />
            {/* right worried eye */}
            <circle cx="548" cy="139" r="11" fill="var(--text-color)" />
            <circle cx="545" cy="136" r="2.5" fill="var(--sub-color)" />
            {/* zigzag worried mouth */}
            <path
              d="M478 184 L486 178 L494 186 L502 178 L510 186 L518 178 L526 184"
              stroke="var(--text-color)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
          {/* panik: sweat drops sliding down */}
          <g className="sweat sweat-1">
            <path
              d="M428 90 Q422 100 428 106 Q434 100 428 90 Z"
              fill="var(--sub-color)"
            />
          </g>
          <g className="sweat sweat-2">
            <path
              d="M572 118 Q566 128 572 134 Q578 128 572 118 Z"
              fill="var(--sub-color)"
            />
          </g>
          <g className="sweat sweat-3">
            <path
              d="M500 78 Q494 88 500 94 Q506 88 500 78 Z"
              fill="var(--sub-color)"
            />
          </g>
          {/* panik: manga-style shock lines radiating from head */}
          <g className="shock-lines">
            <g stroke="var(--text-color)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="500" y1="35" x2="500" y2="12" />
              <line x1="420" y1="55" x2="400" y2="42" />
              <line x1="580" y1="55" x2="600" y2="42" />
              <line x1="380" y1="90" x2="358" y2="86" />
              <line x1="620" y1="90" x2="642" y2="86" />
              <line x1="410" y1="30" x2="400" y2="16" />
              <line x1="590" y1="30" x2="600" y2="16" />
            </g>
          </g>
          {/* panik: bouncing exclamation marks above head */}
          <g className="exclaim exclaim-1">
            <text
              x="470"
              y="55"
              fontFamily="monospace"
              fontSize="48"
              fontWeight="bold"
              fill="var(--main-color)"
              textAnchor="middle"
            >
              !
            </text>
          </g>
          <g className="exclaim exclaim-2">
            <text
              x="570"
              y="42"
              fontFamily="monospace"
              fontSize="36"
              fontWeight="bold"
              fill="var(--main-color)"
              textAnchor="middle"
            >
              !
            </text>
          </g>
          <g className="exclaim exclaim-3">
            <text
              x="520"
              y="72"
              fontFamily="monospace"
              fontSize="64"
              fontWeight="bold"
              fill="var(--main-color)"
              textAnchor="middle"
            >
              !
            </text>
          </g>
          {/* angry marks near ear tips (left ear ~490, right ear ~625) */}
          <g className="angry-mark">
            <path
              d="M420 5 L440 25 M420 25 L440 5"
              stroke="var(--error-color)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M660 15 L680 35 M660 35 L680 15"
              stroke="var(--error-color)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          {/* excited: stars twinkle */}
          <g className="star">
            <path
              d="M480 90 L488 108 L508 108 L492 120 L498 138 L480 128 L462 138 L468 120 L452 108 L472 108 Z"
              fill="var(--main-color)"
            />
          </g>
          <g className="star" style={{ animationDelay: "0.25s" }}>
            <path
              d="M730 50 L738 66 L754 66 L742 76 L746 92 L730 82 L714 92 L718 76 L706 66 L722 66 Z"
              fill="var(--main-color)"
            />
          </g>
          {/* lazy: floating Z's */}
          <text
            className="zzz zzz-1"
            x="720"
            y="60"
            fontFamily="monospace"
            fontSize="42"
            fontWeight="bold"
            fill="var(--sub-color)"
          >
            z
          </text>
          <text
            className="zzz zzz-2"
            x="762"
            y="30"
            fontFamily="monospace"
            fontSize="26"
            fontWeight="bold"
            fill="var(--sub-color)"
          >
            z
          </text>
        </svg>
      </div>
    </>
  );
}
