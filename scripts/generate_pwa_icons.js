import fs from 'fs';
import zlib from 'zlib';

// Function to generate a valid PNG buffer using Node.js built-in zlib
function createPng(width, height, drawFn) {
  // RGBA buffer
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32
function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (c ^ buf[n]) >>> 0;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) >>> 0 : (c >>> 1) >>> 0;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Draw MBK Trading Icon: Dark sleek background #06080C, golden candlestick and emerald candle
function drawMbkIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background rounded squircle / gradient
  const rBg = 6;
  const gBg = 8;
  const bBg = 12;

  // Center logo distance
  const cx = 0.5;
  const cy = 0.5;

  // Bullish Green Candle on left (nx: 0.28 to 0.38, ny: 0.35 to 0.65)
  // Wick (nx: 0.325 to 0.335, ny: 0.25 to 0.75)
  if (nx >= 0.32 && nx <= 0.34 && ny >= 0.25 && ny <= 0.75) {
    return [0, 230, 118, 255]; // #00E676
  }
  if (nx >= 0.27 && nx <= 0.39 && ny >= 0.36 && ny <= 0.62) {
    return [0, 230, 118, 255]; // Green candle body
  }

  // Master Gold Candle in center (nx: 0.44 to 0.56, ny: 0.22 to 0.72)
  // Wick (nx: 0.495 to 0.505, ny: 0.15 to 0.82)
  if (nx >= 0.49 && nx <= 0.51 && ny >= 0.16 && ny <= 0.82) {
    return [212, 175, 55, 255]; // Gold #D4AF37
  }
  if (nx >= 0.43 && nx <= 0.57 && ny >= 0.24 && ny <= 0.68) {
    return [255, 215, 0, 255]; // Gold body
  }

  // Cyan Candle on right (nx: 0.61 to 0.73, ny: 0.32 to 0.58)
  // Wick (nx: 0.665 to 0.675, ny: 0.22 to 0.70)
  if (nx >= 0.66 && nx <= 0.68 && ny >= 0.22 && ny <= 0.70) {
    return [0, 229, 255, 255]; // Cyan
  }
  if (nx >= 0.61 && nx <= 0.73 && ny >= 0.34 && ny <= 0.56) {
    return [0, 229, 255, 255];
  }

  // Border border stroke
  if (nx < 0.03 || nx > 0.97 || ny < 0.03 || ny > 0.97) {
    return [212, 175, 55, 120];
  }

  return [rBg, gBg, bBg, 255];
}

// Generate files
fs.writeFileSync('public/icon-192.png', createPng(192, 192, drawMbkIcon));
fs.writeFileSync('public/icon-512.png', createPng(512, 512, drawMbkIcon));
fs.writeFileSync('public/icon-maskable-512.png', createPng(512, 512, drawMbkIcon));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, drawMbkIcon));

console.log('Successfully generated all PWA icons!');
