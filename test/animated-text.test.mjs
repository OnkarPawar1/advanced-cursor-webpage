import test from 'node:test';
import assert from 'node:assert/strict';
import { textGraphemes, letterWindows, letterOpacity } from '../src/animatedText.mjs';
import { buildAssDocument } from '../server/ass.mjs';
import { hasAssOverlays } from '../server/ffmpeg.mjs';
import { parseProject } from '../server/schema.mjs';

const project = () => ({
  version: 1,
  title: 'Animated text test',
  duration: 8,
  audioField: 'audio',
  assets: [{ id: 'a', field: 'asset_0', name: 'frame.png', type: 'image', duration: 0 }],
  timeline: [{ assetIndex: 0, startTime: 0, endTime: 8, transitionEffect: 'none', imgAnim: 'none' }],
  transitionDuration: 1.5,
  enableImageAnimations: false,
  output: { width: 1920, height: 1080, fps: 30, preset: 'youtube-live', normalizeAudio: false },
  subtitles: {
    enabled: false, cues: [], font: 'Noto Sans', fontSize: 40, color: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 2, background: 'none', shadow: false,
    uppercase: false, popIn: false, positionY: 80,
  },
  watermark: { enabled: false, type: 'none' },
  presenter: { enabled: false, pointerEvents: [], strokes: [] },
  animatedText: [{
    id: 'title-1', text: 'नमस्कार भारत',
    start: 1, duration: 3.5, x: 0.25, y: 0.33,
    fontSize: 32, color: '#FFD54A',
  }],
});

test('per-letter opacity smoothly reveals and dissolves text within four seconds', () => {
  const first = letterOpacity(0.3, 0, 5, 3.5);
  const last = letterOpacity(0.3, 4, 5, 3.5);
  assert.ok(first > last);
  assert.equal(letterOpacity(-0.1, 0, 5, 3.5), 0);
  assert.equal(letterOpacity(3.5, 0, 5, 3.5), 0);
  assert.ok(letterOpacity(1.0, 2, 5, 3.5) > 0.9);
  const a = letterWindows(0, 5, 3.5);
  const b = letterWindows(4, 5, 3.5);
  assert.ok(a.exitStart < b.exitStart);
});

test('Devanagari conjuncts remain complete grapheme clusters', () => {
  assert.ok(textGraphemes('क्ष').length <= 2);
  assert.ok(textGraphemes('नमस्कार').length < 'नमस्कार'.length);
});

test('animated text alone enables ASS video overlay filter', () => {
  const value = parseProject(project());
  assert.equal(hasAssOverlays(value), true);
  const ass = buildAssDocument(value);
  assert.match(ass, /Style: AnimatedText,Noto Sans,32/);
  assert.match(ass, /Dialogue: 7,0:00:01\.00,0:00:04\.50,AnimatedText/);
  assert.match(ass, /\\pos\(480,356\)/);
  assert.match(ass, /\\t\(.*?\\alpha&H00&\)/);
  assert.match(ass, /न/);
});

test('invalid text timing and oversize font are rejected', () => {
  const late = project();
  late.animatedText[0].start = 6;
  assert.throws(() => parseProject(late), /Invalid render project/);
  const large = project();
  large.animatedText[0].fontSize = 120;
  assert.throws(() => parseProject(large), /Invalid render project/);
});

test('legacy render manifests without animatedText still work', () => {
  const old = project();
  delete old.animatedText;
  assert.deepEqual(parseProject(old).animatedText, []);
});
