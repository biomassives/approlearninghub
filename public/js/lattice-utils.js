// public/js/lattice-utils.js

/**
 * Placeholder “lattice” encryption for fun/creative uses.
 * You can swap this out for any more robust logic later.
 */
export function latticeEncrypt(data) {
  // simple Base64 + key obfuscation
  return btoa(JSON.stringify(data));
}


/**
 * Generate a 5×5 identicon‐style avatar as a data URL.
 * @param {string} seed A unique string (e.g. user ID or email)
 * @param {number} size Pixel width/height of the square avatar
 * @returns {string} A PNG data‑URL you can use as an <img> src
 */
export function generatePfp(seed, size = 128) {
  // hash the seed string into a 32‑bit number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // convert to 32‑bit int
  }

  // pick a hue from the hash
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 20); // 60–80%
  const lightness = 50 + (Math.abs(hash) % 10);  // 50–60%
  const fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  // prepare canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // each cell in a 5×5 grid
  const block = size / 5;

  // build a 5×5 symmetric pattern
  const bits = [];
  for (let i = 0; i < 15; i++) {
    bits.push((Math.abs(hash) >> i) & 1);
  }

  // draw background
  ctx.fillStyle = '#eee';
  ctx.fillRect(0, 0, size, size);

  // draw blocks
  ctx.fillStyle = fillStyle;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      if (bits[idx]) {
        // draw mirrored blocks
        ctx.fillRect(col * block, row * block, block, block);
        ctx.fillRect((4 - col) * block, row * block, block, block);
      }
    }
  }

  return canvas.toDataURL('image/png');
}
