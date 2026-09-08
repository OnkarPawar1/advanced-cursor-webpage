import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { buildAssDocument } from '../server/ass.mjs';
import { buildFfmpegCommand, inspectFfmpeg, renderProject } from '../server/ffmpeg.mjs';
import { parseProject } from '../server/schema.mjs';

const exec = promisify(execFile);

async function unusedPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Render server did not start')), 10_000);
    const ready = (chunk) => {
      if (!chunk.toString().includes('renderer listening')) return;
      clearTimeout(timer);
      child.stdout.off('data', ready);
      resolve();
    };
    child.stdout.on('data', ready);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Render server exited early with code ${code}`));
    });
  });
}

function project(overrides = {}) {
  return {
    version: 1,
    title: 'Production Test',
    duration: 2,
    audioField: 'audio',
    assets: [
      { id: 'red', field: 'asset_0', name: 'red.bmp', type: 'image', duration: 0 },
      { id: 'blue', field: 'asset_1', name: 'blue.bmp', type: 'image', duration: 0 },
    ],
    timeline: [
      { assetIndex: 0, startTime: 0, endTime: 1, transitionEffect: 'crossfade', imgAnim: 'none' },
      { assetIndex: 1, startTime: 1, endTime: 2, transitionEffect: 'none', imgAnim: 'none' },
    ],
    transitionDuration: 0.2,
    enableImageAnimations: false,
    output: { width: 1280, height: 720, fps: 24, preset: 'balanced', normalizeAudio: false },
    subtitles: {
      enabled: false, cues: [], font: 'Arial', fontSize: 42, color: '#FFFFFF',
      strokeColor: '#000000', strokeWidth: 4, background: 'none', shadow: true,
      uppercase: false, popIn: false, positionY: 84,
    },
    watermark: { enabled: false, type: 'none' },
    presenter: { enabled: false, pointerEvents: [], strokes: [] },
    ...overrides,
  };
}

test('project validation accepts a consistent timeline', () => {
  const parsed = parseProject(project());
  assert.equal(parsed.timeline.length, 2);
  assert.equal(parsed.output.preset, 'balanced');
});

test('project validation rejects references to missing assets', () => {
  const invalid = project({
    timeline: [{ assetIndex: 9, startTime: 0, endTime: 2, transitionEffect: 'none', imgAnim: 'none' }],
  });
  assert.throws(() => parseProject(invalid), (error) => error.statusCode === 400 || error.status === 400);
});

test('ASS generation preserves styled captions and recorded Presenter FX', () => {
  const document = buildAssDocument(project({
    subtitles: {
      enabled: true,
      cues: [{ start: 0.1, end: 1.5, text: 'Hello {creator}' }],
      font: 'Anton', fontSize: 48, color: '#FFE81F', strokeColor: '#000000',
      strokeWidth: 8, background: 'none', shadow: true, uppercase: true, popIn: true, positionY: 84,
    },
    watermark: { enabled: true, type: 'text', text: 'Channel Name' },
    presenter: {
      enabled: true,
      pointerEvents: [{ time: 0.2, x: 0.5, y: 0.5, mode: 'cursor', style: 'whisk', color: '#FFE45E', size: 34 }],
      strokes: [{ start: 0.3, end: 0.6, visibleUntil: 1.5, type: 'pen', color: '#FFE45E', width: 8, points: [{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.4 }] }],
    },
  }));
  assert.match(document, /Style: Caption,Anton/);
  assert.match(document, /HELLO \\{CREATOR\\}/);
  assert.match(document, /Channel Name/);
  assert.match(document, /\\p1/);
});

test('ASS generation renders the full-width caption band below the text layer', () => {
  const document = buildAssDocument(project({
    subtitles: {
      enabled: true,
      cues: [{ start: 0.1, end: 1.5, text: 'Readable caption' }],
      font: 'Montserrat', fontSize: 48, color: '#FFFFFF', strokeColor: '#000000',
      strokeWidth: 4, background: 'band', shadow: false, uppercase: false, popIn: false, positionY: 84,
    },
  }));
  assert.match(document, /Dialogue: 2,[^\n]+\\p1[^\n]+m 0 \d+ l 1280 \d+/);
  assert.match(document, /Dialogue: 3,[^\n]+Readable caption/);
});

test('command builder uses xfade and production H.264 settings without a shell', () => {
  const capabilities = {
    encoders: { libx264: true, h264Videotoolbox: false, proresKs: true },
    filters: { ass: true, xfade: true, zoompan: true, overlay: true },
  };
  const command = buildFfmpegCommand(project(), {
    audio: '/tmp/audio.wav', asset_0: '/tmp/red.bmp', asset_1: '/tmp/blue.bmp',
  }, '/tmp/render-job', capabilities);
  assert.equal(command.executable, process.env.FFMPEG_PATH || 'ffmpeg');
  assert.ok(command.args.includes('libx264'));
  assert.match(command.filterGraph, /xfade=transition=fade:duration=0\.2:offset=0\.8/);
  assert.equal(command.args.at(-1), '/tmp/render-job/output.mp4');
});

test('repeated timeline assets are decoded once and split into filter branches', () => {
  const capabilities = {
    encoders: { libx264: true, h264Videotoolbox: false, proresKs: true },
    filters: { ass: true, xfade: true, zoompan: true, overlay: true },
  };
  const repeated = project({
    duration: 3,
    timeline: [
      { assetIndex: 0, startTime: 0, endTime: 1, transitionEffect: 'none', imgAnim: 'none' },
      { assetIndex: 1, startTime: 1, endTime: 2, transitionEffect: 'none', imgAnim: 'none' },
      { assetIndex: 0, startTime: 2, endTime: 3, transitionEffect: 'none', imgAnim: 'none' },
    ],
  });
  const command = buildFfmpegCommand(repeated, {
    audio: '/tmp/audio.wav', asset_0: '/tmp/red.bmp', asset_1: '/tmp/blue.bmp',
  }, '/tmp/render-job', capabilities);
  assert.match(command.filterGraph, /\[1:v\]split=2\[asset0-0\]\[asset0-1\]/);
  assert.equal(command.args.filter((argument) => argument === '/tmp/red.bmp').length, 1);
});

test('FFmpeg integration renders a valid two-scene MP4', { timeout: 60_000 }, async (context) => {
  const capabilities = await inspectFfmpeg();
  if (!capabilities.available || !capabilities.encoders.libx264 || !capabilities.filters.xfade) {
    context.skip('A full FFmpeg build is unavailable');
    return;
  }

  const directory = await mkdtemp(join(tmpdir(), 'presenter fx test-'));
  const files = {
    audio: join(directory, 'audio.wav'),
    asset_0: join(directory, 'red.bmp'),
    asset_1: join(directory, 'blue.bmp'),
  };
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'pcm_s16le', files.audio]);
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=640x360', '-frames:v', '1', files.asset_0]);
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=640x360', '-frames:v', '1', files.asset_1]);

  const renderManifest = project({
    enableImageAnimations: true,
    timeline: [
      { assetIndex: 0, startTime: 0, endTime: 1, transitionEffect: 'crossfade', imgAnim: 'zoom-in' },
      { assetIndex: 1, startTime: 1, endTime: 2, transitionEffect: 'none', imgAnim: 'pan-right' },
    ],
    subtitles: {
      enabled: true,
      cues: [{ start: 0.1, end: 1.8, text: 'Production render' }],
      font: 'Arial', fontSize: 42, color: '#FFFFFF', strokeColor: '#000000',
      strokeWidth: 4, background: 'none', shadow: true, uppercase: false, popIn: true, positionY: 84,
    },
    watermark: { enabled: true, type: 'text', text: 'Presenter FX' },
    presenter: {
      enabled: true,
      pointerEvents: [{ time: 0.4, x: 0.5, y: 0.45, mode: 'cursor', style: 'whisk', color: '#FFE45E', size: 34 }],
      strokes: [{ start: 0.5, end: 0.7, visibleUntil: 1.6, type: 'pen', color: '#FFE45E', width: 8, points: [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.35 }] }],
    },
  });
  const result = await renderProject({
    project: parseProject(renderManifest), files, jobDirectory: directory, capabilities,
    signal: new AbortController().signal, onProgress: () => {},
  });
  const output = await stat(result.outputPath);
  assert.ok(output.size > 1_000);
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', result.outputPath]);
  assert.ok(Math.abs(Number(stdout.trim()) - 2) < 0.15);

  // A debug aid if this test ever fails on a different FFmpeg build.
  assert.ok((await readFile(result.outputPath)).length === output.size);

  if (capabilities.encoders.proresKs) {
    const proresManifest = parseProject({
      ...renderManifest,
      title: 'Production ProRes Test',
      output: { ...renderManifest.output, preset: 'prores-master' },
    });
    const prores = await renderProject({
      project: proresManifest, files, jobDirectory: directory, capabilities,
      signal: new AbortController().signal, onProgress: () => {},
    });
    const { stdout: streamJson } = await exec('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt', '-of', 'json', prores.outputPath,
    ]);
    const stream = JSON.parse(streamJson).streams[0];
    assert.equal(stream.codec_name, 'prores');
    assert.equal(stream.pix_fmt, 'yuv422p10le');
  }
});

test('local production API reports health and completes a render job', { timeout: 60_000 }, async (context) => {
  const capabilities = await inspectFfmpeg();
  if (!capabilities.available || !capabilities.encoders.libx264 || !capabilities.filters.xfade) {
    context.skip('A full FFmpeg build is unavailable');
    return;
  }

  const directory = await mkdtemp(join(tmpdir(), 'presenter-fx-api-test-'));
  const fixtureDirectory = join(directory, 'fixtures');
  await exec('mkdir', ['-p', fixtureDirectory]);
  const audio = join(fixtureDirectory, 'audio.wav');
  const red = join(fixtureDirectory, 'red.bmp');
  const blue = join(fixtureDirectory, 'blue.bmp');
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=3', '-c:a', 'pcm_s16le', audio]);
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=640x360', '-frames:v', '1', red]);
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=640x360', '-frames:v', '1', blue]);

  const port = await unusedPort();
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, RENDER_PORT: String(port), RENDER_TEMP_DIR: join(directory, 'jobs') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  context.after(() => child.kill('SIGTERM'));
  await waitForServer(child);

  const base = `http://127.0.0.1:${port}`;
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ready');

  const form = new FormData();
  form.append('audio', new Blob([await readFile(audio)], { type: 'audio/wav' }), 'audio.wav');
  form.append('asset_0', new Blob([await readFile(red)], { type: 'image/bmp' }), 'red.bmp');
  form.append('asset_1', new Blob([await readFile(blue)], { type: 'image/bmp' }), 'blue.bmp');
  form.append('project', JSON.stringify(project({
    duration: 3,
    timeline: [
      { assetIndex: 0, startTime: 0, endTime: 1, transitionEffect: 'none', imgAnim: 'none' },
      { assetIndex: 1, startTime: 1, endTime: 2, transitionEffect: 'none', imgAnim: 'none' },
      { assetIndex: 0, startTime: 2, endTime: 3, transitionEffect: 'none', imgAnim: 'none' },
    ],
  })));
  const accepted = await fetch(`${base}/api/renders`, { method: 'POST', body: form });
  const acceptedBody = await accepted.json();
  assert.equal(accepted.status, 202, JSON.stringify(acceptedBody));

  let statusBody;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const statusResponse = await fetch(`${base}/api/renders/${acceptedBody.job.id}`);
    statusBody = await statusResponse.json();
    if (['completed', 'failed', 'cancelled'].includes(statusBody.job.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(statusBody.job.status, 'completed', statusBody.job.error);
  const download = await fetch(`${base}${statusBody.downloadUrl}`);
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-type'), /video\/mp4/);
  assert.ok((await download.arrayBuffer()).byteLength > 1_000);
});
