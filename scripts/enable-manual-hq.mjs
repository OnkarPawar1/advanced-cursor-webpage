import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function patchFile(relativePath, patches) {
  const path = join(root, relativePath);
  let source = await readFile(path, 'utf8');
  let changed = false;

  for (const patch of patches) {
    if (patch.marker && source.includes(patch.marker)) continue;
    if (!source.includes(patch.find)) {
      throw new Error(`Manual HQ patch could not find expected code in ${relativePath}: ${patch.label}`);
    }
    source = source.replace(patch.find, patch.replace);
    changed = true;
  }

  if (changed) {
    await writeFile(path, source, 'utf8');
    console.log(`✓ Manual HQ enabled in ${relativePath}`);
  }
}

await patchFile('src/App.tsx', [
  {
    label: 'manual capture ref',
    marker: 'manualCaptureRef = useRef',
    find: `  const presenterCaptureRef = useRef({ pointerEvents: [], strokes: [] });\n  const lastPresenterCaptureTimeRef = useRef(-1);`,
    replace: `  const presenterCaptureRef = useRef({ pointerEvents: [], strokes: [] });\n  const lastPresenterCaptureTimeRef = useRef(-1);\n  // Live Manual is captured as edit decisions, not pixels. FFmpeg replays these switches at full quality.\n  const manualCaptureRef = useRef({ switches: [] });`,
  },
  {
    label: 'capture zoom parameters',
    marker: 'zoomShape: stateRefs.current.zoomLensShape',
    find: `      color: stateRefs.current.interactionMode === 'laser' ? '#FF2D55' : stateRefs.current.penColor,\n      size: stateRefs.current.cursorSize,`,
    replace: `      color: stateRefs.current.interactionMode === 'laser' ? '#FF2D55' : stateRefs.current.penColor,\n      size: stateRefs.current.cursorSize,\n      zoomShape: stateRefs.current.zoomLensShape,\n      zoomScale: stateRefs.current.zoomLensScale,\n      zoomSize: stateRefs.current.zoomLensSize,`,
  },
  {
    label: 'manual capture helpers',
    marker: 'const buildCapturedManualTimeline = () =>',
    find: `  const handleSelectManual = (idx) => {\n      const now = audioRef.current?.currentTime || 0;\n      manualIndexRef.current = idx;\n      manualChangeTimeRef.current = now;\n      setManualAssetIndex(idx);\n      setLastManualChangeTime(now);\n      \n      const anims = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'];\n      setManualAnimType(anims[Math.floor(Math.random() * anims.length)]);`,
    replace: `  const captureManualSwitch = (idx, time, imgAnim) => {\n      const asset = activeAssets[idx];\n      if (!asset || !Number.isFinite(time) || time < 0 || time > audioDuration) return;\n      const switches = manualCaptureRef.current.switches;\n      const event = { time: Math.max(0, time), assetId: asset.id, imgAnim: imgAnim || 'none' };\n      const last = switches[switches.length - 1];\n      if (last && Math.abs(last.time - event.time) < 0.02) switches[switches.length - 1] = event;\n      else if (!last || last.assetId !== event.assetId || Math.abs(last.time - event.time) > 0.05) switches.push(event);\n      setPresenterCaptureRevision(value => value + 1);\n  };\n\n  const resetManualCapture = (captureCurrent = false) => {\n      manualCaptureRef.current = { switches: [] };\n      if (captureCurrent && activeAssets.length > 0) {\n          captureManualSwitch(manualIndexRef.current, audioRef.current?.currentTime || 0, stateRefs.current.manualAnimType || 'none');\n      } else {\n          setPresenterCaptureRevision(value => value + 1);\n      }\n  };\n\n  const buildCapturedManualTimeline = () => {\n      const switches = [...manualCaptureRef.current.switches]\n          .filter(event => activeAssets.some(asset => asset.id === event.assetId) && event.time < audioDuration)\n          .sort((a, b) => a.time - b.time);\n      if (switches.length === 0 || switches[0].time > 0.05) {\n          const fallback = activeAssets[manualIndexRef.current] || activeAssets[0];\n          if (fallback) switches.unshift({ time: 0, assetId: fallback.id, imgAnim: stateRefs.current.manualAnimType || 'none' });\n      } else {\n          switches[0] = { ...switches[0], time: 0 };\n      }\n\n      const segments = [];\n      for (let index = 0; index < switches.length; index += 1) {\n          const event = switches[index];\n          const asset = activeAssets.find(item => item.id === event.assetId);\n          const startTime = Math.max(0, event.time);\n          const endTime = Math.min(audioDuration, switches[index + 1]?.time ?? audioDuration);\n          if (!asset || endTime - startTime <= 0.01) continue;\n          segments.push({\n              asset,\n              startTime,\n              endTime,\n              offset: 0,\n              transitionEffect: 'none',\n              imgAnim: event.imgAnim || 'none',\n          });\n      }\n      return segments;\n  };\n\n  const handleSelectManual = (idx) => {\n      const now = audioRef.current?.currentTime || 0;\n      manualIndexRef.current = idx;\n      manualChangeTimeRef.current = now;\n      setManualAssetIndex(idx);\n      setLastManualChangeTime(now);\n      \n      const anims = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'];\n      const nextAnim = anims[Math.floor(Math.random() * anims.length)];\n      setManualAnimType(nextAnim);\n      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {\n          captureManualSwitch(idx, now, nextAnim);\n      }`,
  },
  {
    label: 'initialize manual capture on playback',
    marker: 'resetManualCapture(true); // MANUAL_HQ_PLAYBACK_START',
    find: `      if (audioRef.current.currentTime < 0.05 && (presenterCaptureRef.current.pointerEvents.length > 0 || presenterCaptureRef.current.strokes.length > 0)) {\n          resetPresenterCapture();\n      }\n      audioRef.current.play();`,
    replace: `      if (audioRef.current.currentTime < 0.05 && (presenterCaptureRef.current.pointerEvents.length > 0 || presenterCaptureRef.current.strokes.length > 0)) {\n          resetPresenterCapture();\n      }\n      if (isManualMode && audioRef.current.currentTime < 0.05) {\n          resetManualCapture(true); // MANUAL_HQ_PLAYBACK_START\n      }\n      audioRef.current.play();`,
  },
  {
    label: 'allow manual production render',
    marker: 'const renderTimeline = isManualMode ? buildCapturedManualTimeline() : timeline;',
    find: `  const startProductionRender = async () => {\n    if (!audioFile?.file || timeline.length === 0 || renderService.status !== 'ready') return;\n    if (isManualMode) {\n      setProductionJob(previous => ({ ...previous, status: 'failed', error: 'Turn off Live Manual Control for deterministic FFmpeg export. Use Live WebM Capture for manual switching.' }));\n      return;\n    }`,
    replace: `  const startProductionRender = async () => {\n    const renderTimeline = isManualMode ? buildCapturedManualTimeline() : timeline;\n    if (!audioFile?.file || renderTimeline.length === 0 || renderService.status !== 'ready') return;`,
  },
  {
    label: 'use captured manual timeline for assets',
    marker: 'for (const segment of renderTimeline) { // MANUAL_HQ_TIMELINE',
    find: `      for (const segment of timeline) {\n        if (!assetIndexes.has(segment.asset.id)) {`,
    replace: `      for (const segment of renderTimeline) { // MANUAL_HQ_TIMELINE\n        if (!assetIndexes.has(segment.asset.id)) {`,
  },
  {
    label: 'use captured manual timeline in project',
    marker: 'timeline: renderTimeline.map(segment => ({ // MANUAL_HQ_PROJECT',
    find: `        timeline: timeline.map(segment => ({`,
    replace: `        timeline: renderTimeline.map(segment => ({ // MANUAL_HQ_PROJECT`,
  },
  {
    label: 'manual switch UI count',
    marker: 'manualCaptureRef.current.switches.length} manual switches',
    find: `{presenterCaptureRef.current.pointerEvents.length} pointer samples · {presenterCaptureRef.current.strokes.length} strokes`,
    replace: `{presenterCaptureRef.current.pointerEvents.length} pointer samples · {presenterCaptureRef.current.strokes.length} strokes · {manualCaptureRef.current.switches.length} manual switches`,
  },
  {
    label: 'production help text',
    marker: 'Manual clip switches and Zoom Lens are replayed natively by FFmpeg',
    find: `Play the preview once to capture timed cursor and ink. Zoom Lens and manual clip switching remain available through Live WebM Capture.`,
    replace: `Play the preview once to capture timing. Manual clip switches and Zoom Lens are replayed natively by FFmpeg at the selected resolution, FPS and quality preset.`,
  },
  {
    label: 'enable HQ button in manual mode',
    marker: 'disabled={!audioFile || activeAssets.length === 0 || isRendering || renderService.status !== \'ready\'} // MANUAL_HQ_BUTTON',
    find: `disabled={!audioFile || activeAssets.length === 0 || isRendering || isManualMode || renderService.status !== 'ready'}`,
    replace: `disabled={!audioFile || activeAssets.length === 0 || isRendering || renderService.status !== 'ready'} // MANUAL_HQ_BUTTON`,
  },
  {
    label: 'enable HQ button styling in manual mode',
    marker: `!audioFile || activeAssets.length === 0 || isRendering || renderService.status !== 'ready'\n                        ? 'bg-gray-700`,
    find: `!audioFile || activeAssets.length === 0 || isRendering || isManualMode || renderService.status !== 'ready'\n                        ? 'bg-gray-700`,
    replace: `!audioFile || activeAssets.length === 0 || isRendering || renderService.status !== 'ready'\n                        ? 'bg-gray-700`,
  },
  {
    label: 'manual production status message',
    marker: 'Live Manual HQ is enabled',
    find: `{isManualMode && <p className="text-xs text-orange-300 mt-3">Turn off Live Manual Control to use deterministic FFmpeg export.</p>}`,
    replace: `{isManualMode && <p className="text-xs text-green-300 mt-3">Live Manual HQ is enabled · play from the beginning, perform your switches/Zoom Lens actions, then click Render High Quality.</p>}`,
  },
  {
    label: 'webm fallback wording',
    marker: 'Quick WebM only',
    find: `<p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5"><Cpu size={14} /> Live browser fallback</p>\n                <p className="text-[11px] text-gray-500">Use for manual switching or the interactive magnifier.</p>`,
    replace: `<p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5"><Cpu size={14} /> Optional browser capture</p>\n                <p className="text-[11px] text-gray-500">Quick WebM only. For maximum quality—including Live Manual and Zoom Lens—use Render High Quality above.</p>`,
  },
]);

await patchFile('server/schema.mjs', [
  {
    label: 'zoom replay schema',
    marker: `zoomShape: z.enum(['circle', 'rect'])`,
    find: `  size: z.number().finite().min(4).max(300).default(34),\n});`,
    replace: `  size: z.number().finite().min(4).max(300).default(34),\n  zoomShape: z.enum(['circle', 'rect']).optional().default('circle'),\n  zoomScale: z.number().finite().min(1.1).max(8).optional().default(2.5),\n  zoomSize: z.number().finite().min(40).max(600).optional().default(180),\n});`,
  },
]);

await patchFile('server/ffmpeg.mjs', [
  {
    label: 'native presenter fx imports',
    marker: `import { buildPresenterVideoFx } from './presenter-video-fx.mjs';`,
    find: `import { join } from 'node:path';\nimport { writeAssFile } from './ass.mjs';`,
    replace: `import { join } from 'node:path';\nimport { writeFile } from 'node:fs/promises';\nimport { writeAssFile } from './ass.mjs';\nimport { buildPresenterVideoFx } from './presenter-video-fx.mjs';`,
  },
  {
    label: 'insert native presenter video filters',
    marker: 'const presenterVideoFx = buildPresenterVideoFx(project, currentLabel, jobDirectory);',
    find: `  const assPath = join(jobDirectory, 'overlays.ass');\n  if (hasAssOverlays(project)) {`,
    replace: `  const presenterVideoFx = buildPresenterVideoFx(project, currentLabel, jobDirectory);\n  if (presenterVideoFx) {\n    filters.push(...presenterVideoFx.filters);\n    currentLabel = presenterVideoFx.outputLabel;\n  }\n\n  const assPath = join(jobDirectory, 'overlays.ass');\n  if (hasAssOverlays(project)) {`,
  },
  {
    label: 'return presenter command metadata',
    marker: 'filterGraph: filters.join(\';\'), presenterVideoFx',
    find: `  return { executable: FFMPEG, args, outputPath, assPath, extension, filterGraph: filters.join(';') };`,
    replace: `  return { executable: FFMPEG, args, outputPath, assPath, extension, filterGraph: filters.join(';'), presenterVideoFx };`,
  },
  {
    label: 'write presenter command file',
    marker: 'presenterVideoFx?.commandPath) { // MANUAL_HQ_COMMANDS',
    find: `  const command = buildFfmpegCommand(project, files, jobDirectory, capabilities);\n  await new Promise((resolve, reject) => {`,
    replace: `  const command = buildFfmpegCommand(project, files, jobDirectory, capabilities);\n  if (command.presenterVideoFx?.commandPath) { // MANUAL_HQ_COMMANDS\n    await writeFile(command.presenterVideoFx.commandPath, command.presenterVideoFx.commands.join('\\n') + '\\n', 'utf8');\n  }\n  await new Promise((resolve, reject) => {`,
  },
]);

console.log('✓ High-quality Live Manual FFmpeg pipeline is ready.');
