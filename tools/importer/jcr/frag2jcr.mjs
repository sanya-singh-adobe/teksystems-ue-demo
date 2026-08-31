import { readFile, writeFile } from 'fs/promises';
import { html2md } from '../../../node_modules/@adobe/helix-html2md/src/html2md.js';

const noop = () => {};
const log = {
  info: noop, warn: noop, error: console.error, debug: noop, verbose: noop,
};

for (const name of ['nav', 'footer']) {
  const plain = await readFile(`content/${name}.plain.html`, 'utf-8');
  const html = `<!DOCTYPE html><html><body><main>${plain}</main></body></html>`;
  const md = await html2md(html, { log, url: `https://www.teksystems.com/${name}` });
  await writeFile(`tools/importer/jcr/${name}.md`, md);
  console.log(`${name}.md: ${md.length} bytes`);
}
