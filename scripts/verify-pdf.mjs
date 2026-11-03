import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const port = 5199;
const origin = `http://127.0.0.1:${port}`;
const outputDir = resolve(root, 'output', 'verify');
mkdirSync(outputDir, { recursive: true });

const chrome =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const targets = [
  ['ar', 'executive'],
  ['ar', 'minimal'],
  ['ar', 'tutorial'],
  ['ar', 'gradient'],
  ['ar', 'technical'],
  ['ar', 'brand'],
  ['en', 'minimal'],
  ['letter-landscape', 'brand'],
  ['no-cover', 'technical'],
  ['annotated-large', 'tutorial'],
];

function spawnVite() {
  const child = spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout.on('data', () => {});
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 250));
  }
  throw new Error('vite dev server did not start in time');
}

const vite = spawnVite();

try {
  await waitForServer(`${origin}/verify.html`);
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/verify.html`, {
    waitUntil: 'networkidle0',
    timeout: 60_000,
  });
  await page.waitForFunction('window.__verifyReady === true', { timeout: 30_000 });

  for (const [variant, templateId] of targets) {
    const fileName = `verify-${variant}-${templateId}.pdf`;
    const base64 = await page.evaluate(
      async ({ variant, templateId }) => {
        // eslint-disable-next-line no-undef
        return window.__verify.exportPdf(variant, templateId);
      },
      { variant, templateId },
    );
    const buffer = Buffer.from(base64, 'base64');
    const target = resolve(outputDir, fileName);
    writeFileSync(target, buffer);
    const info = execFileSync('pdfinfo', [target], { encoding: 'utf8' });
    const pages = /Pages:\s+(\d+)/.exec(info)?.[1] ?? '?';
    const size = /Page size:\s+([^\n]+)/.exec(info)?.[1] ?? '?';
    console.log(`${fileName}: ${pages} pages · ${size.trim()} · ${buffer.length} bytes`);
  }

  await browser.close();
} finally {
  vite.kill('SIGTERM');
}

console.log(`\nPDFs written to ${outputDir}`);
