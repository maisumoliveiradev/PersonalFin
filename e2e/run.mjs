import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

import { createStepper, launchBrowser } from './helpers.mjs';

const journeysDir = path.join(import.meta.dirname, 'journeys');
const artifactsDir = path.join(import.meta.dirname, '.artifacts');
const only = process.argv.slice(2);

await mkdir(artifactsDir, { recursive: true });
const files = (await readdir(journeysDir))
  .filter((file) => file.endsWith('.mjs'))
  .sort()
  .filter((file) => only.length === 0 || only.some((name) => file.includes(name)));

let passed = 0;
const failures = [];
for (const file of files) {
  const name = file.replace(/^\d+-/, '').replace(/\.mjs$/, '');
  console.log(`=== ${name}`);
  const { default: journey } = await import(path.join(journeysDir, file));
  const browser = await launchBrowser();
  const step = createStepper((line) => {
    passed += 1;
    console.log(line);
  });
  try {
    await journey({ browser, step, artifactsDir });
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    failures.push(`${name}: ${message}`);
    console.log(`FAIL ${message}`);
    for (const context of browser.contexts()) {
      for (const [index, page] of context.pages().entries()) {
        await page.screenshot({
          path: path.join(artifactsDir, `fail-${name}-${index}.png`),
          fullPage: true,
        });
      }
    }
  } finally {
    await browser.close();
  }
}

console.log(`\n${files.length} journeys, ${passed} steps passed, ${failures.length} failed`);
for (const failure of failures) {
  console.log(`FAIL ${failure}`);
}
process.exitCode = failures.length === 0 ? 0 : 1;
