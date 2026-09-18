import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Result } from "../types";
import { recordPb, type PbEntry } from "../lib/pb";

// grace period after results appear, so a stray Space/Enter (often the
// last keystroke of the test) doesn't immediately restart the test before
// the user gets to see the chart.
const RESTART_GRACE_MS = 1000;

export default function ResultsView({
  result,
  onRestart,
}: {
  result: Result;
  onRestart: () => void;
}) {
  // swallow Space/Enter for a short grace window so the user can actually
  // see the results before an accidental keystroke restarts the test.
  useEffect(() => {
    // blur whatever had focus (typically the test container / restart button)
    // to prevent default button activation via Space/Enter.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const mountedAt = Date.now();
    const swallow = (e: KeyboardEvent) => {
      if (Date.now() - mountedAt >= RESTART_GRACE_MS) return;
      if (e.key === " " || e.key === "Enter" || e.key === "Spacebar") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", swallow, { capture: true });
    window.addEventListener("keyup", swallow, { capture: true });
    return () => {
      window.removeEventListener("keydown", swallow, { capture: true });
      window.removeEventListener("keyup", swallow, { capture: true });
    };
  }, []);

  // record personal best (per mode + amount + language) on mount
  const [pb, setPb] = useState<{
    previous: PbEntry | null;
    isNewPb: boolean;
  } | null>(null);
  useEffect(() => {
    const outcome = recordPb(result.mode, result.amount, result.language, {
      wpm: Math.round(result.wpm),
      acc: Math.round(result.accuracy),
      raw: Math.round(result.raw),
    });
    setPb(outcome);
  }, [
    result.mode,
    result.amount,
    result.language,
    result.wpm,
    result.accuracy,
    result.raw,
  ]);

  const data = result.samples.map((s) => ({
    t: s.t,
    wpm: Math.round(s.wpm),
    raw: Math.round(s.raw),
    errors: s.errors,
  }));

  // build sparse x-axis ticks so labels never overlap on long tests
  const maxT = data.length ? data[data.length - 1].t : 0;
  const step =
    maxT <= 15
      ? 3
      : maxT <= 30
        ? 5
        : maxT <= 60
          ? 10
          : maxT <= 120
            ? 15
            : maxT <= 300
              ? 30
              : 60;
  const ticks: number[] = [];
  for (let t = 0; t <= maxT; t += step) ticks.push(t);
  if (ticks.length && ticks[ticks.length - 1] !== maxT) ticks.push(maxT);

  return (
    <div className="w-full max-w-5xl mx-auto px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div>
          <div className="text-sub text-sm flex items-center gap-2">
            <span>wpm</span>
            {pb?.isNewPb && (
              <span
                className="text-main text-xs font-medium px-1.5 py-0.5 rounded"
                style={{ background: "rgba(226, 183, 20, 0.18)" }}
                title="new personal best"
              >
                new pb
              </span>
            )}
          </div>
          <div className="text-main font-medium text-5xl">
            {Math.round(result.wpm)}
          </div>
          {pb && !pb.isNewPb && pb.previous && (
            <div className="text-sub/70 text-xs mt-1">
              best {pb.previous.wpm}
            </div>
          )}
        </div>
        <Stat label="acc" value={`${Math.round(result.accuracy)}%`} big />
        <Stat label="raw" value={Math.round(result.raw)} />
        <Stat
          label="chars"
          value={`${result.correctChars}/${result.incorrectChars}`}
        />
        <Stat label="time" value={`${result.durationSec.toFixed(1)}s`} />
        <Stat label="language" value={result.language} />
      </div>

      <div className="h-72 w-full bg-black/10 rounded p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid stroke="#3a3c3f" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, maxT]}
              ticks={ticks}
              tickFormatter={(v: number) => `${v}s`}
              stroke="#646669"
              tick={{ fill: "#646669", fontSize: 12 }}
              tickMargin={8}
              minTickGap={24}
              label={{
                value: "seconds",
                position: "insideBottom",
                fill: "#646669",
                dy: 16,
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#646669"
              tick={{ fill: "#646669", fontSize: 12 }}
              width={40}
              allowDecimals={false}
              label={{
                value: "wpm",
                angle: -90,
                position: "insideLeft",
                fill: "#646669",
                dy: 20,
                fontSize: 12,
              }}
            />
            <Tooltip
              cursor={{ stroke: "#646669", strokeDasharray: "3 3" }}
              contentStyle={{
                background: "#323437",
                border: "1px solid #646669",
                borderRadius: 4,
                fontSize: 12,
              }}
              labelStyle={{ color: "#d1d0c5" }}
              labelFormatter={(v: number) => `${v}s`}
            />
            <Legend
              verticalAlign="top"
              height={24}
              iconType="plainline"
              wrapperStyle={{ fontSize: 12, color: "#646669" }}
            />
            <Line
              name="wpm"
              type="monotone"
              dataKey="wpm"
              stroke="#e2b714"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              name="raw"
              type="monotone"
              dataKey="raw"
              stroke="#646669"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

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
    </div>
  );
}

function Stat({
  label,
  value,
  big,
}: {
  label: string;
  value: string | number;
  big?: boolean;
}) {
  return (
    <div>
      <div className="text-sub text-sm">{label}</div>
      <div
        className={
          "text-main font-medium " + (big ? "text-5xl" : "text-3xl")
        }
      >
        {value}
      </div>
    </div>
  );
}
