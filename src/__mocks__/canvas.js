// Mock for the `canvas` native module so that jsdom component tests can run
// on arm64 machines where the x86_64 canvas.node binary cannot dlopen.
// jsdom falls back gracefully when canvas.createCanvas is not a function.
module.exports = {
  createCanvas: null,
  Image: class {},
};
