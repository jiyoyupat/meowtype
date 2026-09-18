import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import TypingTest from "./TypingTest";
import ResultsView from "./ResultsView";
import AboutModal from "./AboutModal";
import ToolbarButton from "./ToolbarButton";
import LanguageDropdown from "./LanguageDropdown";
import AppearanceDropdown, {
  BongoSection,
  CaretSection,
  TextStyleSection,
  ThemeSection,
} from "./AppearanceDropdown";
import type { Result } from "../types";
import { TIME_OPTIONS, WORD_OPTIONS } from "../types";
import { LANGUAGES } from "../lib/words";
import { createProcessedMicStream } from "../lib/audio-profile";
import { useSettings } from "../contexts/SettingsContext";

export default function App() {
  const {
    config,
    setMode,
    setAmount,
    setLanguage,
    screenMode,
    setScreenMode,
    tape,
    setTape,
    showBongo,
    setShowBongo,
    bongoMoodMode,
    setBongoMoodMode,
    showKeyMap,
    setShowKeyMap,
    showCounter,
    setShowCounter,
    bilingual,
    shadowLanguage,
    setShadowLanguage,
    hardMode,
    setHardMode,
    fontScale,
    setFontScale,
    fontWeight,
    setFontWeight,
    letterSpacing,
    setLetterSpacing,
    caretStyle,
    setCaretStyle,
    caretSmooth,
    setCaretSmooth,
    fontFamily,
    setFontFamily,
    theme,
    setTheme,
    customColors,
    setCustomColors,
    resetAppearance,
  } = useSettings();

  const [result, setResult] = useState<Result | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setScreenMode((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreenMode]);

  // in-browser screen recording (getDisplayMedia + MediaRecorder → .webm)
  const [recording, setRecording] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  // Mic state: 'off' = no mic track, 'raw' = mic recorded as-is,
  // 'fx' = mic passed through EQ/compressor/limiter chain.
  type MicMode = "off" | "raw" | "fx";
  const [micMode, setMicMode] = useState<MicMode>(() => {
    try {
      const v = localStorage.getItem("recordMic");
      if (v === "off" || v === "raw" || v === "fx") return v;
      // legacy: "1" meant on (default to processed), "0" meant off
      if (v === "1") return "fx";
      return "off";
    } catch {
      return "off";
    }
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  // AudioContext used to run the mic through the EQ/compressor/limiter chain
  // defined in src/lib/audio-profile.ts. Closed on stop.
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("recordMic", micMode);
    } catch {
      // ignore
    }
  }, [micMode]);

  const startRecording = useCallback(async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: false,
        // Chromium-only: skip the picker and prompt to share the current tab.
        // Non-Chromium browsers ignore this and fall back to the normal picker.
        preferCurrentTab: true,
      } as DisplayMediaStreamOptions);

      let mic: MediaStream | null = null;
      let processedMic: MediaStream | null = null;
      if (micMode !== "off") {
        try {
          mic = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
          micStreamRef.current = mic;
          if (micMode === "fx") {
            // Route the mic through the EQ/compressor/limiter chain.
            try {
              const ctx = new AudioContext();
              audioCtxRef.current = ctx;
              processedMic = createProcessedMicStream(ctx, mic);
            } catch (err) {
              console.warn("audio processing unavailable, using raw mic", err);
              processedMic = mic;
            }
          } else {
            // Raw mic — no processing.
            processedMic = mic;
          }
        } catch (err) {
          console.warn("microphone unavailable, recording without audio", err);
        }
      }

      const stream = processedMic
        ? new MediaStream([
            ...display.getVideoTracks(),
            ...processedMic.getAudioTracks(),
          ])
        : display;

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus"
      )
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
      const rec = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 128_000,
      });
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meowtype-${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        display.getTracks().forEach((t) => t.stop());
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
        recorderRef.current = null;
      };
      // auto-stop if user cancels sharing via native UI
      display.getVideoTracks()[0]!.onended = () => {
        if (rec.state !== "inactive") rec.stop();
        setRecording(false);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (err) {
      console.error("recording failed", err);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setRecording(false);
    }
  }, [micMode]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
  }, []);

  const restart = useCallback(() => {
    setResult(null);
    setRunKey((k) => k + 1);
  }, []);

  // restart automatically when config changes (skip first mount)
  const isFirstConfigRef = useRef(true);
  useEffect(() => {
    if (isFirstConfigRef.current) {
      isFirstConfigRef.current = false;
      return;
    }
    restart();
  }, [config, shadowLanguage, restart]);

  // Tab then Enter (2-key sequence) = restart test
  useEffect(() => {
    let tabWaiting = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        tabWaiting = true;
        return;
      }
      if (tabWaiting) {
        if (e.key === "Enter") {
          e.preventDefault();
          restart();
        }
        tabWaiting = false;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart]);

  const options = config.mode === "time" ? TIME_OPTIONS : WORD_OPTIONS;

  return (
    <div className="min-h-full flex flex-col">
      {!screenMode && (
        <a
          href="https://github.com/jiyoyupat/meowtype"
          target="_blank"
          rel="noopener noreferrer"
          className="github-corner fixed top-0 right-0 z-40 text-main hover:text-text transition-colors"
          title="View source on GitHub"
          aria-label="GitHub repository"
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 250 250"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" />
            <path
              className="octo-arm"
              d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
              fill="var(--octo-body-fill, #111)"
            />
            <path
              className="octo-body"
              d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z"
              fill="var(--octo-body-fill, #111)"
            />
          </svg>
        </a>
      )}
      <header
        className={
          "w-full max-w-5xl mx-auto px-6 pt-6 pb-8 flex items-start justify-between" +
          (screenMode ? " invisible pointer-events-none" : "")
        }
        aria-hidden={screenMode || undefined}
      >
          <AppearanceDropdown
            trigger={
              <span className="text-main text-2xl font-bold tracking-tight hover:text-text transition-colors">
                meowtype
              </span>
            }
            items={[
              { label: "tape", value: tape, onToggle: () => setTape((v) => !v) },
              { label: "bongo", value: showBongo, onToggle: () => setShowBongo((v) => !v) },
              { label: "keymap", value: showKeyMap, onToggle: () => setShowKeyMap((v) => !v) },
              { label: "counter", value: showCounter, onToggle: () => setShowCounter((v) => !v) },
            ]}
            extras={
              <>
                <ThemeSection
                  theme={theme}
                  setTheme={setTheme}
                  customColors={customColors}
                  setCustomColors={setCustomColors}
                />
                <div className="border-t border-sub/20" />
                <TextStyleSection
                  fontScale={fontScale}
                  setFontScale={setFontScale}
                  fontWeight={fontWeight}
                  setFontWeight={setFontWeight}
                  letterSpacing={letterSpacing}
                  setLetterSpacing={setLetterSpacing}
                  fontFamily={fontFamily}
                  setFontFamily={setFontFamily}
                />
                <div className="border-t border-sub/20" />
                <CaretSection
                  caretStyle={caretStyle}
                  setCaretStyle={setCaretStyle}
                  caretSmooth={caretSmooth}
                  setCaretSmooth={setCaretSmooth}
                />
                <div className="border-t border-sub/20" />
                {showBongo && (
                  <>
                    <BongoSection
                      bongoMoodMode={bongoMoodMode}
                      setBongoMoodMode={setBongoMoodMode}
                    />
                    <div className="border-t border-sub/20" />
                  </>
                )}
                <button
                  onClick={resetAppearance}
                  className="w-full text-left px-3 py-1.5 text-sm text-sub hover:text-error hover:bg-sub/20 transition-colors"
                  title="Reset all appearance settings and drag positions"
                >
                  reset all
                </button>
              </>
            }
          />
          <nav className="flex items-center gap-4 text-sub text-sm">
            <LanguageDropdown
              value={bilingual ? shadowLanguage : config.language}
              options={LANGUAGES}
              onChange={bilingual ? setShadowLanguage : setLanguage}
            />
            <span className="text-sub/40">|</span>
            <ToolbarButton
              active
              onClick={() =>
                setMode(config.mode === "time" ? "words" : "time")
              }
            >
              mode: {config.mode}
            </ToolbarButton>
            <span className="text-sub/40">|</span>
            {options.map((o) => (
              <ToolbarButton
                key={o}
                active={config.amount === o}
                onClick={() => setAmount(o)}
              >
                {o}
              </ToolbarButton>
            ))}
            <span className="text-sub/40">|</span>
            <ToolbarButton
              active={hardMode}
              onClick={() => setHardMode((v) => !v)}
              title="Fail on first typo"
            >
              hard
            </ToolbarButton>
          </nav>
        </header>

      <main className="flex-1 flex items-start justify-center pt-8 pb-20">
        {result ? (
          <ResultsView result={result} onRestart={restart} />
        ) : (
          <TypingTest
            key={runKey}
            onFinish={setResult}
            onRestart={restart}
          />
        )}
      </main>

      {!screenMode && (
        <footer className="text-center text-sub/60 text-xs pb-6">
          built by jiyo, inspired by monkeytype
        </footer>
      )}

      {/* screen mode toggle — small floating button (Alt+S also toggles) */}
      <div className="fixed bottom-2 right-2 flex items-center gap-3">
        <button
          onClick={() =>
            setMicMode((m) =>
              m === "off" ? "raw" : m === "raw" ? "fx" : "off"
            )
          }
          disabled={recording}
          className="text-xs font-mono px-2 py-1 transition-colors hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: micMode !== "off" ? "#e2b714" : undefined }}
          title={
            micMode === "off"
              ? "Microphone is muted (click to enable raw)"
              : micMode === "raw"
                ? "Microphone recorded raw (click for FX profile)"
                : "Microphone recorded with EQ/compressor/limiter (click to mute)"
          }
        >
          {micMode === "off"
            ? "🎙 mic off"
            : micMode === "raw"
              ? "🎙 mic raw"
              : "🎙 mic fx"}
        </button>
        <button
          onClick={recording ? stopRecording : startRecording}
          className="text-xs font-mono px-2 py-1 transition-colors hover:text-text"
          style={{ color: recording ? "#ca4754" : undefined }}
          title="Record video (webm)"
        >
          {recording ? "■ stop" : "● record"}
        </button>
        <button
          onClick={() => setScreenMode((v) => !v)}
          className="text-xs text-sub/40 hover:text-sub px-2 py-1 font-mono"
          title="Toggle black-bg screen mode (Alt+S)"
        >
          {screenMode ? "exit screen" : "screen"}
        </button>
        <button
          onClick={() => setShowAbout(true)}
          className="text-xs text-sub/40 hover:text-sub px-2 py-1 font-mono"
          title="About meowtype"
        >
          about
        </button>
      </div>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}

