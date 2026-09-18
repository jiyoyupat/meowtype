import type { Language } from "./lib/words";

export type Mode = "time" | "words";

export type TestConfig = {
  mode: Mode;
  amount: number;
  language: Language;
};

export const TIME_OPTIONS = [15, 30, 60, 120] as const;
export const WORD_OPTIONS = [10, 25, 50, 100] as const;

export type WpmSample = {
  t: number; // seconds elapsed
  wpm: number;
  raw: number;
  errors: number;
};

export type Result = {
  wpm: number;
  raw: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  durationSec: number;
  mode: Mode;
  amount: number;
  language: Language;
  samples: WpmSample[];
};
