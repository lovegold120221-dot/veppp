const FRAME_SIZE = 2048;

class PcmRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.paused = false;
    this.frame = new Float32Array(FRAME_SIZE);
    this.offset = 0;
    this.port.onmessage = (event) => {
      if (event.data?.type === 'setPaused') {
        this.paused = Boolean(event.data.paused);
        if (this.paused) this.offset = 0;
      }
    };
  }

  emitFrame(frame) {
    const raw = new Float32Array(frame);
    const pcm = new Int16Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, raw[i]));
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    this.port.postMessage(
      { type: 'audio', pcm: pcm.buffer, raw: raw.buffer },
      [pcm.buffer, raw.buffer],
    );
  }

  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (output) output.fill(0);

    if (this.paused) return true;

    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    let cursor = 0;
    while (cursor < input.length) {
      const available = FRAME_SIZE - this.offset;
      const take = Math.min(available, input.length - cursor);
      this.frame.set(input.subarray(cursor, cursor + take), this.offset);
      this.offset += take;
      cursor += take;

      if (this.offset === FRAME_SIZE) {
        this.emitFrame(this.frame);
        this.frame = new Float32Array(FRAME_SIZE);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-recorder-processor', PcmRecorderProcessor);
