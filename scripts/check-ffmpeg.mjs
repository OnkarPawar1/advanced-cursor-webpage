import { inspectFfmpeg } from '../server/ffmpeg.mjs';

const capabilities = await inspectFfmpeg();

if (!capabilities.available) {
  console.error(`✗ ${capabilities.error}`);
  console.error(process.platform === 'darwin' ? 'Install it with: brew install ffmpeg' : 'Install FFmpeg and make ffmpeg/ffprobe available on PATH.');
  process.exitCode = 1;
} else {
  console.log(`✓ ${capabilities.version}`);
  console.log(`  libx264:          ${capabilities.encoders.libx264 ? 'yes' : 'no'}`);
  console.log(`  h264_videotoolbox:${capabilities.encoders.h264Videotoolbox ? ' yes' : ' no (only expected on macOS)'}`);
  console.log(`  prores_ks:        ${capabilities.encoders.proresKs ? 'yes' : 'no'}`);
  console.log(`  ASS subtitles:    ${capabilities.filters.ass ? 'yes' : 'no'}`);
  console.log(`  transitions:      ${capabilities.filters.xfade ? 'yes' : 'no'}`);
  console.log(`  Ken Burns:        ${capabilities.filters.zoompan ? 'yes' : 'no'}`);

  if (!capabilities.ready) {
    console.error(`\n✗ This FFmpeg build is missing: ${capabilities.missing.join(', ')}.`);
    process.exitCode = 1;
  } else {
    console.log('\n✓ FFmpeg is ready for production rendering.');
  }
}
