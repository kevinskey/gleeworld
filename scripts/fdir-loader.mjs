import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'fdir' || specifier.startsWith('fdir/')) {
    try {
      const resolvedPath = require.resolve(specifier, { paths: [process.cwd()] });
      return {
        url: pathToFileURL(resolvedPath).href,
        shortCircuit: true,
      };
    } catch {
      // Fall through to default resolver
    }
  }

  return nextResolve(specifier, context);
}
