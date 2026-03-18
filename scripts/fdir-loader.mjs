import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const isBareSpecifier = (specifier) => {
  return !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:');
};

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (isBareSpecifier(specifier)) {
      try {
        const resolvedPath = require.resolve(specifier, { paths: [process.cwd()] });
        return {
          url: pathToFileURL(resolvedPath).href,
          shortCircuit: true,
        };
      } catch {
        // Keep original error if fallback resolution fails
      }
    }

    throw error;
  }
}
