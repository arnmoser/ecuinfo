self.onmessage = event => {
  const { left, right } = event.data;
  const leftArray = new Uint8Array(left);
  const rightArray = new Uint8Array(right);
  const maxLength = Math.max(leftArray.length, rightArray.length);
  const output = new Uint32Array(maxLength);
  let diffCount = 0;
  for (let i = 0; i < maxLength; i += 1) {
    const leftByte = i < leftArray.length ? leftArray[i] : -1;
    const rightByte = i < rightArray.length ? rightArray[i] : -1;
    if (leftByte !== rightByte) {
      output[diffCount] = i;
      diffCount += 1;
    }
  }
  const trimmed = output.slice(0, diffCount);
  self.postMessage({ diffIndices: trimmed.buffer }, [trimmed.buffer]);
};
