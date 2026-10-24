import React, { useCallback, useEffect, useState } from 'react';
import { RadioTower, Square, RefreshCw, AlertCircle, ShieldCheck, Repeat2 } from 'lucide-react';

type LiveStatus = {
  status: 'idle' | 'connecting' | 'live' | 'stopping' | 'stopped' | 'ended' | 'failed';
  id?: string;
  startedAt?: string;
  sourceJobId?: string;
  error?: string | null;
  loop?: boolean;
  progress?: { secondsSent?: number; frames?: number };
};
type RenderJob = { id: string; status: string; filename: string };
type Props = {
  apiBase: string;
  renderServiceReady: boolean;
  renderJob: RenderJob;
};

const formatSeconds = (seconds?: number) => {
  if (!Number.isFinite(seconds)) return '00:00:00';
  const n = Math.max(0, Math.floor(seconds || 0));
  return [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
};

export default function YouTubeLivePanel({ apiBase, renderServiceReady, renderJob }: Props) {
  const [streamKey, setStreamKey] = useState('');
  const [loop, setLoop] = useState(false);
  const [session, setSession] = useState<LiveStatus>({ status: 'idle' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const endpoint = useCallback((path: string) => apiBase + path, [apiBase]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint('/api/live/status'), { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not check the livestream status');
      setSession(await response.json());
    } catch {
      // Renderer health panel already reports offline state.
    }
  }, [endpoint]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 2500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const perform = async (path: string, body?: Record<string, unknown>) => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(endpoint(path), {
        method: 'POST',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Livestream operation failed');
      setSession(result);
      if (path.endsWith('/start')) setStreamKey('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Livestream request failed');
    } finally {
      setBusy(false);
    }
  };

  const running = ['connecting', 'live', 'stopping'].includes(session.status);
  const eligible = renderJob.status === 'completed' && renderJob.filename.toLowerCase().endsWith('.mp4');
  return (
    <section className="bg-gray-800 p-5 rounded-2xl border-2 border-red-500/40 shadow-inner mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-red-300 flex items-center gap-2">
            <RadioTower size={20} /> YouTube Live Studio
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Stream your finished slideshow to YouTube via local FFmpeg (no second video encode).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold rounded-full px-3 py-1 border ${
            session.status === 'live' ? 'text-green-300 border-green-600 bg-green-950/40'
            : session.status === 'failed' ? 'text-red-300 border-red-600 bg-red-950/40'
            : 'text-gray-300 border-gray-600 bg-gray-900/40'
          }`}>
            {session.status === 'live' ? '● Sending to YouTube' : session.status === 'connecting' ? '● Connecting...' : session.status}
          </span>
          <button type="button" aria-label="Refresh livestream status" onClick={() => void refresh()}
            className="text-gray-300 hover:text-white p-2 rounded bg-gray-700"><RefreshCw size={16} /></button>
        </div>
      </div>
      {running ? (
        <div className="bg-gray-900/60 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-200">
            Source render: <span className="font-mono text-xs">{session.sourceJobId}</span>
          </p>
          <div className="flex gap-5 flex-wrap text-sm text-gray-300">
            <span>Streamed video: <strong className="text-white">{formatSeconds(session.progress?.secondsSent)}</strong></span>
            <span>Frames: <strong className="text-white">{session.progress?.frames ?? 0}</strong></span>
            {session.loop && <span>Loop enabled</span>}
          </div>
          <p className="text-xs text-amber-300">Check YouTube Studio's preview and click Go Live if required. Sending video does not automatically publish the broadcast.</p>
          <button type="button" disabled={busy || session.status === 'stopping'}
            onClick={() => void perform('/api/live/stop')}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-600 rounded-lg font-semibold text-white disabled:opacity-50">
            <Square size={16} /> {session.status === 'stopping' ? 'Stopping…' : 'Stop Stream'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <ShieldCheck size={16} className="shrink-0 text-green-400" />
            Your stream key is used only for this session; it is not saved in the project or GitHub.
          </div>
          <label className="block text-xs text-gray-300" htmlFor="youtube-stream-key">YouTube stream key</label>
          <input id="youtube-stream-key" type="password" value={streamKey} onChange={e => setStreamKey(e.target.value)}
            autoComplete="off" spellCheck={false} placeholder="Paste your new YouTube stream key"
            className="w-full p-3 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm" />
          <label className="inline-flex gap-2 items-center text-sm text-gray-200">
            <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} />
            <Repeat2 size={15} /> Repeat slideshow continuously
          </label>
          <button type="button" disabled={!renderServiceReady || !eligible || streamKey.trim().length < 8 || busy}
            onClick={() => void perform('/api/live/start', { jobId: renderJob.id, streamKey: streamKey.trim(), loop })}
            className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 px-5 py-3 font-semibold text-white">
            <RadioTower size={17} /> {busy ? 'Connecting…' : 'Start YouTube Stream'}
          </button>
          {!eligible && <p className="text-xs text-amber-300">First click Render High Quality above, using an H.264 MP4 preset (not ProRes MOV).</p>}
          {session.status === 'failed' && session.error && (
            <p className="text-xs text-red-300">Previous stream failed: {session.error}</p>
          )}
        </div>
      )}
      {message && <div role="alert" className="flex gap-2 text-xs text-red-300 mt-3">
        <AlertCircle size={16} /> {message}
      </div>}
    </section>
  );
}
