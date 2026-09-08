import { EventEmitter } from 'node:events';
import { rm } from 'node:fs/promises';

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    progress: Number(job.progress.toFixed(1)),
    error: job.error,
    filename: job.filename,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

export class RenderJobManager {
  constructor({ concurrency = 1, maxQueued = 4, ttlMs = 6 * 60 * 60 * 1000 } = {}) {
    this.concurrency = concurrency;
    this.maxQueued = maxQueued;
    this.ttlMs = ttlMs;
    this.jobs = new Map();
    this.queue = [];
    this.active = 0;
    this.activeTasks = new Set();
    this.stopping = false;
    this.events = new EventEmitter();
    this.events.setMaxListeners(100);
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpired().catch((error) => console.error('[render-cleanup]', error));
    }, 15 * 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  add({ id, directory, filename, run }) {
    if (this.stopping) {
      const error = new Error('The render service is shutting down.');
      error.code = 'SERVICE_STOPPING';
      error.status = 503;
      throw error;
    }
    if (this.queue.length >= this.maxQueued) {
      const error = new Error('The render queue is full. Wait for the current job to finish and try again.');
      error.code = 'QUEUE_FULL';
      error.status = 429;
      throw error;
    }
    const job = {
      id,
      directory,
      filename,
      run,
      abortController: new AbortController(),
      status: 'queued',
      progress: 0,
      error: null,
      outputPath: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };
    this.jobs.set(id, job);
    this.queue.push(job);
    this.emit(job);
    this.drain();
    return publicJob(job);
  }

  get(id) {
    const job = this.jobs.get(id);
    return job ? publicJob(job) : null;
  }

  getInternal(id) {
    return this.jobs.get(id) ?? null;
  }

  subscribe(id, listener) {
    const eventName = `job:${id}`;
    this.events.on(eventName, listener);
    return () => this.events.off(eventName, listener);
  }

  emit(job) {
    this.events.emit(`job:${job.id}`, publicJob(job));
  }

  cancel(id) {
    const job = this.jobs.get(id);
    if (!job || !['queued', 'running'].includes(job.status)) return false;
    job.abortController.abort();
    if (job.status === 'queued') {
      this.queue = this.queue.filter((queuedJob) => queuedJob.id !== id);
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      this.emit(job);
    }
    return true;
  }

  async drain() {
    while (!this.stopping && this.active < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job || job.abortController.signal.aborted) continue;
      this.active += 1;
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      this.emit(job);

      const task = job.run({
        signal: job.abortController.signal,
        onProgress: (progress) => {
          if (job.status !== 'running') return;
          job.progress = progress;
          this.emit(job);
        },
      }).then((result) => {
        job.outputPath = result.outputPath;
        job.filename = result.filename ?? job.filename;
        job.progress = 100;
        job.status = 'completed';
      }).catch((error) => {
        if (job.abortController.signal.aborted || error.code === 'RENDER_CANCELLED') {
          job.status = 'cancelled';
          job.error = null;
        } else {
          job.status = 'failed';
          job.error = error.message || 'The FFmpeg render failed.';
        }
      }).finally(() => {
        job.completedAt = new Date().toISOString();
        this.active -= 1;
        this.emit(job);
        this.activeTasks.delete(task);
        if (!this.stopping) this.drain();
      });
      this.activeTasks.add(task);
    }
  }

  async cleanupExpired() {
    const cutoff = Date.now() - this.ttlMs;
    const removals = [];
    for (const [id, job] of this.jobs.entries()) {
      const completed = job.completedAt ? new Date(job.completedAt).getTime() : Infinity;
      if (completed < cutoff && !['queued', 'running'].includes(job.status)) {
        this.jobs.delete(id);
        removals.push(rm(job.directory, { recursive: true, force: true }));
      }
    }
    await Promise.allSettled(removals);
  }

  async shutdown() {
    this.stopping = true;
    clearInterval(this.cleanupTimer);
    for (const job of this.jobs.values()) {
      if (['queued', 'running'].includes(job.status)) {
        job.abortController.abort();
        if (job.status === 'queued') {
          job.status = 'cancelled';
          job.completedAt = new Date().toISOString();
          this.emit(job);
        }
      }
    }
    this.queue = [];
    await Promise.allSettled([...this.activeTasks]);
    await Promise.allSettled([...this.jobs.values()].map((job) => rm(job.directory, { recursive: true, force: true })));
  }
}

export { publicJob };
