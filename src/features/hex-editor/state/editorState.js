const defaultPane = () => ({
  fileName: '',
  format: 'bin',
  data: new Uint8Array(0),
  startAddress: 0
});

export function createEditorState() {
  const listeners = new Set();
  const state = {
    left: defaultPane(),
    right: defaultPane(),
    compareMode: false,
    diffIndices: new Set(),
    editedOffsets: {
      left: new Set(),
      right: new Set()
    },
    isDiffRunning: false,
    bytesPerRow: 16,
    rowHeight: 28,
    activeEditOffset: null,
    activeEditSide: 'left'
  };

  function notify() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  return {
    get() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPane(side, panePatch) {
      state[side] = { ...state[side], ...panePatch };
      if (panePatch.data instanceof Uint8Array) {
        state.editedOffsets[side] = new Set();
      }
      notify();
    },
    setCompareMode(value) {
      state.compareMode = Boolean(value);
      notify();
    },
    setDiff(indices) {
      state.diffIndices = new Set(indices);
      state.isDiffRunning = false;
      notify();
    },
    setDiffRunning(value) {
      state.isDiffRunning = Boolean(value);
      notify();
    },
    setActiveEditOffset(offset, side = state.activeEditSide) {
      state.activeEditOffset = offset;
      state.activeEditSide = side;
      notify();
    },
    updateByte(side, offset, value) {
      const source = state[side].data;
      if (offset < 0 || offset >= source.length) return;
      const next = new Uint8Array(source);
      next[offset] = value;
      state[side] = { ...state[side], data: next };
      const edited = new Set(state.editedOffsets[side]);
      edited.add(offset);
      state.editedOffsets[side] = edited;
      notify();
    },
    resetDiff() {
      state.diffIndices = new Set();
      state.isDiffRunning = false;
      notify();
    }
  };
}
