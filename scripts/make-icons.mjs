import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="10" fill="#7440E9"/>
  <rect x="9.5" y="7.5" width="21" height="25" rx="5.5" fill="white"/>
  <rect x="14" y="13" width="12" height="2.6" rx="1.3" fill="#7440E9"/>
  <rect x="14" y="18.7" width="9.5" height="2.6" rx="1.3" fill="#B99BFA"/>
  <rect x="14" y="24.4" width="6.5" height="2.6" rx="1.3" fill="#D9C8FD"/>
  <circle cx="26.2" cy="26.8" r="1.7" fill="#7440E9"/>
</svg>`;

const source = resolve(root, 'public/icons/_source.svg');
writeFileSync(source, svg);

for (const size of [16, 32, 48, 128]) {
  const out = resolve(root, `public/icons/icon-${size}.png`);
  const result = spawnSync('rsvg-convert', ['-w', String(size), '-h', String(size), source, '-o', out]);
  if (result.status !== 0) {
    console.error('rsvg-convert failed; install librsvg or replace icons manually.');
    process.exit(1);
  }
}
console.log('Icons generated in public/icons.');
