import { z } from 'zod';

export const TRANSITIONS = [
  'none', 'crossfade', 'fade-black', 'slide', 'slide-right', 'slide-up',
  'slide-down', 'zoom', 'zoom-out', 'spin', 'iris-open', 'iris-close',
  'clock-wipe', 'curtains', 'blinds',
];

export const IMAGE_ANIMATIONS = [
  'none', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down',
];

export const OUTPUT_PRESETS = [
  'balanced', 'high-quality', 'apple-silicon', 'prores-master',
];

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, 'Expected a six-digit hex colour');
const seconds = z.number().finite().min(0).max(43_200);
const fileField = z.string().regex(/^asset_\d+$/);

const assetSchema = z.object({
  id: z.string().min(1).max(120),
  field: fileField,
  name: z.string().min(1).max(500),
  type: z.enum(['image', 'video']),
  duration: seconds.optional().default(0),
});

const segmentSchema = z.object({
  assetIndex: z.number().int().min(0).max(499),
  startTime: seconds,
  endTime: seconds,
  transitionEffect: z.enum(TRANSITIONS).default('none'),
  imgAnim: z.enum(IMAGE_ANIMATIONS).default('none'),
});

const cueSchema = z.object({
  start: seconds,
  end: seconds,
  text: z.string().min(1).max(2_000),
});

const pointerEventSchema = z.object({
  time: seconds,
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
  visible: z.boolean().default(true),
  mode: z.enum(['cursor', 'pen', 'highlight', 'laser', 'zoom']).default('cursor'),
  style: z.enum(['whisk', 'comet', 'neon', 'spotlight', 'focus-wide']).default('whisk'),
  color: hexColor.default('#FFE45E'),
  size: z.number().finite().min(4).max(300).default(34),
});

const pointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});

const strokeSchema = z.object({
  start: seconds,
  end: seconds,
  visibleUntil: seconds.optional(),
  type: z.enum(['pen', 'highlight']),
  color: hexColor,
  width: z.number().finite().min(1).max(300),
  points: z.array(pointSchema).min(1).max(5_000),
});

export const projectSchema = z.object({
  version: z.literal(1),
  title: z.string().trim().min(1).max(180).default('mixed-video'),
  duration: seconds.refine((value) => value > 0, 'Duration must be greater than zero'),
  audioField: z.literal('audio'),
  assets: z.array(assetSchema).min(1).max(500),
  timeline: z.array(segmentSchema).min(1).max(2_000),
  transitionDuration: z.number().finite().min(0).max(5).default(1.5),
  enableImageAnimations: z.boolean().default(true),
  output: z.object({
    width: z.union([z.literal(1280), z.literal(1920), z.literal(3840)]).default(1920),
    height: z.union([z.literal(720), z.literal(1080), z.literal(2160)]).default(1080),
    fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(50), z.literal(60)]).default(30),
    preset: z.enum(OUTPUT_PRESETS).default('high-quality'),
    normalizeAudio: z.boolean().default(false),
  }).superRefine((output, ctx) => {
    const validPair = (output.width === 1280 && output.height === 720)
      || (output.width === 1920 && output.height === 1080)
      || (output.width === 3840 && output.height === 2160);
    if (!validPair) ctx.addIssue({ code: 'custom', message: 'Output must use a supported 16:9 resolution' });
  }),
  subtitles: z.object({
    enabled: z.boolean().default(false),
    cues: z.array(cueSchema).max(20_000).default([]),
    font: z.string().trim().min(1).max(100).default('Arial'),
    fontSize: z.number().finite().min(12).max(240).default(42),
    color: hexColor.default('#FFFFFF'),
    strokeColor: hexColor.default('#000000'),
    strokeWidth: z.number().finite().min(0).max(30).default(4),
    background: z.enum(['none', 'pill', 'band']).default('none'),
    shadow: z.boolean().default(true),
    uppercase: z.boolean().default(false),
    popIn: z.boolean().default(false),
    positionY: z.number().finite().min(5).max(95).default(84),
  }).default({ enabled: false, cues: [] }),
  watermark: z.discriminatedUnion('type', [
    z.object({ enabled: z.literal(false), type: z.literal('none') }),
    z.object({ enabled: z.literal(true), type: z.literal('text'), text: z.string().trim().min(1).max(200) }),
    z.object({ enabled: z.literal(true), type: z.literal('image'), field: z.literal('logo') }),
  ]).default({ enabled: false, type: 'none' }),
  presenter: z.object({
    enabled: z.boolean().default(false),
    pointerEvents: z.array(pointerEventSchema).max(250_000).default([]),
    strokes: z.array(strokeSchema).max(2_000).default([]),
  }).default({ enabled: false, pointerEvents: [], strokes: [] }),
}).superRefine((project, ctx) => {
  const assetFields = new Set();
  project.assets.forEach((asset, index) => {
    if (assetFields.has(asset.field)) {
      ctx.addIssue({ code: 'custom', path: ['assets', index, 'field'], message: 'Asset upload fields must be unique' });
    }
    assetFields.add(asset.field);
  });

  if ((project.timeline[0]?.startTime ?? 0) > 0.01) {
    ctx.addIssue({ code: 'custom', path: ['timeline', 0, 'startTime'], message: 'Timeline must start at zero' });
  }

  project.timeline.forEach((segment, index) => {
    if (segment.assetIndex >= project.assets.length) {
      ctx.addIssue({ code: 'custom', path: ['timeline', index, 'assetIndex'], message: 'Unknown asset index' });
    }
    if (segment.endTime <= segment.startTime) {
      ctx.addIssue({ code: 'custom', path: ['timeline', index], message: 'Segment end must be after its start' });
    }
    if (index > 0 && segment.startTime + 0.01 < project.timeline[index - 1].startTime) {
      ctx.addIssue({ code: 'custom', path: ['timeline', index, 'startTime'], message: 'Timeline must be sorted' });
    }
    if (index > 0 && Math.abs(segment.startTime - project.timeline[index - 1].endTime) > 0.05) {
      ctx.addIssue({ code: 'custom', path: ['timeline', index, 'startTime'], message: 'Timeline segments must be contiguous' });
    }
  });

  const lastEnd = project.timeline.at(-1)?.endTime ?? 0;
  if (Math.abs(lastEnd - project.duration) > 0.25) {
    ctx.addIssue({ code: 'custom', path: ['duration'], message: 'Project duration must match the timeline duration' });
  }

  project.subtitles.cues.forEach((cue, index) => {
    if (cue.end <= cue.start) {
      ctx.addIssue({ code: 'custom', path: ['subtitles', 'cues', index], message: 'Subtitle cue end must be after its start' });
    }
  });

  project.presenter.strokes.forEach((stroke, index) => {
    if (stroke.end < stroke.start) {
      ctx.addIssue({ code: 'custom', path: ['presenter', 'strokes', index], message: 'Stroke end must not precede its start' });
    }
    if (stroke.visibleUntil !== undefined && stroke.visibleUntil <= stroke.start) {
      ctx.addIssue({ code: 'custom', path: ['presenter', 'strokes', index, 'visibleUntil'], message: 'Stroke visibility must end after it starts' });
    }
  });
});

export function parseProject(raw) {
  const result = projectSchema.safeParse(raw);
  if (result.success) return result.data;

  const error = new Error('Invalid render project');
  error.status = 400;
  error.details = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  throw error;
}
