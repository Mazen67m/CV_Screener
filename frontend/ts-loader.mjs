/**
 * Node.js custom ESM loader that appends the `.ts` extension when a bare
 * module specifier resolves to a TypeScript source file.
 *
 * Usage:
 *   node --import ./ts-loader.mjs --experimental-strip-types --test <file.ts>
 *
 * This is needed because Node's default ESM resolver requires explicit
 * file extensions in import statements, but TypeScript convention (and Next.js)
 * uses extension-less imports like `import { foo } from './bar'`.
 */

import { resolve as pathResolve } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  // Only attempt extension injection for relative imports (., ..)
  if (specifier.startsWith('.') && !specifier.endsWith('.ts') && !specifier.endsWith('.js')) {
    const parentDir = context.parentURL
      ? pathResolve(fileURLToPath(context.parentURL), '..')
      : process.cwd()

    const candidate = pathResolve(parentDir, specifier + '.ts')
    if (existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context)
    }
  }

  return nextResolve(specifier, context)
}
