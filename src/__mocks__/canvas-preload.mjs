// Vitest globalSetup (ESM): intercept the canvas native binding before jsdom
// tries to dlopen it. Canvas was compiled for x86_64 but this machine is
// arm64. Patches Module._extensions['.node'] in the main process before
// any worker forks so the worker inherits the patched loader.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export async function setup() {
  const Module = require('module');
  const origNodeLoader = Module._extensions['.node'];
  Module._extensions['.node'] = function(mod, filename) {
    if (filename.includes('canvas')) {
      mod.exports = {};
      return;
    }
    return origNodeLoader.call(this, mod, filename);
  };
}
