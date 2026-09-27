import { RGBColor, ScreenModeConfig } from '../types/bsave';
import { SCREEN_MODES } from './screenModes';
import { PALETTE_1BIT_BW, PALETTE_2BIT_CGA1_HIGH, PALETTE_4BIT_EGA16, getStandardVga256Palette } from './palettes';

export interface DecodedBSAVE {
  hasValidHeader: boolean;
  segment: number;
  segmentHex: string;
  offset: number;
  offsetHex: string;
  declaredLength: number;
  actualPayloadLength: number;
  inferredMode: ScreenModeConfig;
  width: number;
  height: number;
  indexedPixels: Uint8Array;
  rgbaData: Uint8ClampedArray;
  palette: RGBColor[];
}

export function decodeBSAVEBuffer(
  buffer: Uint8Array,
  forcedMode?: ScreenModeConfig,
  customPalette?: RGBColor[]
): DecodedBSAVE {
  let hasValidHeader = false;
  let segment = 0xA000;
  let offset = 0;
  let declaredLength = buffer.length;
  let payload: Uint8Array;

  // Check 0xFD magic byte
  if (buffer.length >= 7 && buffer[0] === 0xFD) {
    hasValidHeader = true;
    segment = buffer[1] | (buffer[2] << 8);
    offset = buffer[3] | (buffer[4] << 8);
    declaredLength = buffer[5] | (buffer[6] << 8);
    payload = buffer.subarray(7, Math.min(buffer.length, 7 + declaredLength));
  } else {
    // Headerless raw memory dump
    hasValidHeader = false;
    payload = buffer;
  }

  // Infer mode if not forced
  let mode: ScreenModeConfig;
  if (forcedMode) {
    mode = forcedMode;
  } else if (segment === 0xA000 && (payload.length === 64000 || payload.length === 64007)) {
    mode = SCREEN_MODES.SCREEN_13;
  } else if (segment === 0xB800 && payload.length <= 16384) {
    // Likely CGA SCREEN 1 or SCREEN 2
    mode = SCREEN_MODES.SCREEN_1;
  } else if (payload.length >= 4) {
    // Check if there is an array header
    const w = payload[0] | (payload[1] << 8);
    const h = payload[2] | (payload[3] << 8);
    if (w > 0 && w <= 2560 && h > 0 && h <= 1024) {
      mode = SCREEN_MODES.SCREEN_7;
    } else {
      mode = SCREEN_MODES.SCREEN_13;
    }
  } else {
    mode = SCREEN_MODES.SCREEN_13;
  }

  const width = mode.width;
  const height = mode.height;
  const totalPixels = width * height;
  const indexedPixels = new Uint8Array(totalPixels);
  const rgbaData = new Uint8ClampedArray(totalPixels * 4);

  // Default palette for inferred mode
  let palette: RGBColor[] = customPalette || [];
  if (palette.length === 0) {
    switch (mode.bitDepth) {
      case 1:
        palette = PALETTE_1BIT_BW;
        break;
      case 2:
        palette = PALETTE_2BIT_CGA1_HIGH;
        break;
      case 4:
        palette = PALETTE_4BIT_EGA16;
        break;
      case 8:
      default:
        palette = getStandardVga256Palette();
        break;
    }
  }

  // Decode according to screen mode & memory layout
  if (mode.bitDepth === 8) {
    // Linear 1 byte per pixel
    for (let i = 0; i < totalPixels; i++) {
      const idx = i < payload.length ? payload[i] : 0;
      indexedPixels[i] = idx;
      const c = palette[idx % palette.length] || [0, 0, 0];
      rgbaData[i * 4] = c[0];
      rgbaData[i * 4 + 1] = c[1];
      rgbaData[i * 4 + 2] = c[2];
      rgbaData[i * 4 + 3] = 255;
    }
  } else if (mode.id === 'SCREEN_1') {
    // CGA 2-bit interleaved: 4 pixels per byte
    const bytesPerLine = Math.ceil(width / 4); // 80 bytes
    const oddOffset = 8192;

    for (let y = 0; y < height; y++) {
      const isOdd = y % 2 === 1;
      const lineIdx = Math.floor(y / 2);
      const lineStart = (isOdd ? oddOffset : 0) + lineIdx * bytesPerLine;

      for (let bx = 0; bx < bytesPerLine; bx++) {
        const byteVal = (lineStart + bx < payload.length) ? payload[lineStart + bx] : 0;
        for (let p = 0; p < 4; p++) {
          const px = bx * 4 + p;
          if (px < width) {
            const shift = (3 - p) * 2;
            const colIdx = (byteVal >> shift) & 0x03;
            const destIdx = y * width + px;
            indexedPixels[destIdx] = colIdx;
            const c = palette[colIdx % palette.length] || [0, 0, 0];
            rgbaData[destIdx * 4] = c[0];
            rgbaData[destIdx * 4 + 1] = c[1];
            rgbaData[destIdx * 4 + 2] = c[2];
            rgbaData[destIdx * 4 + 3] = 255;
          }
        }
      }
    }
  } else if (mode.id === 'SCREEN_2') {
    // CGA 1-bit interleaved: 8 pixels per byte
    const bytesPerLine = Math.ceil(width / 8); // 80 bytes
    const oddOffset = 8192;

    for (let y = 0; y < height; y++) {
      const isOdd = y % 2 === 1;
      const lineIdx = Math.floor(y / 2);
      const lineStart = (isOdd ? oddOffset : 0) + lineIdx * bytesPerLine;

      for (let bx = 0; bx < bytesPerLine; bx++) {
        const byteVal = (lineStart + bx < payload.length) ? payload[lineStart + bx] : 0;
        for (let p = 0; p < 8; p++) {
          const px = bx * 8 + p;
          if (px < width) {
            const shift = 7 - p;
            const colIdx = (byteVal >> shift) & 0x01;
            const destIdx = y * width + px;
            indexedPixels[destIdx] = colIdx;
            const c = palette[colIdx % palette.length] || [0, 0, 0];
            rgbaData[destIdx * 4] = c[0];
            rgbaData[destIdx * 4 + 1] = c[1];
            rgbaData[destIdx * 4 + 2] = c[2];
            rgbaData[destIdx * 4 + 3] = 255;
          }
        }
      }
    }
  } else if (mode.bitDepth === 4) {
    // 4-bit nibbles (possibly with 4-byte header)
    const headerBytes = (payload.length > 4 && (payload[0] | (payload[1] << 8)) > 0) ? 4 : 0;
    let byteIdx = headerBytes;

    for (let i = 0; i < totalPixels; i += 2) {
      const byteVal = byteIdx < payload.length ? payload[byteIdx++] : 0;
      const p0 = (byteVal >> 4) & 0x0F;
      const p1 = byteVal & 0x0F;

      indexedPixels[i] = p0;
      const c0 = palette[p0 % palette.length] || [0, 0, 0];
      rgbaData[i * 4] = c0[0];
      rgbaData[i * 4 + 1] = c0[1];
      rgbaData[i * 4 + 2] = c0[2];
      rgbaData[i * 4 + 3] = 255;

      if (i + 1 < totalPixels) {
        indexedPixels[i + 1] = p1;
        const c1 = palette[p1 % palette.length] || [0, 0, 0];
        rgbaData[(i + 1) * 4] = c1[0];
        rgbaData[(i + 1) * 4 + 1] = c1[1];
        rgbaData[(i + 1) * 4 + 2] = c1[2];
        rgbaData[(i + 1) * 4 + 3] = 255;
      }
    }
  } else {
    // 1-bit linear (SCREEN 11)
    const bytesPerLine = Math.ceil(width / 8);
    for (let y = 0; y < height; y++) {
      const lineStart = y * bytesPerLine;
      for (let bx = 0; bx < bytesPerLine; bx++) {
        const byteVal = (lineStart + bx < payload.length) ? payload[lineStart + bx] : 0;
        for (let p = 0; p < 8; p++) {
          const px = bx * 8 + p;
          if (px < width) {
            const shift = 7 - p;
            const colIdx = (byteVal >> shift) & 0x01;
            const destIdx = y * width + px;
            indexedPixels[destIdx] = colIdx;
            const c = palette[colIdx % palette.length] || [0, 0, 0];
            rgbaData[destIdx * 4] = c[0];
            rgbaData[destIdx * 4 + 1] = c[1];
            rgbaData[destIdx * 4 + 2] = c[2];
            rgbaData[destIdx * 4 + 3] = 255;
          }
        }
      }
    }
  }

  return {
    hasValidHeader,
    segment,
    segmentHex: '&H' + segment.toString(16).toUpperCase().padStart(4, '0'),
    offset,
    offsetHex: '&H' + offset.toString(16).toUpperCase().padStart(4, '0'),
    declaredLength,
    actualPayloadLength: payload.length,
    inferredMode: mode,
    width,
    height,
    indexedPixels,
    rgbaData,
    palette
  };
}
