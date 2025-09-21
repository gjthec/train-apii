import { mkdirSync, statSync, symlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const nodeModules = resolve(root, 'node_modules');

const mappings = [
  ['@types/react', resolve(root, 'types/react')],
  ['@types/react-dom', resolve(root, 'types/react-dom')]
];

for (const [target, source] of mappings) {
  const destination = resolve(nodeModules, target);
  try {
    const stats = statSync(destination, { throwIfNoEntry: false });
    if (stats) {
      continue;
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
      console.warn(`Skipping ${target}:`, error);
      continue;
    }
  }

  mkdirSync(resolve(destination, '..'), { recursive: true });
  try {
    symlinkSync(source, destination, 'junction');
    console.log(`Linked ${destination} -> ${source}`);
  } catch (error) {
    console.warn(`Could not link ${target}:`, error);
  }
}
