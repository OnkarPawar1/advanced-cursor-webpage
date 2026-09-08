import { execFile as execFileCallback, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { writeAssFile } from './ass.mjs';

const execFile = promisify(execFileCallback);
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

const XFADE_MAP = {
  crossfade: 'fade',
  'fade-black': 'fadeblack',
  slide: 'slideleft',
  'slide-right': 'slideright',
  'slide-up': 'slideup',
  'slide-down': 'slidedown',
  zoom: 'zoomin',
  'zoom-out': 'squeezev',
  spin: 'radial',
  'iris-open': 'circleopen',
  'iris-close': 'circleclose',
  'clock-wipe': 'radial',
  curtains: 'horzopen',
  blinds: 'hlslice',
};

function number(value) {
  return Number(value.toFixed(4));
}

function filterPath(path) {
  return `'${path.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'")}'`;
}

function mediaScale(width, height) {
  return `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height},setsar=1`;
}

function kenBurnsFilter(animation, duration, width, height, fps) {
  const sourceWidth = width * 2;
  const sourceHeight = height * 2;
  const frames = Math.max(2, Math.ceil(duration * fps));
  const progress = `min(on/${frames - 1},1)`;
  let zoom = '1';
  let x = '(iw-iw/zoom)/2';
  let y = '(ih-ih/zoom)/2';

  switch (animation) {
    case 'zoom-in':
      zoom = `1+0.15*${progress}`;
      break;
    case 'zoom-out':
      zoom = `1.15-0.15*${progress}`;
      break;
    case 'pan-left':
      zoom = '1.08';
      x = `(iw-iw/zoom)*(1-${progress})`;
      break;
    case 'pan-right':
      zoom = '1.08';
      x = `(iw-iw/zoom)*${progress}`;
      break;
    case 'pan-up':
      zoom = '1.08';
      y = `(ih-ih/zoom)*(1-${progress})`;
      break;
    case 'pan-down':
      zoom = '1.08';
      y = `(ih-ih/zoom)*${progress}`;
      break;
    default:
      break;
  }

  return [
    `scale=${sourceWidth}:${sourceHeight}:force_original_aspect_ratio=increase:flags=lanczos`,
    `crop=${sourceWidth}:${sourceHeight}`,
    `zoompan=z='${zoom}':x='${x}':y='${y}':d=1:s=${width}x${height}:fps=${fps}`,
  ].join(',');
}

function encoderArguments(project, capabilities) {
  const { preset, width, fps } = project.output;
  const commonH264 = ['-pix_fmt', 'yuv420p', '-tag:v', 'avc1'];

  if (preset === 'apple-silicon') {
    if (!capabilities.encoders.h264Videotoolbox) {
      const error = new Error('Apple Silicon hardware encoding is unavailable. Choose High Quality or install an FFmpeg build with h264_videotoolbox.');
      error.code = 'ENCODER_UNAVAILABLE';
      error.status = 422;
      throw error;
    }
    const bitrate = width >= 3840 ? (fps >= 50 ? '60M' : '45M') : (fps >= 50 ? '24M' : '16M');
    const maxrate = width >= 3840 ? (fps >= 50 ? '80M' : '60M') : (fps >= 50 ? '32M' : '24M');
    return [
      '-c:v', 'h264_videotoolbox', '-allow_sw', '1', '-realtime', 'true',
      '-b:v', bitrate, '-maxrate', maxrate, '-bufsize', maxrate,
      ...commonH264,
      '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart',
    ];
  }

  if (preset === 'prores-master') {
    if (!capabilities.encoders.proresKs) {
      const error = new Error('The ProRes encoder is unavailable in this FFmpeg installation.');
      error.code = 'ENCODER_UNAVAILABLE';
      error.status = 422;
      throw error;
    }
    return [
      '-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le',
      '-vendor', 'apl0', '-c:a', 'pcm_s24le', '-ar', '48000',
    ];
  }

  if (!capabilities.encoders.libx264) {
    const error = new Error('libx264 is unavailable in this FFmpeg installation.');
    error.code = 'ENCODER_UNAVAILABLE';
    error.status = 422;
    throw error;
  }

  const settings = preset === 'balanced'
    ? ['-preset', 'medium', '-crf', '20']
    : ['-preset', 'slow', '-crf', '17'];
  return [
    '-c:v', 'libx264', ...settings, '-profile:v', 'high',
    ...commonH264,
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart',
  ];
}

export function hasAssOverlays(project) {
  return (project.subtitles.enabled && project.subtitles.cues.length > 0)
    || (project.watermark.enabled && project.watermark.type === 'text')
    || (project.presenter.enabled && (project.presenter.pointerEvents.length > 0 || project.presenter.strokes.length > 0));
}

export function buildFfmpegCommand(project, files, jobDirectory, capabilities) {
  const args = ['-hide_banner', '-nostdin', '-y', '-i', files.audio];
  const filters = [];
  const workingPixelFormat = project.output.preset === 'prores-master' ? 'yuv444p10le' : 'yuv420p';
  const durations = project.timeline.map((segment) => number(segment.endTime - segment.startTime));
  const assetUseCounts = project.assets.map(() => 0);
  project.timeline.forEach((segment) => { assetUseCounts[segment.assetIndex] += 1; });
  const assetBranches = project.assets.map(() => []);
  const nextAssetBranch = project.assets.map(() => 0);

  project.assets.forEach((asset, assetIndex) => {
    const inputIndex = assetIndex + 1;
    const path = files[asset.field];
    if (asset.type === 'image') args.push('-loop', '1', '-framerate', String(project.output.fps), '-i', path);
    else args.push('-stream_loop', '-1', '-i', path);

    const uses = assetUseCounts[assetIndex];
    if (uses <= 1) {
      assetBranches[assetIndex].push(`${inputIndex}:v`);
    } else {
      const labels = Array.from({ length: uses }, (_, branch) => `asset${assetIndex}-${branch}`);
      filters.push(`[${inputIndex}:v]split=${uses}${labels.map((label) => `[${label}]`).join('')}`);
      assetBranches[assetIndex].push(...labels);
    }
  });

  const transitionPads = project.timeline.map((_, index) => {
    if (index === 0) return 0;
    const previous = project.timeline[index - 1];
    if (previous.transitionEffect === 'none') return 0;
    return number(Math.min(project.transitionDuration, durations[index - 1] * 0.45, durations[index] * 0.45));
  });

  project.timeline.forEach((segment, index) => {
    const asset = project.assets[segment.assetIndex];
    const sourceLabel = assetBranches[segment.assetIndex][nextAssetBranch[segment.assetIndex]];
    nextAssetBranch[segment.assetIndex] += 1;

    const baseDuration = durations[index];
    const incomingPad = transitionPads[index];
    const visualFilter = asset.type === 'image' && project.enableImageAnimations && segment.imgAnim !== 'none'
      ? kenBurnsFilter(segment.imgAnim, baseDuration, project.output.width, project.output.height, project.output.fps)
      : `${mediaScale(project.output.width, project.output.height)},fps=${project.output.fps}`;
    const padFilter = incomingPad > 0
      ? `,tpad=start_mode=clone:start_duration=${incomingPad},trim=duration=${number(baseDuration + incomingPad)},setpts=PTS-STARTPTS`
      : '';
    filters.push(`[${sourceLabel}]${visualFilter},trim=duration=${baseDuration},setpts=PTS-STARTPTS${padFilter},format=${workingPixelFormat},settb=AVTB[segment${index}]`);
  });

  let currentLabel = 'segment0';
  let currentDuration = durations[0];
  for (let index = 1; index < project.timeline.length; index += 1) {
    const previous = project.timeline[index - 1];
    const outputLabel = `timeline${index}`;
    const transitionDuration = transitionPads[index];
    if (previous.transitionEffect === 'none' || transitionDuration === 0) {
      filters.push(`[${currentLabel}][segment${index}]concat=n=2:v=1:a=0[${outputLabel}]`);
    } else {
      const transition = XFADE_MAP[previous.transitionEffect] ?? 'fade';
      const offset = number(Math.max(0, currentDuration - transitionDuration));
      filters.push(`[${currentLabel}][segment${index}]xfade=transition=${transition}:duration=${transitionDuration}:offset=${offset}[${outputLabel}]`);
    }
    currentLabel = outputLabel;
    currentDuration = number(currentDuration + durations[index]);
  }

  const assPath = join(jobDirectory, 'overlays.ass');
  if (hasAssOverlays(project)) {
    filters.push(`[${currentLabel}]ass=filename=${filterPath(assPath)}:shaping=complex[with-overlays]`);
    currentLabel = 'with-overlays';
  }

  if (project.watermark.enabled && project.watermark.type === 'image') {
    const logoInputIndex = project.assets.length + 1;
    args.push('-loop', '1', '-framerate', String(project.output.fps), '-i', files.logo);
    const logoHeight = Math.max(40, Math.round(project.output.height * 0.056));
    filters.push(`[${logoInputIndex}:v]scale=-1:${logoHeight}:flags=lanczos,format=rgba,colorchannelmixer=aa=0.80[logo]`);
    filters.push(`[${currentLabel}][logo]overlay=W-w-${Math.round(project.output.width * 0.006)}:H-h-${Math.round(project.output.height * 0.009)}:format=auto[with-logo]`);
    currentLabel = 'with-logo';
  }

  const audioFilters = [
    `atrim=start=0:end=${number(project.duration)}`,
    'asetpts=PTS-STARTPTS',
  ];
  if (project.output.normalizeAudio) audioFilters.push('loudnorm=I=-14:LRA=11:TP=-1.5');
  filters.push(`[0:a]${audioFilters.join(',')}[final-audio]`);

  const extension = project.output.preset === 'prores-master' ? 'mov' : 'mp4';
  const outputPath = join(jobDirectory, `output.${extension}`);
  const finalVideoLabel = currentLabel;

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', `[${finalVideoLabel}]`, '-map', '[final-audio]',
    '-t', String(number(project.duration)),
    '-r', String(project.output.fps),
    ...encoderArguments(project, capabilities),
    '-metadata', `title=${project.title}`,
    '-progress', 'pipe:1', '-nostats', '-loglevel', 'error',
    outputPath,
  );

  return { executable: FFMPEG, args, outputPath, assPath, extension, filterGraph: filters.join(';') };
}

async function capture(executable, args, timeout = 15_000) {
  return execFile(executable, args, { timeout, maxBuffer: 16 * 1024 * 1024 });
}

export async function inspectFfmpeg() {
  try {
    const [{ stdout: version }, { stdout: probeVersion }, { stdout: encoders }, { stdout: filters }] = await Promise.all([
      capture(FFMPEG, ['-version']),
      capture(FFPROBE, ['-version']),
      capture(FFMPEG, ['-hide_banner', '-encoders']),
      capture(FFMPEG, ['-hide_banner', '-filters']),
    ]);
    const firstLine = version.split(/\r?\n/)[0];
    const discovered = {
      available: true,
      version: firstLine,
      ffprobeVersion: probeVersion.split(/\r?\n/)[0],
      executable: FFMPEG,
      probeExecutable: FFPROBE,
      encoders: {
        libx264: /\blibx264\b/.test(encoders),
        h264Videotoolbox: /\bh264_videotoolbox\b/.test(encoders),
        proresKs: /\bprores_ks\b/.test(encoders),
      },
      filters: {
        ass: /^\s*T?\.\.\s+ass\s/m.test(filters) || /\bass\s+V->V/.test(filters),
        xfade: /\bxfade\b/.test(filters),
        zoompan: /\bzoompan\b/.test(filters),
        overlay: /\boverlay\b/.test(filters),
      },
    };
    const missing = [
      !discovered.encoders.libx264 && 'libx264 encoder',
      !discovered.filters.ass && 'ASS filter',
      !discovered.filters.xfade && 'xfade filter',
      !discovered.filters.zoompan && 'zoompan filter',
      !discovered.filters.overlay && 'overlay filter',
    ].filter(Boolean);
    return { ...discovered, ready: missing.length === 0, missing };
  } catch (error) {
    return {
      available: false,
      ready: false,
      version: null,
      ffprobeVersion: null,
      executable: FFMPEG,
      probeExecutable: FFPROBE,
      error: error.code === 'ENOENT' ? `FFmpeg or ffprobe was not found (${FFMPEG}, ${FFPROBE})` : error.message,
      missing: ['FFmpeg and ffprobe'],
      encoders: { libx264: false, h264Videotoolbox: false, proresKs: false },
      filters: { ass: false, xfade: false, zoompan: false, overlay: false },
    };
  }
}

export async function probeMedia(path) {
  const { stdout } = await capture(FFPROBE, [
    '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height:format=duration,format_name',
    '-of', 'json', path,
  ], 30_000);
  return JSON.parse(stdout);
}

export async function validateMediaFiles(project, files) {
  const inputs = [
    { field: 'audio', expected: 'audio' },
    ...project.assets.map((asset) => ({ field: asset.field, expected: 'video' })),
  ];
  if (project.watermark.enabled && project.watermark.type === 'image') inputs.push({ field: 'logo', expected: 'video' });

  for (const input of inputs) {
    let metadata;
    try {
      metadata = await probeMedia(files[input.field]);
    } catch (cause) {
      const error = new Error(`${input.field} could not be read by ffprobe.`);
      error.code = 'INVALID_MEDIA';
      error.status = 422;
      error.cause = cause;
      throw error;
    }
    const streams = metadata.streams ?? [];
    if (!streams.some((stream) => stream.codec_type === input.expected)) {
      const error = new Error(`${input.field} is not a valid ${input.expected === 'audio' ? 'audio source' : 'visual file'}.`);
      error.code = 'INVALID_MEDIA';
      error.status = 422;
      throw error;
    }
  }
}

export async function renderProject({ project, files, jobDirectory, capabilities, onProgress, signal }) {
  if (hasAssOverlays(project)) {
    if (!capabilities.filters.ass) {
      const error = new Error('This FFmpeg build does not include the ASS subtitle filter required for captions and Presenter FX.');
      error.code = 'FILTER_UNAVAILABLE';
      error.status = 503;
      throw error;
    }
    await writeAssFile(project, join(jobDirectory, 'overlays.ass'));
  }

  const command = buildFfmpegCommand(project, files, jobDirectory, capabilities);
  await new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      cwd: jobDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdoutBuffer = '';
    let stderr = '';
    let forceKillTimer;

    const abort = () => {
      child.kill('SIGTERM');
      forceKillTimer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      forceKillTimer.unref?.();
    };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const records = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = records.pop() ?? '';
      for (const record of records) {
        const [key, rawValue] = record.split('=', 2);
        if (key === 'out_time_us') {
          const seconds = Number(rawValue) / 1_000_000;
          onProgress(Math.max(0, Math.min(99.5, (seconds / project.duration) * 100)));
        } else if (key === 'progress' && rawValue === 'end') {
          onProgress(100);
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-32_000);
    });
    child.on('error', (error) => {
      clearTimeout(forceKillTimer);
      signal.removeEventListener('abort', abort);
      reject(error);
    });
    child.on('close', (code, killedBySignal) => {
      clearTimeout(forceKillTimer);
      signal.removeEventListener('abort', abort);
      if (signal.aborted || killedBySignal) {
        const error = new Error('Render cancelled.');
        error.code = 'RENDER_CANCELLED';
        reject(error);
      } else if (code === 0) {
        onProgress(100);
        resolve();
      } else {
        const error = new Error(stderr.trim() || `FFmpeg exited with code ${code}.`);
        error.code = 'FFMPEG_FAILED';
        reject(error);
      }
    });
  });
  return command;
}

export const ffmpegInternals = { XFADE_MAP, filterPath, kenBurnsFilter, encoderArguments };
