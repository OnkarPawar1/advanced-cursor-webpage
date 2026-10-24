import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveArgs, liveStatus, stopYouTubeStream } from '../server/youtube-live.mjs';
import { OUTPUT_PRESETS } from '../server/schema.mjs';
import { ffmpegInternals } from '../server/ffmpeg.mjs';

const fixture = {
  sourcePath: '/tmp/finished.mp4',
  streamKey: 'example-key-not-real-1234',
};

test('YouTube streaming reuses encoded MP4 video and audio', () => {
  const args = buildLiveArgs(fixture);
  assert.deepEqual(args.slice(args.indexOf('-c:v'), args.indexOf('-c:v') + 4),
    ['-c:v', 'copy', '-c:a', 'copy']);
  assert.ok(args.includes('-re'));
  assert.ok(args.includes('pipe:1'));
  assert.equal(args.at(-1), 'rtmps://a.rtmps.youtube.com/live2/' + fixture.streamKey);
  assert.equal(args.includes('-stream_loop'), false);
});

test('looping repeats media without changing the stream destination', () => {
  const args = buildLiveArgs({ ...fixture, loop: true });
  assert.equal(args[args.indexOf('-stream_loop') + 1], '-1');
  assert.equal(args.at(-1), 'rtmps://a.rtmps.youtube.com/live2/' + fixture.streamKey);
});

test('keys, paths and loop input are validated before spawning a process', () => {
  assert.throws(() => buildLiveArgs({ ...fixture, streamKey: 'bad key/evil' }), /valid YouTube/);
  assert.throws(() => buildLiveArgs({ ...fixture, streamKey: '' }), /valid YouTube/);
  assert.throws(() => buildLiveArgs({ ...fixture, sourcePath: '' }), /Missing source/);
  assert.throws(() => buildLiveArgs({ ...fixture, loop: 'yes' }), /Loop must/);
});

test('inactive status exposes no credentials', () => {
  assert.deepEqual(liveStatus(), { status: 'idle' });
  assert.deepEqual(stopYouTubeStream(), { status: 'idle' });
});

test('live export preset encodes 1080p30 H.264 with a two-second GOP', () => {
  assert.ok(OUTPUT_PRESETS.includes('youtube-live'));
  const options = ffmpegInternals.encoderArguments({
    output: { width: 1920, height: 1080, fps: 30, preset: 'youtube-live' }
  }, { encoders: { h264Videotoolbox: true, libx264: true } });
  assert.equal(options[options.indexOf('-g') + 1], '60');
  assert.equal(options[options.indexOf('-c:v') + 1], 'h264_videotoolbox');
  assert.equal(options[options.indexOf('-c:a') + 1], 'aac');
  assert.equal(options[options.indexOf('-b:a') + 1], '192k');
});
