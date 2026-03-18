export function getTotalRows(length, bytesPerRow) {
  return Math.ceil(length / bytesPerRow);
}

export function getRowBounds(rowIndex, bytesPerRow, totalLength) {
  const start = rowIndex * bytesPerRow;
  const end = Math.min(start + bytesPerRow, totalLength);
  return { start, end };
}

export function getVisibleRows(scrollTop, viewportHeight, rowHeight, totalRows, overscan = 8) {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
  );
  return { start, end };
}

export function getOffsetRow(offset, bytesPerRow) {
  return Math.floor(offset / bytesPerRow);
}

export function clampOffset(offset, length) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, offset));
}
