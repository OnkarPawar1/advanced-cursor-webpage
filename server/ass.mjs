import { writeFile } from 'node:fs/promises';

const FONT_MAP = {
  Anton: 'Anton',
  'Bebas Neue': 'Bebas Neue',
  'Archivo Black': 'Archivo Black',
  'Luckiest Guy': 'Luckiest Guy',
  Bangers: 'Bangers',
  Montserrat: 'Montserrat',
  Poppins: 'Poppins',
  Rubik: 'Rubik',
  Impact: 'Impact',
  'Noto Sans': 'Noto Sans',
};

function assTime(seconds) {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(centiseconds / 360_000);
  const minutes = Math.floor((centiseconds % 360_000) / 6_000);
  const secs = Math.floor((centiseconds % 6_000) / 100);
  const cs = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function assColor(hex, alpha = 0) {
  const clean = hex.replace('#', '').padEnd(6, '0');
  const red = clean.slice(0, 2);
  const green = clean.slice(2, 4);
  const blue = clean.slice(4, 6);
  return `&H${Math.round(alpha).toString(16).padStart(2, '0').toUpperCase()}${blue}${green}${red}&`;
}

function escapeAssText(text) {
  return text
    .replaceAll('\\', '\\u005C')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}')
    .replace(/\r?\n/g, '\\N');
}

function escapeStyleName(value) {
  return String(value).replace(/[\r\n,]/g, ' ').trim();
}

function segmentPolygon(a, b, width, scaleX, scaleY) {
  const x1 = a.x * scaleX;
  const y1 = a.y * scaleY;
  const x2 = b.x * scaleX;
  const y2 = b.y * scaleY;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const half = Math.max(0.75, width / 2);
  const nx = (-dy / length) * half;
  const ny = (dx / length) * half;
  const point = (x, y) => `${Math.round(x)} ${Math.round(y)}`;
  return `m ${point(x1 + nx, y1 + ny)} l ${point(x2 + nx, y2 + ny)} l ${point(x2 - nx, y2 - ny)} l ${point(x1 - nx, y1 - ny)}`;
}

function buildStrokeDrawing(stroke, width, height) {
  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    const radius = Math.max(1, stroke.width / 2);
    const x = point.x * width;
    const y = point.y * height;
    return `m ${Math.round(x - radius)} ${Math.round(y - radius)} l ${Math.round(x + radius)} ${Math.round(y - radius)} l ${Math.round(x + radius)} ${Math.round(y + radius)} l ${Math.round(x - radius)} ${Math.round(y + radius)}`;
  }

  const polygons = [];
  for (let index = 1; index < stroke.points.length; index += 1) {
    polygons.push(segmentPolygon(stroke.points[index - 1], stroke.points[index], stroke.width, width, height));
  }
  return polygons.join(' ');
}

export function buildAssDocument(project) {
  const { width, height } = project.output;
  const scale = height / 1080;
  const subtitle = project.subtitles;
  const font = FONT_MAP[subtitle.font] ?? subtitle.font ?? 'Arial';
  const backgroundEnabled = subtitle.background === 'pill';
  const captionStyle = [
    'Style: Caption',
    escapeStyleName(font),
    Math.round(subtitle.fontSize * scale),
    assColor(subtitle.color),
    assColor(subtitle.color),
    assColor(subtitle.strokeColor),
    assColor('#000000', backgroundEnabled ? 80 : 255),
    '-1', '0', '0', '0', '100', '100', '0', '0',
    backgroundEnabled ? '3' : '1',
    Math.max(0, (subtitle.strokeWidth * scale).toFixed(1)),
    subtitle.shadow ? Math.max(1, (3 * scale).toFixed(1)) : '0',
    '2', '80', '80', '40', '1',
  ].join(',');

  const lines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'YCbCr Matrix: TV.709',
    '',
    '[V4+ Styles]',
    'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
    captionStyle,
    `Style: Watermark,Arial,${Math.round(24 * scale)},${assColor('#FFFFFF')},${assColor('#FFFFFF')},${assColor('#000000')},${assColor('#000000', 80)},-1,0,0,0,100,100,0,0,3,8,1,3,20,20,20,1`,
    `Style: Pointer,Arial,${Math.round(44 * scale)},${assColor('#FFE45E')},${assColor('#FFE45E')},${assColor('#FFFFFF')},${assColor('#000000', 255)},-1,0,0,0,100,100,0,0,1,2,2,5,0,0,0,1`,
    '',
    '[Events]',
    'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
  ];

  if (subtitle.enabled) {
    for (const cue of subtitle.cues) {
      const text = escapeAssText(subtitle.uppercase ? cue.text.toUpperCase() : cue.text);
      const positionY = Math.round(height * (subtitle.positionY / 100));
      if (subtitle.background === 'band') {
        const lineCount = Math.max(1, cue.text.split(/\r?\n/).length);
        const bandHeight = Math.round(subtitle.fontSize * scale * 1.45 * lineCount + 24 * scale);
        const top = Math.max(0, Math.round(positionY - bandHeight / 2));
        const bottom = Math.min(height, top + bandHeight);
        const drawing = `m 0 ${top} l ${width} ${top} l ${width} ${bottom} l 0 ${bottom}`;
        lines.push(`Dialogue: 2,${assTime(cue.start)},${assTime(cue.end)},Pointer,,0,0,0,,{\\an7\\pos(0,0)\\p1\\bord0\\shad0\\1c${assColor('#000000')}\\1a&H70&}${drawing}{\\p0}`);
      }
      const pop = subtitle.popIn
        ? '\\fscx72\\fscy72\\t(0,180,\\fscx106\\fscy106)\\t(180,280,\\fscx100\\fscy100)'
        : '';
      lines.push(`Dialogue: 3,${assTime(cue.start)},${assTime(cue.end)},Caption,,0,0,0,,{\\an5\\pos(${Math.round(width / 2)},${positionY})${pop}}${text}`);
    }
  }

  if (project.watermark.enabled && project.watermark.type === 'text') {
    lines.push(`Dialogue: 4,${assTime(0)},${assTime(project.duration)},Watermark,,0,0,0,,${escapeAssText(project.watermark.text)}`);
  }

  if (project.presenter.enabled) {
    const pointerEvents = [...project.presenter.pointerEvents]
      .filter((event) => event.time <= project.duration)
      .sort((left, right) => left.time - right.time);
    for (let index = 0; index < pointerEvents.length; index += 1) {
      const event = pointerEvents[index];
      const next = pointerEvents[index + 1];
      if (event.visible === false) continue;
      const end = Math.min(project.duration, next?.time ?? event.time + 3.3, event.time + 3.3);
      if (end <= event.time) continue;
      const x = Math.round(event.x * width);
      const y = Math.round(event.y * height);
      const color = event.mode === 'laser' ? '#FF3030' : event.color;
      const glyph = event.style === 'comet' ? '●' : event.style === 'whisk' ? '✦' : '◎';
      const fontSize = Math.max(16, Math.round(event.size * scale));
      const fade = end - event.time > 2.6 ? '\\fad(0,700)' : '';
      lines.push(`Dialogue: 6,${assTime(event.time)},${assTime(end)},Pointer,,0,0,0,,{\\an5\\pos(${x},${y})\\fs${fontSize}\\1c${assColor(color)}\\3c${assColor('#FFFFFF')}\\bord2\\blur2${fade}}${glyph}`);
    }

    for (const stroke of project.presenter.strokes) {
      const visibleUntil = Math.min(project.duration, Math.max(stroke.end + 0.05, stroke.visibleUntil ?? stroke.end + 4));
      const alpha = stroke.type === 'highlight' ? 175 : 10;
      const drawing = buildStrokeDrawing({ ...stroke, width: stroke.width * scale }, width, height);
      const tags = `{\\an7\\pos(0,0)\\p1\\bord0\\shad0\\1c${assColor(stroke.color)}\\1a&H${alpha.toString(16).padStart(2, '0').toUpperCase()}&}`;
      lines.push(`Dialogue: 5,${assTime(stroke.start)},${assTime(visibleUntil)},Pointer,,0,0,0,,${tags}${drawing}{\\p0}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function writeAssFile(project, path) {
  await writeFile(path, buildAssDocument(project), 'utf8');
}

export const assInternals = { assTime, assColor, escapeAssText, buildStrokeDrawing };
