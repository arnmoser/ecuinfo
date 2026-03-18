import { parseIntelHex } from '../core/intelHex.js';

self.onmessage = event => {
  const { requestId, payload } = event.data;
  try {
    if (payload.format === 'hex') {
      const { data, startAddress } = parseIntelHex(payload.text);
      self.postMessage(
        {
          requestId,
          ok: true,
          result: {
            format: 'hex',
            startAddress,
            buffer: data.buffer
          }
        },
        [data.buffer]
      );
      return;
    }
    const input = new Uint8Array(payload.buffer);
    const output = new Uint8Array(input.length);
    output.set(input);
    self.postMessage(
      {
        requestId,
        ok: true,
        result: {
          format: 'bin',
          startAddress: 0,
          buffer: output.buffer
        }
      },
      [output.buffer]
    );
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error?.message || 'Erro ao processar arquivo.'
    });
  }
};
