// Mic processing chain for keyboard clack recording.
// Chain: source → low-shelf (bass -3dB) → high-shelf (treble +2dB) →
//        compressor → makeup gain → limiter → destination.
//
// EQ approach: the detailed 12-band keyboard_clack_eq preset was intentionally
// dropped; simple bass/treble shelves preserve the mic's natural character
// while still trimming rumble and adding a touch of air for switch clack.
//
// Compressor/limiter based on Audacity presets in src/assets/audio-effects/,
// softened for Web Audio (no lookahead, transient-preserving settings).

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

// Build the processing graph and return a MediaStream with the processed
// audio. Caller owns the AudioContext and must close it after recording.
export function createProcessedMicStream(
  ctx: AudioContext,
  mic: MediaStream
): MediaStream {
  const source = ctx.createMediaStreamSource(mic);

  // Bass: low-shelf at 200Hz, -3dB. Trims rumble/desk thump without
  // gutting body.
  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;
  bass.gain.value = -3;
  source.connect(bass);

  // Treble: high-shelf at 6kHz, +2dB. Adds a bit of air/click sparkle.
  const treble = ctx.createBiquadFilter();
  treble.type = "highshelf";
  treble.frequency.value = 6000;
  treble.gain.value = 2;
  bass.connect(treble);

  // Compressor. Attack 15ms deliberately lets the initial transient through
  // so the natural switch character survives. Ratio 3.5 keeps peak-to-average
  // dynamic (clack "pop") instead of squashing it flat.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18.1;
  comp.knee.value = 3.9;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.015;
  comp.release.value = 0.09;
  treble.connect(comp);

  // Makeup gain.
  const makeup = ctx.createGain();
  makeup.gain.value = dbToLinear(1.5);
  comp.connect(makeup);

  // Limiter (compressor tuned aggressively). Threshold at -3dB so it acts as
  // a true safety net (catches clipping only) instead of clamping every clack
  // peak.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 3.7;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.0718;
  makeup.connect(limiter);

  const dest = ctx.createMediaStreamDestination();
  limiter.connect(dest);

  return dest.stream;
}
