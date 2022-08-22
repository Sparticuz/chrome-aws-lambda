const fg = require('fast-glob');
const fs = require('node:fs/promises');
const path = require('node:path');
const { minify } = require('terser');

async function main() {
  const entries = await fg(path.resolve(__dirname, '../nodejs/node_modules/**/*.js'));
  for (const entry of entries) {
    const contents = await fs.readFile(entry, { encoding: 'utf-8' });
    try {
      const result = await minify(contents);
      if (result.code) {
        await fs.writeFile(entry, result.code);
        console.log(`minified: ${entry}`);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

void main();
