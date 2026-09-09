import { join } from 'node:path';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const num = (value) => Number(value.toFixed(3));
const commandTime = (value) => Math.max(0, Number(value) || 0).toFixed(3);

function filterPath(path) {
  return `'${path.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'")}'`;
}

function pushCommand(commands, time, target, command, value) {
  commands.push(`${commandTime(time)} ${target} ${command} ${value};`);
}

function normalizedPoint(event, width, height) {
  return {
    x: clamp((Number(event.x) || 0) * width, 0, width),
    y: clamp((Number(event.y) || 0) * height, 0, height),
  };
}

function lensGeometry(event, width, height) {
  const outputScale = height / 1080;
  const radius = clamp((Number(event.zoomSize) || 180) * outputScale, 40 * outputScale, Math.min(width, height) * 0.45);
  const lensW = Math.max(16, Math.round(radius * 2));
  const lensH = lensW;
  const zoom = clamp(Number(event.zoomScale) || 2.5, 1.1, 8);
  const srcW = Math.max(8, Math.min(width, lensW / zoom));
  const srcH = Math.max(8, Math.min(height, lensH / zoom));
  const point = normalizedPoint(event, width, height);
  const srcX = clamp(point.x - srcW / 2, 0, Math.max(0, width - srcW));
  const srcY = clamp(point.y - srcH / 2, 0, Math.max(0, height - srcH));
  const offset = 48 * outputScale;
  const lensX = clamp(point.x + offset, 12 * outputScale, Math.max(12 * outputScale, width - lensW - 12 * outputScale));
  const lensY = clamp(point.y - lensH - offset, 12 * outputScale, Math.max(12 * outputScale, height - lensH - 12 * outputScale));
  return { lensW, lensH, srcW, srcH, srcX, srcY, lensX, lensY };
}

function focusGeometry(event, width, height) {
  const outputScale = height / 1080;
  const point = normalizedPoint(event, width, height);
  const srcH = clamp((Number(event.size) || 34) * 8.2 * outputScale, 90 * outputScale, height);
  const srcW = Math.min(width, srcH * (16 / 9));
  const srcX = clamp(point.x - srcW / 2, 0, Math.max(0, width - srcW));
  const srcY = clamp(point.y - srcH / 2, 0, Math.max(0, height - srcH));
  return { srcW, srcH, srcX, srcY };
}

/**
 * Rebuild browser-only magnification effects inside FFmpeg from captured pointer events.
 * The command stream moves named crop/scale/overlay filters at the same timestamps as
 * the live preview, so no MediaRecorder/WebM master is required for the HQ export.
 */
export function buildPresenterVideoFx(project, inputLabel, jobDirectory) {
  const pointerEvents = [...(project.presenter?.pointerEvents || [])]
    .filter((event) => Number.isFinite(event.time) && event.time <= project.duration)
    .sort((a, b) => a.time - b.time);

  const hasLens = pointerEvents.some((event) => event.visible !== false && event.mode === 'zoom');
  const hasFocusWide = pointerEvents.some((event) => event.visible !== false && event.style === 'focus-wide');
  if (!hasLens && !hasFocusWide) return null;

  const { width, height } = project.output;
  const commands = [];
  const filters = [];
  const commandPath = join(jobDirectory, 'presenter-video-fx.cmd');
  let currentLabel = inputLabel;

  filters.push(`[${currentLabel}]sendcmd=f=${filterPath(commandPath)}[pfx-commanded]`);
  currentLabel = 'pfx-commanded';

  if (hasFocusWide) {
    filters.push(`[${currentLabel}]split=2[pfx-focus-base][pfx-focus-source]`);
    filters.push(`[pfx-focus-source]crop@pfxFocusCrop=w=${width}:h=${height}:x=0:y=0,scale=${width}:${height}:flags=lanczos[pfx-focus-video]`);
    filters.push(`[pfx-focus-base][pfx-focus-video]overlay@pfxFocusOverlay=x=99999:y=99999:format=auto[pfx-focus-out]`);
    currentLabel = 'pfx-focus-out';

    let focusVisible = false;
    for (const event of pointerEvents) {
      const active = event.visible !== false && event.style === 'focus-wide';
      if (active) {
        const g = focusGeometry(event, width, height);
        pushCommand(commands, event.time, 'crop@pfxFocusCrop', 'w', num(g.srcW));
        pushCommand(commands, event.time, 'crop@pfxFocusCrop', 'h', num(g.srcH));
        pushCommand(commands, event.time, 'crop@pfxFocusCrop', 'x', num(g.srcX));
        pushCommand(commands, event.time, 'crop@pfxFocusCrop', 'y', num(g.srcY));
        pushCommand(commands, event.time, 'overlay@pfxFocusOverlay', 'x', 0);
        pushCommand(commands, event.time, 'overlay@pfxFocusOverlay', 'y', 0);
        focusVisible = true;
      } else if (focusVisible) {
        pushCommand(commands, event.time, 'overlay@pfxFocusOverlay', 'x', 99999);
        pushCommand(commands, event.time, 'overlay@pfxFocusOverlay', 'y', 99999);
        focusVisible = false;
      }
    }
  }

  if (hasLens) {
    const firstLens = pointerEvents.find((event) => event.visible !== false && event.mode === 'zoom');
    const initial = lensGeometry(firstLens, width, height);
    filters.push(`[${currentLabel}]split=2[pfx-lens-base][pfx-lens-source]`);
    filters.push(`[pfx-lens-source]crop@pfxLensCrop=w=${num(initial.srcW)}:h=${num(initial.srcH)}:x=${num(initial.srcX)}:y=${num(initial.srcY)},scale@pfxLensScale=w=${initial.lensW}:h=${initial.lensH}:flags=lanczos,format=rgba[pfx-lens-rgba]`);
    filters.push(`[pfx-lens-rgba]split=2[pfx-lens-rect][pfx-lens-circle-source]`);
    filters.push(`[pfx-lens-circle-source]geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(pow(X-W/2,2)+pow(Y-H/2,2),pow(min(W,H)/2,2)),255,0)'[pfx-lens-circle]`);
    filters.push(`[pfx-lens-base][pfx-lens-rect]overlay@pfxLensRectOverlay=x=99999:y=99999:format=auto[pfx-lens-rect-out]`);
    filters.push(`[pfx-lens-rect-out][pfx-lens-circle]overlay@pfxLensCircleOverlay=x=99999:y=99999:format=auto[pfx-lens-out]`);
    currentLabel = 'pfx-lens-out';

    let lensVisible = false;
    for (const event of pointerEvents) {
      const active = event.visible !== false && event.mode === 'zoom';
      if (active) {
        const g = lensGeometry(event, width, height);
        pushCommand(commands, event.time, 'crop@pfxLensCrop', 'w', num(g.srcW));
        pushCommand(commands, event.time, 'crop@pfxLensCrop', 'h', num(g.srcH));
        pushCommand(commands, event.time, 'crop@pfxLensCrop', 'x', num(g.srcX));
        pushCommand(commands, event.time, 'crop@pfxLensCrop', 'y', num(g.srcY));
        pushCommand(commands, event.time, 'scale@pfxLensScale', 'w', g.lensW);
        pushCommand(commands, event.time, 'scale@pfxLensScale', 'h', g.lensH);
        const circle = event.zoomShape !== 'rect';
        pushCommand(commands, event.time, 'overlay@pfxLensRectOverlay', 'x', circle ? 99999 : num(g.lensX));
        pushCommand(commands, event.time, 'overlay@pfxLensRectOverlay', 'y', circle ? 99999 : num(g.lensY));
        pushCommand(commands, event.time, 'overlay@pfxLensCircleOverlay', 'x', circle ? num(g.lensX) : 99999);
        pushCommand(commands, event.time, 'overlay@pfxLensCircleOverlay', 'y', circle ? num(g.lensY) : 99999);
        lensVisible = true;
      } else if (lensVisible) {
        pushCommand(commands, event.time, 'overlay@pfxLensRectOverlay', 'x', 99999);
        pushCommand(commands, event.time, 'overlay@pfxLensRectOverlay', 'y', 99999);
        pushCommand(commands, event.time, 'overlay@pfxLensCircleOverlay', 'x', 99999);
        pushCommand(commands, event.time, 'overlay@pfxLensCircleOverlay', 'y', 99999);
        lensVisible = false;
      }
    }
  }

  const endTime = Math.max(0, project.duration - 0.001);
  if (hasFocusWide) {
    pushCommand(commands, endTime, 'overlay@pfxFocusOverlay', 'x', 99999);
    pushCommand(commands, endTime, 'overlay@pfxFocusOverlay', 'y', 99999);
  }
  if (hasLens) {
    pushCommand(commands, endTime, 'overlay@pfxLensRectOverlay', 'x', 99999);
    pushCommand(commands, endTime, 'overlay@pfxLensRectOverlay', 'y', 99999);
    pushCommand(commands, endTime, 'overlay@pfxLensCircleOverlay', 'x', 99999);
    pushCommand(commands, endTime, 'overlay@pfxLensCircleOverlay', 'y', 99999);
  }

  return { filters, outputLabel: currentLabel, commandPath, commands };
}

export const presenterVideoFxInternals = { lensGeometry, focusGeometry, filterPath };
