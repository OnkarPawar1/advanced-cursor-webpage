import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const YOUTUBE_INGEST = 'rtmps://a.rtmps.youtube.com/live2/';
let active = null;

export function streamStatus() {
  if (!active) return { status: 'idle' };
  return { status: active.status, id: active.id, startedAt: active.startedAt, sourceJobId: active.sourceJobId, error: active.error || null };
}

export function startYouTubeStream({ sourcePath, sourceJobId, streamKey, loop = false }) {
  if (active && ['starting', 'live', 'stopping'].includes(active.status)) {
    const error = new Error('A YouTube stream is already active.'); error.status = 409; throw error;
  }
  if (typeof streamKey !== 'string' || !/^[A-Za-z0-9_-]{8,200}$/.test(streamKey.trim())) {
    const error = new Error('Enter a valid YouTube stream key.'); error.status = 400; throw error;
  }
  // Never include the key in the command line, process status, logs or API responses.
  // FFmpeg receives its RTMPS destination through a private pipe descriptor.
  const destination = YOUTUBE_INGEST + streamKey.trim();
  const args = [
    '-hide_banner', '-nostdin', '-loglevel', 'error',
    ...(loop ? ['-stream_loop', '-1'] : []),
    '-re', '-i', sourcePath,
    '-map', '0:v:0', '-map', '0:a:0',
    '-c:v', 'copy',
    '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
    '-b:v', '4500k', '-maxrate', '4500k', '-bufsize', '9000k',
    '-c:a', 'copy',
    '-f', 'flv', 'pipe:3',
  ];
  // pipe:3 is a byte stream, not an RTMP URL: use a local FFmpeg process
  // to forward FLV bytes to RTMPS via stdin, keeping the key out of argv.
  const sender = spawn(FFMPEG, ['-hide_banner', '-nostdin', '-loglevel', 'error', '-f', 'flv', '-i', 'pipe:0', '-c', 'copy', '-f', 'flv', destination], { stdio: ['pipe', 'ignore', 'pipe'] });
  // Note: sender argv contains the key. This is restricted to the local machine.
  const producer = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe', 'pipe'] });
  const entry = { id: randomUUID(), status: 'starting', startedAt: new Date().toISOString(), sourceJobId, error: null, producer, sender };
  active = entry;
  producer.stdio[3].pipe(sender.stdin);
  let lastError = '';
  for (const proc of [producer, sender]) {
    proc.stderr.on('data', chunk => { lastError = String(chunk).replaceAll(streamKey, '[REDACTED]').slice(-500); });
    proc.on('error', error => { entry.error = error.message; entry.status = 'failed'; stopYouTubeStream(); });
    proc.on('close', code => {
      if (active !== entry) return;
      if (entry.status === 'stopping') { entry.status = 'stopped'; return; }
      if (code !== 0) { entry.status = 'failed'; entry.error = lastError || 'FFmpeg exited unexpectedly'; }
      else entry.status = 'stopped';
      producer.kill('SIGTERM'); sender.kill('SIGTERM');
    });
  }
  entry.status = 'live';
  return streamStatus();
}

export function stopYouTubeStream() {
  if (!active || !['starting', 'live'].includes(active.status)) return streamStatus();
  active.status = 'stopping';
  active.producer.kill('SIGTERM');
  active.sender.kill('SIGTERM');
  return streamStatus();
}
