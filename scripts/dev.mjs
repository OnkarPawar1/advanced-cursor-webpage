import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(process.execPath, ['--watch', 'server/index.mjs'], { stdio: 'inherit' }),
  spawn(npm, ['run', 'dev'], { stdio: 'inherit' }),
];

let closing = false;
function shutdown(signal = 'SIGTERM') {
  if (closing) return;
  closing = true;
  children.forEach((child) => {
    if (!child.killed) child.kill(signal);
  });
}

children.forEach((child) => {
  child.once('exit', (code) => {
    if (!closing && code && code !== 0) process.exitCode = code;
    shutdown();
  });
});

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
