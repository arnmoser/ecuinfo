import { toIntelHex } from '../core/intelHex.js';

let fileWorker;
let requestCounter = 0;
const pendingRequests = new Map();

function getFileWorker() {
  if (!fileWorker) {
    fileWorker = new Worker(new URL('../workers/fileWorker.js', import.meta.url), { type: 'module' });
    fileWorker.addEventListener('message', event => {
      const { requestId, ok, result, error } = event.data;
      const pending = pendingRequests.get(requestId);
      if (!pending) return;
      pendingRequests.delete(requestId);
      if (!ok) {
        pending.reject(new Error(error || 'Erro ao processar arquivo.'));
        return;
      }
      pending.resolve(result);
    });
    fileWorker.addEventListener('error', error => {
      for (const pending of pendingRequests.values()) {
        pending.reject(error);
      }
      pendingRequests.clear();
    });
  }
  return fileWorker;
}

function runWorkerPayload(payload) {
  return new Promise((resolve, reject) => {
    const requestId = ++requestCounter;
    pendingRequests.set(requestId, { resolve, reject });
    getFileWorker().postMessage({ requestId, payload });
  });
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function getFormatByName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.hex')) return 'hex';
  return 'bin';
}

export async function openLocalFile(file, options = {}) {
  const notifyStage = options.onStage ?? (() => {});
  const format = getFormatByName(file.name);
  if (format === 'hex') {
    notifyStage('reading');
    const text = await readAsText(file);
    notifyStage('processing');
    const parsed = await runWorkerPayload({
      format: 'hex',
      text
    });
    return {
      fileName: file.name,
      format,
      data: new Uint8Array(parsed.buffer),
      startAddress: parsed.startAddress
    };
  }
  notifyStage('reading');
  const buffer = await readAsArrayBuffer(file);
  notifyStage('processing');
  const parsed = await runWorkerPayload({
    format: 'bin',
    buffer
  });
  return {
    fileName: file.name,
    format: 'bin',
    data: new Uint8Array(parsed.buffer),
    startAddress: parsed.startAddress
  };
}

function getDownloadName(fileName, format) {
  if (!fileName) return format === 'hex' ? 'edited.hex' : 'edited.bin';
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const extension = format === 'hex' ? '.hex' : '.bin';
  return `${base}-edited${extension}`;
}

export function exportLocalFile(pane) {
  let blob;
  if (pane.format === 'hex') {
    const content = toIntelHex(pane.data, pane.startAddress);
    blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  } else {
    blob = new Blob([pane.data], { type: 'application/octet-stream' });
  }
  const fileName = getDownloadName(pane.fileName, pane.format);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
