let worker;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/diffWorker.js', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function computeDiff(leftData, rightData) {
  return new Promise((resolve, reject) => {
    const diffWorker = getWorker();
    const cleanup = () => {
      diffWorker.removeEventListener('message', handleMessage);
      diffWorker.removeEventListener('error', handleError);
    };
    const handleMessage = event => {
      cleanup();
      const diffIndices = new Uint32Array(event.data.diffIndices);
      resolve(diffIndices);
    };
    const handleError = error => {
      cleanup();
      reject(error);
    };
    diffWorker.addEventListener('message', handleMessage);
    diffWorker.addEventListener('error', handleError);
    diffWorker.postMessage({
      left: leftData.slice().buffer,
      right: rightData.slice().buffer
    });
  });
}
