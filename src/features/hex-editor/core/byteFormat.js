export function toHexByte(value) {
  return value.toString(16).toUpperCase().padStart(2, '0');
}

export function toAscii(value) {
  return value >= 32 && value <= 126 ? String.fromCharCode(value) : '.';
}

export function parseHexByte(raw) {
  if (!raw) return null;
  const normalized = raw.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{1,2}$/.test(normalized)) return null;
  return Number.parseInt(normalized, 16);
}

export function parseOffset(raw) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  const parsed = /^0x/i.test(value)
    ? Number.parseInt(value.slice(2), 16)
    : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function formatOffset(value, width = 8) {
  return value.toString(16).toUpperCase().padStart(width, '0');
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
