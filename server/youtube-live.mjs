import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
let active = null;
export function liveStatus() {
  if (!active) return { status: 'idle' };
  const { id, status, startedAt, sourceJobId, error, loop, progress } = active;
  return { id, status, startedAt, sourceJobId, error, loop, progress };
}
export function buildLiveArgs({ sourcePath, streamKey, loop = false }) {
  if (typeof sourcePath !== 'string' || !sourcePath) throw Object.assign(new Error('Missing source video'), { status: 400 });
  if (typeof loop !== 'boolean') throw Object.assign(new Error('Loop must be a boolean'), { status: 400 });
  if (typeof streamKey !== 'string' || !/^[A-Za-z0-9_-]{8,200}$/.test(streamKey.trim())) {
    throw Object.assign(new Error('Enter a valid YouTube stream key'), { status: 400 });
  }
  const args = [
    '-hide_banner', '-nostdin', '-loglevel', 'error',
    ...(loop ? ['-stream_loop', '-1'] : []), '-re', '-i', sourcePath,
    '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-c:a', 'copy',
    '-f', 'flv', '-progress', 'pipe:1', '-nostats',
    'rtmps://a.rtmps.youtube.com/live2/' + streamKey.trim()
  ];
  return args;
}
export function startYouTubeStream({ sourcePath, sourceJobId, streamKey, loop = false }) {
  if (active && ['connecting', 'live', 'stopping'].includes(active.status)) {
    throw Object.assign(new Error('A stream is already running'), { status: 409 });
  }
  const args = buildLiveArgs({ sourcePath, streamKey, loop });
  const entry = {
    id: randomUUID(), status: 'connecting', startedAt: new Date().toISOString(),
    sourceJobId, error: null, loop,
    progress: { secondsSent: 0, frames: 0 }, child: null
  };
  active = entry;
  const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  entry.child = child;
  let remainder = '';
  child.stdout.on('data', chunk => {
    remainder += chunk.toString();
    const lines = remainder.split(/\r?\n/);
    remainder = lines.pop() || '';
    for (const line of lines) {
      const [key, value] = line.split('=', 2);
      if (key === 'frame') entry.progress.frames = Number(value) || 0;
      if (key === 'out_time_us' || key === 'out_time_ms') entry.progress.secondsSent = Number(value) / 1000000 || 0;
      if (key === 'progress' && value === 'continue' && entry.status === 'connecting') entry.status = 'live';
    }
  });
  let lastError = '';
  child.stderr.on('data', chunk => {
    const detail = String(chunk);
    // Keep FFmpeg diagnostic text out of APIs because it can contain the
    // ingest URL, including the stream key, even across chunk boundaries.
    lastError = /403|401|unauthorized|forbidden/i.test(detail)
      ? 'YouTube rejected the stream. Check the stream key and broadcast settings.'
      : /connection|network|timed out|resolve|dns/i.test(detail)
        ? 'Could not connect to YouTube. Check your network and RTMPS access.'
        : 'FFmpeg could not stream this file. Check its H.264/AAC encoding.';
  });
  child.on('error', err => {
    entry.status = 'failed';
    entry.error = err.message.replaceAll(streamKey.trim(), '[REDACTED]');
  });
  child.on('close', code => {
    if (entry.status === 'stopping') entry.status = 'stopped';
    else if (entry.status !== 'failed' && code === 0) entry.status = 'ended';
    else if (entry.status !== 'failed') {
      entry.status = 'failed';
      entry.error = lastError || 'FFmpeg disconnected (exit ' + code + ')';
    }
    entry.child = null;
  });
  return liveStatus();
}
export function stopYouTubeStream() {
  if (active && ['connecting', 'live'].includes(active.status)) {
    active.status = 'stopping';
    active.child?.kill('SIGTERM');
  }
  return liveStatus();
}
