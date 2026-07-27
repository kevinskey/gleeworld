'use strict';
// Vitest worker preload (via poolOptions.forks.execArgv --require):
// Stubs the canvas package before jsdom loads it. The canvas.node binary is
// compiled for x86_64 but this machine is arm64, causing a dlopen crash.
// jsdom gracefully falls back when canvas.createCanvas is not a function.

var canvasModules = [
  'canvas',
  'canvas/lib/bindings',
  'canvas/lib/canvas',
  'canvas/lib/context2d',
  'canvas/lib/image',
  'canvas/lib/parse-font',
  'canvas/lib/pattern',
  'canvas/lib/DOMMatrix',
  'canvas/lib/jpegstream',
  'canvas/lib/pdfstream',
  'canvas/lib/pngstream',
];

var stub = { createCanvas: null, Image: function(){}, ImageData: function(){}, registerFont: function(){} };

canvasModules.forEach(function(id) {
  try {
    var resolved = require.resolve(id);
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports: id === 'canvas' ? stub : {},
      parent: null,
      children: [],
    };
  } catch (e) {
    // module not resolvable in this environment — skip
  }
});
