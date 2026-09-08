import express from 'express';
import multer from 'multer';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { extname, join, parse, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { RenderJobManager } from './jobs.mjs';
import { inspectFfmpeg, renderProject, validateMediaFiles } from './ffmpeg.mjs';
import { parseProject } from './schema.mjs';

const moduleDirectory = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(moduleDirectory, '..');
const distDirectory = join(projectRoot, 'dist');

function integerEnvironmentVariable(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

const host = process.env.RENDER_HOST || '127.0.0.1';
const port = integerEnvironmentVariable('RENDER_PORT', 4178, 1, 65_535);
const maxFileBytes = integerEnvironmentVariable('MAX_UPLOAD_BYTES', 8 * 1024 ** 3, 1, Number.MAX_SAFE_INTEGER);
const maxProjectBytes = integerEnvironmentVariable('MAX_PROJECT_BYTES', 64 * 1024 ** 2, 1_024, 256 * 1024 ** 2);
const renderConcurrency = integerEnvironmentVariable('RENDER_CONCURRENCY', 1, 1, 4);
const maxRenderQueue = integerEnvironmentVariable('MAX_RENDER_QUEUE', 4, 1, 20);
const rootDirectory = resolve(process.env.RENDER_TEMP_DIR || join(tmpdir(), 'advanced-presenter-fx'));
const incomingDirectory = join(rootDirectory, `incoming-${process.pid}`);
const jobsDirectory = join(rootDirectory, 'jobs');

if (!['127.0.0.1', '::1', 'localhost'].includes(host) && process.env.ALLOW_REMOTE_RENDER_SERVER !== 'true') {
  throw new Error('Refusing to expose the render server outside localhost. Set ALLOW_REMOTE_RENDER_SERVER=true only behind authentication and TLS.');
}

const unsafeTempRoots = new Set([
  resolve(parse(rootDirectory).root),
  resolve(tmpdir()),
  resolve(homedir()),
  projectRoot,
]);
if (unsafeTempRoots.has(rootDirectory)) {
  throw new Error('RENDER_TEMP_DIR must be a dedicated subdirectory, not a filesystem root, home, project root, or system temp root.');
}

await mkdir(incomingDirectory, { recursive: true });
await mkdir(jobsDirectory, { recursive: true });

async function cleanupStaleTempData() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const candidates = [];
  const rootEntries = await readdir(rootDirectory, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('incoming-') && join(rootDirectory, entry.name) !== incomingDirectory) {
      candidates.push(join(rootDirectory, entry.name));
    }
  }
  const previousJobs = await readdir(jobsDirectory, { withFileTypes: true });
  for (const entry of previousJobs) {
    if (entry.isDirectory()) candidates.push(join(jobsDirectory, entry.name));
  }
  for (const candidate of candidates) {
    try {
      const metadata = await stat(candidate);
      if (metadata.mtimeMs < cutoff) await rm(candidate, { recursive: true, force: true });
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('[render-cleanup]', error);
    }
  }
}

await cleanupStaleTempData();
const staleCleanupTimer = setInterval(() => {
  void cleanupStaleTempData().catch((error) => console.error('[render-cleanup]', error));
}, 60 * 60 * 1000);
staleCleanupTimer.unref?.();

const app = express();
const jobs = new RenderJobManager({
  concurrency: renderConcurrency,
  maxQueued: maxRenderQueue,
});
let capabilitiesPromise = inspectFfmpeg();
let shuttingDown = false;

function rendererReady(capabilities) {
  return capabilities.available && capabilities.ready !== false;
}

const allowedOrigins = new Set([
  'https://onkarpawar1.github.io',
  ...String(process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);

function originAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

app.disable('x-powered-by');
app.use((request, response, next) => {
  const origin = request.get('origin');
  if (origin && originAllowed(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Private-Network', 'true');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition,Content-Length');
  }
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (request.method === 'OPTIONS') {
    if (origin && !originAllowed(origin)) return response.status(403).end();
    return response.status(204).end();
  }
  if (origin && !originAllowed(origin)) return response.status(403).json({ error: 'This origin is not allowed to use the local render service.' });
  next();
});

const allowedExtensions = new Set([
  '.aac', '.aif', '.aiff', '.caf', '.flac', '.m4a', '.m4b', '.mp3', '.ogg', '.opus', '.wav',
  '.avi', '.m2ts', '.m4v', '.mkv', '.mov', '.mp4', '.mpeg', '.mpg', '.mts', '.ts', '.webm', '.wmv',
  '.apng', '.avif', '.bmp', '.gif', '.heic', '.jfif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp',
]);
const imageExtensions = new Set(['.apng', '.avif', '.bmp', '.gif', '.heic', '.jfif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp']);

function uploadError(message, status = 415) {
  const error = new Error(message);
  error.status = status;
  error.code = 'UNSUPPORTED_UPLOAD';
  return error;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, incomingDirectory),
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${allowedExtensions.has(extension) ? extension : ''}`);
    },
  }),
  limits: {
    fileSize: maxFileBytes,
    files: 502,
    fields: 4,
    fieldSize: maxProjectBytes,
  },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const validField = file.fieldname === 'audio' || file.fieldname === 'logo' || /^asset_\d+$/.test(file.fieldname);
    if (!validField || !allowedExtensions.has(extension)) return callback(uploadError(`Unsupported upload: ${file.originalname}`));
    if (file.fieldname === 'logo' && !imageExtensions.has(extension)) return callback(uploadError('The watermark logo must be an image.'));
    callback(null, true);
  },
});

function safeFilename(title, extension) {
  const base = title
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '_')
    .slice(0, 100) || 'mixed_video';
  return `${base}.${extension}`;
}

async function cleanupUploads(files = []) {
  await Promise.allSettled(files.map((file) => rm(file.path, { force: true })));
}

app.get('/api/health', async (_request, response) => {
  const capabilities = await capabilitiesPromise;
  const ready = rendererReady(capabilities);
  response.status(ready ? 200 : 503).json({
    service: 'advanced-presenter-fx-renderer',
    status: ready ? 'ready' : 'unavailable',
    capabilities,
    limits: { maxFileBytes, maxProjectBytes, maxQueuedJobs: jobs.maxQueued, concurrency: jobs.concurrency },
  });
});

app.post('/api/health/refresh', async (_request, response) => {
  capabilitiesPromise = inspectFfmpeg();
  const capabilities = await capabilitiesPromise;
  const ready = rendererReady(capabilities);
  response.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable', capabilities });
});

app.post('/api/renders', upload.any(), async (request, response, next) => {
  const uploadedFiles = request.files ?? [];
  let jobDirectory;
  try {
    const capabilities = await capabilitiesPromise;
    if (!rendererReady(capabilities)) {
      const unavailableReason = capabilities.missing?.length
        ? `FFmpeg is missing required features: ${capabilities.missing.join(', ')}.`
        : 'FFmpeg is unavailable. Run npm run check:ffmpeg.';
      const error = new Error(capabilities.error || unavailableReason);
      error.status = 503;
      throw error;
    }
    if (typeof request.body.project !== 'string') {
      const error = new Error('The multipart project field is required.');
      error.status = 400;
      throw error;
    }

    let rawProject;
    try {
      rawProject = JSON.parse(request.body.project);
    } catch {
      const error = new Error('The project field must contain valid JSON.');
      error.status = 400;
      throw error;
    }
    const project = parseProject(rawProject);
    const seenFields = new Set();
    for (const file of uploadedFiles) {
      if (seenFields.has(file.fieldname)) {
        const error = new Error(`Upload field was supplied more than once: ${file.fieldname}`);
        error.status = 400;
        throw error;
      }
      seenFields.add(file.fieldname);
    }
    const uploadMap = Object.fromEntries(uploadedFiles.map((file) => [file.fieldname, file]));
    const requiredFields = new Set(['audio', ...project.assets.map((asset) => asset.field)]);
    if (project.watermark.enabled && project.watermark.type === 'image') requiredFields.add('logo');
    for (const field of requiredFields) {
      if (!uploadMap[field]) {
        const error = new Error(`Required upload field is missing: ${field}`);
        error.status = 400;
        throw error;
      }
    }

    const id = randomUUID();
    jobDirectory = join(jobsDirectory, id);
    await mkdir(jobDirectory, { recursive: false });
    const files = {};
    for (const [field, file] of Object.entries(uploadMap)) {
      const destination = join(jobDirectory, `${field}${extname(file.filename).toLowerCase()}`);
      await rename(file.path, destination);
      files[field] = destination;
    }

    const extension = project.output.preset === 'prores-master' ? 'mov' : 'mp4';
    const filename = safeFilename(project.title, extension);
    const job = jobs.add({
      id,
      directory: jobDirectory,
      filename,
      run: async ({ signal, onProgress }) => {
        await validateMediaFiles(project, files);
        const result = await renderProject({ project, files, jobDirectory, capabilities, signal, onProgress });
        return { outputPath: result.outputPath, filename };
      },
    });

    response.status(202).json({
      job,
      statusUrl: `/api/renders/${id}`,
      eventsUrl: `/api/renders/${id}/events`,
      downloadUrl: `/api/renders/${id}/download`,
    });
  } catch (error) {
    await cleanupUploads(uploadedFiles.filter((file) => !jobDirectory || !file.path.startsWith(jobDirectory)));
    if (jobDirectory) await rm(jobDirectory, { recursive: true, force: true });
    next(error);
  }
});

app.get('/api/renders/:id', (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) return response.status(404).json({ error: 'Render job not found or expired.' });
  response.json({ job, downloadUrl: job.status === 'completed' ? `/api/renders/${job.id}/download` : null });
});

app.get('/api/renders/:id/events', (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) return response.status(404).json({ error: 'Render job not found or expired.' });
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders();

  const send = (payload) => response.write(`event: progress\ndata: ${JSON.stringify(payload)}\n\n`);
  send(job);
  const unsubscribe = jobs.subscribe(request.params.id, send);
  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15_000);
  request.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

app.delete('/api/renders/:id', (request, response) => {
  if (!jobs.cancel(request.params.id)) return response.status(409).json({ error: 'The job cannot be cancelled because it is finished or does not exist.' });
  response.status(202).json({ job: jobs.get(request.params.id) });
});

app.get('/api/renders/:id/download', async (request, response, next) => {
  try {
    const job = jobs.getInternal(request.params.id);
    if (!job) return response.status(404).json({ error: 'Render job not found or expired.' });
    if (job.status !== 'completed' || !job.outputPath) return response.status(409).json({ error: 'The render is not ready for download.' });
    const fileStats = await stat(job.outputPath);
    response.setHeader('Content-Type', job.filename.endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
    response.setHeader('Content-Length', String(fileStats.size));
    response.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
    createReadStream(job.outputPath).on('error', next).pipe(response);
  } catch (error) {
    next(error);
  }
});

if (existsSync(distDirectory)) {
  app.use(express.static(distDirectory, { index: false, maxAge: '1h', etag: true }));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/')) return next();
    response.sendFile(join(distDirectory, 'index.html'));
  });
} else {
  app.get('/', (_request, response) => response.json({
    service: 'Advanced Presenter FX renderer',
    message: 'The API is running. Run npm run build to serve the frontend from this process.',
  }));
}

app.use((error, _request, response, _next) => {
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  const expose = status < 500 || ['INVALID_MEDIA', 'ENCODER_UNAVAILABLE', 'FILTER_UNAVAILABLE', 'QUEUE_FULL'].includes(error.code);
  if (status >= 500) console.error('[render-server]', error);
  response.status(status).json({
    error: expose ? error.message : 'The render service encountered an unexpected error.',
    code: error.code || 'RENDER_SERVICE_ERROR',
    details: expose ? error.details : undefined,
  });
});

const server = app.listen(port, host, () => {
  console.log(`Advanced Presenter FX renderer listening on http://${host}:${port}`);
  console.log(existsSync(distDirectory) ? 'Serving the production frontend and render API.' : 'API-only mode; run the Vite frontend separately.');
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; stopping render jobs and cleaning temporary files.`);
  clearInterval(staleCleanupTimer);
  const serverClosed = new Promise((resolveClose) => server.close(resolveClose));
  await jobs.shutdown();
  server.closeAllConnections?.();
  await serverClosed;
  await rm(incomingDirectory, { recursive: true, force: true });
  process.exitCode = 0;
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
