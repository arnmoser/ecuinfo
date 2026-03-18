import { formatOffset, parseHexByte, toAscii, toHexByte } from '../core/byteFormat.js';
import { getRowBounds, getTotalRows, getVisibleRows } from '../core/bufferModel.js';

export class VirtualHexView {
  constructor({ container, side, getState, onByteEdit, onScroll, onSelectOffset }) {
    this.container = container;
    this.side = side;
    this.getState = getState;
    this.onByteEdit = onByteEdit;
    this.onScroll = onScroll;
    this.onSelectOffset = onSelectOffset;
    this.isProgrammaticScroll = false;
    this.scrollTimeout = null;
    this.renderQueued = false;
    this.scroller = document.createElement('div');
    this.scroller.className = 'hex-pane-scroller';
    this.topSpacer = document.createElement('div');
    this.bottomSpacer = document.createElement('div');
    this.rowsRoot = document.createElement('div');
    this.rowsRoot.className = 'hex-rows';
    this.scroller.append(this.topSpacer, this.rowsRoot, this.bottomSpacer);
    this.container.innerHTML = '';
    this.container.append(this.scroller);
    this.scroller.addEventListener('scroll', () => {
      this.render();
      if (!this.isProgrammaticScroll) {
        this.onScroll(this.side, this.scroller.scrollTop);
      }
    });
    this.handleResize = () => this.render();
    window.addEventListener('resize', this.handleResize);
    this.rowsRoot.addEventListener('click', event => this.handleCellClick(event));
  }

  setScrollTop(value) {
    this.isProgrammaticScroll = true;
    this.scroller.scrollTop = value;
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isProgrammaticScroll = false;
    }, 50);
    this.render();
  }

  getScrollTop() {
    return this.scroller.scrollTop;
  }

  focusOffset(offset) {
    const state = this.getState();
    const rowHeight = state.rowHeight;
    const row = Math.floor(offset / state.bytesPerRow);
    this.setScrollTop(row * rowHeight);
  }

  handleCellClick(event) {
    const target = event.target.closest('[data-offset]');
    if (!target) return;
    const offset = Number.parseInt(target.dataset.offset, 10);
    if (Number.isNaN(offset)) return;
    this.onSelectOffset(this.side, offset);
    const oldValue = target.textContent;
    const input = document.createElement('input');
    input.className = 'hex-byte-input';
    input.maxLength = 2;
    input.value = oldValue;
    target.textContent = '';
    target.append(input);
    input.focus();
    input.select();
    const commit = () => {
      const parsed = parseHexByte(input.value);
      if (parsed !== null) {
        this.onByteEdit(this.side, offset, parsed);
      } else {
        this.render();
      }
    };
    input.addEventListener('keydown', keyEvent => {
      if (keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        commit();
      }
      if (keyEvent.key === 'Escape') {
        this.render();
      }
    });
    input.addEventListener('blur', commit);
  }

  render() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.renderNow();
    });
  }

  renderNow() {
    const state = this.getState();
    const pane = state[this.side];
    const totalRows = getTotalRows(pane.data.length, state.bytesPerRow);
    if (totalRows === 0) {
      this.topSpacer.style.height = '0px';
      this.bottomSpacer.style.height = '0px';
      this.rowsRoot.innerHTML = '';
      return;
    }
    const viewportHeight = Math.max(this.scroller.clientHeight || 0, state.rowHeight * 10);
    const visible = getVisibleRows(
      this.scroller.scrollTop,
      viewportHeight,
      state.rowHeight,
      totalRows
    );
    if (visible.end <= visible.start) {
      visible.end = Math.min(totalRows, visible.start + 1);
    }
    const topHeight = `${visible.start * state.rowHeight}px`;
    const bottomHeight = `${Math.max(0, totalRows - visible.end) * state.rowHeight}px`;
    
    if (this.topSpacer.style.height !== topHeight) {
      this.topSpacer.style.height = topHeight;
    }
    if (this.bottomSpacer.style.height !== bottomHeight) {
      this.bottomSpacer.style.height = bottomHeight;
    }

    const fragment = document.createDocumentFragment();
    for (let rowIndex = visible.start; rowIndex < visible.end; rowIndex += 1) {
      const bounds = getRowBounds(rowIndex, state.bytesPerRow, pane.data.length);
      const row = document.createElement('div');
      row.className = 'hex-row';
      row.style.height = `${state.rowHeight}px`;
      const offsetCell = document.createElement('div');
      offsetCell.className = 'offset-cell';
      offsetCell.textContent = formatOffset(pane.startAddress + bounds.start);
      const hexCell = document.createElement('div');
      hexCell.className = 'hex-cell-group';
      const asciiCell = document.createElement('div');
      asciiCell.className = 'ascii-cell-group';
      for (let i = bounds.start; i < bounds.end; i += 1) {
        const value = pane.data[i];
        const byte = document.createElement('button');
        byte.type = 'button';
        byte.className = 'hex-byte-cell';
        byte.dataset.offset = String(i);
        byte.textContent = toHexByte(value);
        const ascii = document.createElement('span');
        ascii.className = 'ascii-byte-cell';
        ascii.textContent = toAscii(value);
        if (state.compareMode && state.diffIndices.has(i)) {
          byte.classList.add('byte-diff');
          ascii.classList.add('byte-diff');
        }
        if (state.editedOffsets[this.side]?.has(i)) {
          byte.classList.add('byte-edited');
          ascii.classList.add('byte-edited');
        }
        if (state.activeEditSide === this.side && state.activeEditOffset === i) {
          byte.classList.add('byte-active');
          ascii.classList.add('byte-active');
        }
        hexCell.append(byte);
        asciiCell.append(ascii);
      }
      row.append(offsetCell, hexCell, asciiCell);
      fragment.append(row);
    }
    this.rowsRoot.innerHTML = '';
    this.rowsRoot.append(fragment);
  }
}
