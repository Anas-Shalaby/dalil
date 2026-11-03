import { rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
rmSync(resolve(root, 'dist'), { recursive: true, force: true });

const children = [
  spawn('npx', ['vite', 'build', '--watch'], { cwd: root, stdio: 'inherit' }),
  spawn('npx', ['vite', 'build', '--config', 'vite.content.config.ts', '--watch'], {
    cwd: root,
    stdio: 'inherit',
  }),
];

const stop = () => {
  for (const child of children) child.kill('SIGTERM');
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      stop();
      process.exit(code);
    }
  });
}
