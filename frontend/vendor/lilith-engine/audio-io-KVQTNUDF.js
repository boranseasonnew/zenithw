// packages/core/src/utils/errors.ts
var AudioEngineError = class extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.code = code;
    this.name = "AudioEngineError";
  }
};
function checkAbort(signal) {
  if (signal?.aborted) throw new AudioEngineError("ABORTED", "Operation canceled.");
}

export {
  AudioEngineError,
  checkAbort
};
