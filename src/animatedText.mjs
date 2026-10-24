// Shared by browser preview and the local FFmpeg/ASS renderer.
// Timings are relative to the beginning of one animated text cue.
export function textGraphemes(value) {
  const text = String(value ?? '');
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)]
      .map(part => part.segment);
  }
  return Array.from(text);
}

export function letterWindows(index, count, duration) {
  const total = Math.max(1, count);
  const fraction = total <= 1 ? 0 : index / (total - 1);
  const entryStart = Math.round(600 * fraction);
  const entryEnd = entryStart + 220;
  const exitStart = Math.round((duration - 0.95) * 1000 + 650 * fraction);
  const exitEnd = exitStart + 250;
  return { entryStart, entryEnd, exitStart, exitEnd };
}

const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function letterOpacity(ageSeconds, index, count, duration) {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= duration) return 0;
  const { entryStart, entryEnd, exitStart, exitEnd } = letterWindows(index, count, duration);
  const ms = ageSeconds * 1000;
  const incoming = smooth((ms - entryStart) / (entryEnd - entryStart));
  const outgoing = 1 - smooth((ms - exitStart) / (exitEnd - exitStart));
  return Math.max(0, Math.min(1, incoming * outgoing));
}
