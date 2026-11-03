import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
rmSync(resolve(root, 'dist'), { recursive: true, force: true });

const run = (args) => {
  const result = spawnSync('npx', args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(['vite', 'build']);
run(['vite', 'build', '--config', 'vite.content.config.ts']);
