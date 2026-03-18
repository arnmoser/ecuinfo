function parseRecord(line) {
  if (!line.startsWith(':')) {
    throw new Error('Invalid Intel HEX line');
  }
  const payload = line.slice(1).trim();
  if (payload.length < 10 || payload.length % 2 !== 0) {
    throw new Error('Invalid Intel HEX record length');
  }
  const bytes = new Uint8Array(payload.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    const hex = payload.slice(i * 2, i * 2 + 2);
    const value = Number.parseInt(hex, 16);
    if (Number.isNaN(value)) {
      throw new Error('Invalid Intel HEX byte');
    }
    bytes[i] = value;
  }
  const checksum = bytes[bytes.length - 1];
  let sum = 0;
  for (let i = 0; i < bytes.length - 1; i += 1) {
    sum = (sum + bytes[i]) & 0xFF;
  }
  const expectedChecksum = ((~sum + 1) & 0xFF);
  if (checksum !== expectedChecksum) {
    throw new Error('Invalid Intel HEX checksum');
  }
  const byteCount = bytes[0];
  const address = (bytes[1] << 8) | bytes[2];
  const recordType = bytes[3];
  const data = bytes.slice(4, 4 + byteCount);
  return { byteCount, address, recordType, data };
}

export function parseIntelHex(text) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error('Intel HEX file is empty');
  }
  const map = new Map();
  let upper = 0;
  let minAddress = Number.POSITIVE_INFINITY;
  let maxAddress = 0;
  let hasEOF = false;

  for (const line of lines) {
    const record = parseRecord(line);
    if (record.recordType === 0x00) {
      const base = upper + record.address;
      for (let i = 0; i < record.byteCount; i += 1) {
        const current = base + i;
        map.set(current, record.data[i]);
        if (current < minAddress) minAddress = current;
        if (current > maxAddress) maxAddress = current;
      }
      continue;
    }
    if (record.recordType === 0x01) {
      hasEOF = true;
      break;
    }
    if (record.recordType === 0x04) {
      upper = ((record.data[0] << 8) | record.data[1]) << 16;
      continue;
    }
    if (record.recordType === 0x02) {
      upper = ((record.data[0] << 8) | record.data[1]) << 4;
    }
  }

  if (!hasEOF) {
    throw new Error('Intel HEX EOF record missing');
  }
  if (map.size === 0) {
    return { data: new Uint8Array(0), startAddress: 0 };
  }

  const size = maxAddress - minAddress + 1;
  const output = new Uint8Array(size);
  output.fill(0xFF);
  for (const [address, value] of map.entries()) {
    output[address - minAddress] = value;
  }
  return { data: output, startAddress: minAddress };
}

function buildRecord(byteCount, address, recordType, bytes) {
  const data = [byteCount, (address >> 8) & 0xFF, address & 0xFF, recordType, ...bytes];
  let sum = 0;
  for (const value of data) {
    sum = (sum + value) & 0xFF;
  }
  const checksum = ((~sum + 1) & 0xFF);
  const encoded = [...data, checksum]
    .map(value => value.toString(16).toUpperCase().padStart(2, '0'))
    .join('');
  return `:${encoded}`;
}

export function toIntelHex(data, startAddress = 0, rowSize = 16) {
  const lines = [];
  let currentUpper = -1;
  for (let offset = 0; offset < data.length; offset += rowSize) {
    const absoluteAddress = startAddress + offset;
    const upper = (absoluteAddress >>> 16) & 0xFFFF;
    if (upper !== currentUpper) {
      currentUpper = upper;
      lines.push(buildRecord(2, 0, 0x04, [(upper >> 8) & 0xFF, upper & 0xFF]));
    }
    const lower = absoluteAddress & 0xFFFF;
    const chunk = Array.from(data.slice(offset, offset + rowSize));
    lines.push(buildRecord(chunk.length, lower, 0x00, chunk));
  }
  lines.push(buildRecord(0, 0, 0x01, []));
  return `${lines.join('\n')}\n`;
}
