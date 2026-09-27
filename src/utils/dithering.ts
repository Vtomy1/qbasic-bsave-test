import { RGBColor, DitherAlgorithm, ImageAdjustments } from '../types/bsave';

// Perceptual color distance using redmean formula
export function colorDistanceSquared(c1: RGBColor, c2: RGBColor): number {
  const rMean = (c1[0] + c2[0]) / 2;
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return (
    (2 + rMean / 256) * dr * dr +
    4.0 * dg * dg +
    (2 + (255 - rMean) / 256) * db * db
  );
}

// Find nearest color in palette
export function findNearestColorIndex(color: RGBColor, palette: RGBColor[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const d = colorDistanceSquared(color, palette[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
      if (d === 0) break; // Exact match
    }
  }

  return bestIdx;
}

// Bayer matrices for ordered dithering
const BAYER_2X2 = [
  [0, 2],
  [3, 1]
];

const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

// Apply image pre-adjustments (brightness, contrast, gamma, invert)
export function applyAdjustments(
  r: number,
  g: number,
  b: number,
  adjustments: ImageAdjustments
): RGBColor {
  if (adjustments.invert) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }

  // Brightness (-100 to 100)
  if (adjustments.brightness !== 0) {
    const bAdd = adjustments.brightness * 2.55;
    r += bAdd;
    g += bAdd;
    b += bAdd;
  }

  // Contrast (-100 to 100)
  if (adjustments.contrast !== 0) {
    const factor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;
  }

  // Gamma (0.5 to 2.5)
  if (adjustments.gamma !== 1.0) {
    const invGamma = 1.0 / adjustments.gamma;
    r = 255 * Math.pow(Math.max(0, r) / 255, invGamma);
    g = 255 * Math.pow(Math.max(0, g) / 255, invGamma);
    b = 255 * Math.pow(Math.max(0, b) / 255, invGamma);
  }

  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b))
  ];
}

export interface DitherResult {
  indexedPixels: Uint8Array; // size width * height
  rgbaData: Uint8ClampedArray; // size width * height * 4
  width: number;
  height: number;
}

export function processAndDitherImage(
  sourceImageData: ImageData,
  targetWidth: number,
  targetHeight: number,
  palette: RGBColor[],
  algorithm: DitherAlgorithm,
  adjustments: ImageAdjustments
): DitherResult {
  const srcW = sourceImageData.width;
  const srcH = sourceImageData.height;
  const srcData = sourceImageData.data;

  // 1. Bilinear or nearest-neighbor resize source to targetWidth x targetHeight
  // We use bilinear resampling for smooth downscaling
  const floatBuffer = new Float32Array(targetWidth * targetHeight * 3);

  const xRatio = srcW / targetWidth;
  const yRatio = srcH / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;

      const xFloor = Math.floor(srcX);
      const yFloor = Math.floor(srcY);
      const xCeil = Math.min(srcW - 1, Math.ceil(srcX));
      const yCeil = Math.min(srcH - 1, Math.ceil(srcY));

      const xWeight = srcX - xFloor;
      const yWeight = srcY - yFloor;

      const idx00 = (yFloor * srcW + xFloor) * 4;
      const idx10 = (yFloor * srcW + xCeil) * 4;
      const idx01 = (yCeil * srcW + xFloor) * 4;
      const idx11 = (yCeil * srcW + xCeil) * 4;

      // Sample and interpolate RGB
      for (let c = 0; c < 3; c++) {
        const top = srcData[idx00 + c] * (1 - xWeight) + srcData[idx10 + c] * xWeight;
        const bottom = srcData[idx01 + c] * (1 - xWeight) + srcData[idx11 + c] * xWeight;
        const val = top * (1 - yWeight) + bottom * yWeight;
        
        const destIdx = (y * targetWidth + x) * 3 + c;
        floatBuffer[destIdx] = val;
      }

      // Pre-apply color adjustments
      const destIdx = (y * targetWidth + x) * 3;
      const [adjR, adjG, adjB] = applyAdjustments(
        floatBuffer[destIdx],
        floatBuffer[destIdx + 1],
        floatBuffer[destIdx + 2],
        adjustments
      );
      floatBuffer[destIdx] = adjR;
      floatBuffer[destIdx + 1] = adjG;
      floatBuffer[destIdx + 2] = adjB;
    }
  }

  const totalPixels = targetWidth * targetHeight;
  const indexedPixels = new Uint8Array(totalPixels);
  const rgbaData = new Uint8ClampedArray(totalPixels * 4);

  const strength = adjustments.ditherStrength / 100;

  // 2. Dithering
  if (algorithm === 'none' || strength === 0) {
    // Pure nearest color
    for (let i = 0; i < totalPixels; i++) {
      const r = floatBuffer[i * 3];
      const g = floatBuffer[i * 3 + 1];
      const b = floatBuffer[i * 3 + 2];

      const bestIdx = findNearestColorIndex([r, g, b], palette);
      indexedPixels[i] = bestIdx;

      const chosen = palette[bestIdx];
      rgbaData[i * 4] = chosen[0];
      rgbaData[i * 4 + 1] = chosen[1];
      rgbaData[i * 4 + 2] = chosen[2];
      rgbaData[i * 4 + 3] = 255;
    }
  } else if (algorithm.startsWith('bayer_')) {
    // Ordered Bayer Dithering
    let matrix: number[][];
    let mSize: number;
    let maxVal: number;

    if (algorithm === 'bayer_2x2') {
      matrix = BAYER_2X2;
      mSize = 2;
      maxVal = 4;
    } else if (algorithm === 'bayer_8x8') {
      matrix = BAYER_8X8;
      mSize = 8;
      maxVal = 64;
    } else {
      matrix = BAYER_4X4;
      mSize = 4;
      maxVal = 16;
    }

    // Spread factor based on palette size: smaller palettes need more spread
    const spread = (255 / Math.max(2, Math.cbrt(palette.length))) * strength;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const i = y * targetWidth + x;
        const bayerVal = (matrix[y % mSize][x % mSize] / maxVal) - 0.5;
        const offset = bayerVal * spread;

        const r = Math.max(0, Math.min(255, floatBuffer[i * 3] + offset));
        const g = Math.max(0, Math.min(255, floatBuffer[i * 3 + 1] + offset));
        const b = Math.max(0, Math.min(255, floatBuffer[i * 3 + 2] + offset));

        const bestIdx = findNearestColorIndex([r, g, b], palette);
        indexedPixels[i] = bestIdx;

        const chosen = palette[bestIdx];
        rgbaData[i * 4] = chosen[0];
        rgbaData[i * 4 + 1] = chosen[1];
        rgbaData[i * 4 + 2] = chosen[2];
        rgbaData[i * 4 + 3] = 255;
      }
    }
  } else {
    // Error Diffusion Dithering (Floyd-Steinberg, Atkinson, Sierra, Sierra-Lite, Burkes, Jarvis-Judice-Ninke)
    // Helper to diffuse error to target pixel
    const diffuse = (px: number, py: number, er: number, eg: number, eb: number, factor: number) => {
      if (px < 0 || px >= targetWidth || py < 0 || py >= targetHeight) return;
      const pIdx = (py * targetWidth + px) * 3;
      floatBuffer[pIdx] += er * factor * strength;
      floatBuffer[pIdx + 1] += eg * factor * strength;
      floatBuffer[pIdx + 2] += eb * factor * strength;
    };

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const i = y * targetWidth + x;
        const r = Math.max(0, Math.min(255, floatBuffer[i * 3]));
        const g = Math.max(0, Math.min(255, floatBuffer[i * 3 + 1]));
        const b = Math.max(0, Math.min(255, floatBuffer[i * 3 + 2]));

        const bestIdx = findNearestColorIndex([r, g, b], palette);
        indexedPixels[i] = bestIdx;

        const chosen = palette[bestIdx];
        rgbaData[i * 4] = chosen[0];
        rgbaData[i * 4 + 1] = chosen[1];
        rgbaData[i * 4 + 2] = chosen[2];
        rgbaData[i * 4 + 3] = 255;

        const errR = r - chosen[0];
        const errG = g - chosen[1];
        const errB = b - chosen[2];

        switch (algorithm) {
          case 'floyd_steinberg':
            diffuse(x + 1, y, errR, errG, errB, 7 / 16);
            diffuse(x - 1, y + 1, errR, errG, errB, 3 / 16);
            diffuse(x, y + 1, errR, errG, errB, 5 / 16);
            diffuse(x + 1, y + 1, errR, errG, errB, 1 / 16);
            break;

          case 'atkinson':
            diffuse(x + 1, y, errR, errG, errB, 1 / 8);
            diffuse(x + 2, y, errR, errG, errB, 1 / 8);
            diffuse(x - 1, y + 1, errR, errG, errB, 1 / 8);
            diffuse(x, y + 1, errR, errG, errB, 1 / 8);
            diffuse(x + 1, y + 1, errR, errG, errB, 1 / 8);
            diffuse(x, y + 2, errR, errG, errB, 1 / 8);
            break;

          case 'sierra':
            diffuse(x + 1, y, errR, errG, errB, 5 / 32);
            diffuse(x + 2, y, errR, errG, errB, 3 / 32);
            diffuse(x - 2, y + 1, errR, errG, errB, 2 / 32);
            diffuse(x - 1, y + 1, errR, errG, errB, 4 / 32);
            diffuse(x, y + 1, errR, errG, errB, 5 / 32);
            diffuse(x + 1, y + 1, errR, errG, errB, 4 / 32);
            diffuse(x + 2, y + 1, errR, errG, errB, 2 / 32);
            diffuse(x - 1, y + 2, errR, errG, errB, 2 / 32);
            diffuse(x, y + 2, errR, errG, errB, 3 / 32);
            diffuse(x + 1, y + 2, errR, errG, errB, 2 / 32);
            break;

          case 'sierra_lite':
            diffuse(x + 1, y, errR, errG, errB, 2 / 4);
            diffuse(x - 1, y + 1, errR, errG, errB, 1 / 4);
            diffuse(x, y + 1, errR, errG, errB, 1 / 4);
            break;

          case 'burkes':
            diffuse(x + 1, y, errR, errG, errB, 8 / 32);
            diffuse(x + 2, y, errR, errG, errB, 4 / 32);
            diffuse(x - 2, y + 1, errR, errG, errB, 2 / 32);
            diffuse(x - 1, y + 1, errR, errG, errB, 4 / 32);
            diffuse(x, y + 1, errR, errG, errB, 8 / 32);
            diffuse(x + 1, y + 1, errR, errG, errB, 4 / 32);
            diffuse(x + 2, y + 1, errR, errG, errB, 2 / 32);
            break;

          case 'jarvis_judice_ninke':
            diffuse(x + 1, y, errR, errG, errB, 7 / 48);
            diffuse(x + 2, y, errR, errG, errB, 5 / 48);
            diffuse(x - 2, y + 1, errR, errG, errB, 3 / 48);
            diffuse(x - 1, y + 1, errR, errG, errB, 5 / 48);
            diffuse(x, y + 1, errR, errG, errB, 7 / 48);
            diffuse(x + 1, y + 1, errR, errG, errB, 5 / 48);
            diffuse(x + 2, y + 1, errR, errG, errB, 3 / 48);
            diffuse(x - 2, y + 2, errR, errG, errB, 1 / 48);
            diffuse(x - 1, y + 2, errR, errG, errB, 3 / 48);
            diffuse(x, y + 2, errR, errG, errB, 5 / 48);
            diffuse(x + 1, y + 2, errR, errG, errB, 3 / 48);
            diffuse(x + 2, y + 2, errR, errG, errB, 1 / 48);
            break;
        }
      }
    }
  }

  return {
    indexedPixels,
    rgbaData,
    width: targetWidth,
    height: targetHeight
  };
}
