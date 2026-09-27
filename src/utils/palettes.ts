import { RGBColor, PaletteInfo, BitDepth } from '../types/bsave';

// Convert 8-bit RGB to 6-bit VGA DAC (0-63)
export function toVgaDac(c: RGBColor): [number, number, number] {
  return [Math.floor(c[0] / 4), Math.floor(c[1] / 4), Math.floor(c[2] / 4)];
}

// Convert 6-bit VGA DAC (0-63) back to 8-bit RGB (0-255)
export function fromVgaDac(r6: number, g6: number, b6: number): RGBColor {
  // DAC values are 0-63; in VGA DAC, 63 maps to 255 (multiply by 255/63 or (v << 2) | (v >> 4))
  return [
    Math.round((r6 * 255) / 63),
    Math.round((g6 * 255) / 63),
    Math.round((b6 * 255) / 63)
  ];
}

// 1-BIT PALETTES (2 colors)
export const PALETTE_1BIT_BW: RGBColor[] = [
  [0, 0, 0],       // Black (0)
  [255, 255, 255], // White (1)
];

export const PALETTE_1BIT_GREEN: RGBColor[] = [
  [0, 20, 0],      // Dark Background
  [51, 255, 51],   // P1 Green Phosphor
];

export const PALETTE_1BIT_AMBER: RGBColor[] = [
  [20, 10, 0],     // Dark Background
  [255, 176, 0],   // P3 Amber Phosphor
];

// 2-BIT CGA PALETTES (4 colors)
// CGA Palette 1, High Intensity (Cyan / Magenta / White)
export const PALETTE_2BIT_CGA1_HIGH: RGBColor[] = [
  [0, 0, 0],       // Black
  [85, 255, 255],  // Light Cyan
  [255, 85, 255],  // Light Magenta
  [255, 255, 255], // White
];

// CGA Palette 1, Low Intensity (Cyan / Magenta / Light Gray)
export const PALETTE_2BIT_CGA1_LOW: RGBColor[] = [
  [0, 0, 0],       // Black
  [0, 170, 170],   // Cyan
  [170, 0, 170],   // Magenta
  [170, 170, 170], // Light Gray
];

// CGA Palette 0, High Intensity (Green / Red / Yellow)
export const PALETTE_2BIT_CGA0_HIGH: RGBColor[] = [
  [0, 0, 0],       // Black
  [85, 255, 85],   // Light Green
  [255, 85, 85],   // Light Red
  [255, 255, 85],  // Yellow
];

// CGA Palette 0, Low Intensity (Green / Red / Brown)
export const PALETTE_2BIT_CGA0_LOW: RGBColor[] = [
  [0, 0, 0],       // Black
  [0, 170, 0],     // Green
  [170, 0, 0],     // Red
  [170, 85, 0],    // Brown
];

// CGA 4-Level Monochrome
export const PALETTE_2BIT_GRAY: RGBColor[] = [
  [0, 0, 0],       // Black
  [85, 85, 85],    // Dark Gray
  [170, 170, 170], // Light Gray
  [255, 255, 255], // White
];

// 4-BIT STANDARD IBM EGA / VGA 16-COLOR PALETTE
export const PALETTE_4BIT_EGA16: RGBColor[] = [
  [0, 0, 0],       // 0: Black
  [0, 0, 170],     // 1: Blue
  [0, 170, 0],     // 2: Green
  [0, 170, 170],   // 3: Cyan
  [170, 0, 0],     // 4: Red
  [170, 0, 170],   // 5: Magenta
  [170, 85, 0],    // 6: Brown
  [170, 170, 170], // 7: Light Gray
  [85, 85, 85],    // 8: Dark Gray
  [85, 85, 255],   // 9: Light Blue
  [85, 255, 85],   // 10: Light Green
  [85, 255, 255],  // 11: Light Cyan
  [255, 85, 85],   // 12: Light Red
  [255, 85, 255],  // 13: Light Magenta
  [255, 255, 85],  // 14: Yellow
  [255, 255, 255], // 15: Bright White
];

// 4-BIT 16-Shade Grayscale
export const PALETTE_4BIT_GRAY: RGBColor[] = Array.from({ length: 16 }, (_, i) => {
  const v = Math.round((i / 15) * 255);
  return [v, v, v];
});

// 8-BIT STANDARD VGA 256-COLOR PALETTE
// Generates the standard default VGA BIOS 256-color palette
export function getStandardVga256Palette(): RGBColor[] {
  const pal: RGBColor[] = [];
  
  // First 16 colors: standard EGA 16 colors
  for (let i = 0; i < 16; i++) {
    pal.push([...PALETTE_4BIT_EGA16[i]]);
  }

  // Next 16 colors: grayscale ramp (indices 16-31)
  for (let i = 0; i < 16; i++) {
    // 0 to 63 in VGA DAC
    const v6 = Math.floor((i / 15) * 63);
    pal.push(fromVgaDac(v6, v6, v6));
  }

  // Next 216 colors: 6x6x6 RGB color cube or hue ramps
  // Standard VGA DAC loads a 216 color ramp with 3 saturation levels and 24 hues each
  const hues = 24;
  const groups = [
    { lum: 63, sat: 63 }, // high brightness
    { lum: 42, sat: 42 }, // medium brightness
    { lum: 21, sat: 21 }, // low brightness
  ];

  for (const g of groups) {
    for (let h = 0; h < hues; h++) {
      if (pal.length >= 256) break;
      const angle = (h / hues) * 2 * Math.PI;
      const r = Math.max(0, Math.min(63, Math.round(g.lum + g.sat * Math.cos(angle))));
      const gCol = Math.max(0, Math.min(63, Math.round(g.lum + g.sat * Math.cos(angle - (2 * Math.PI / 3)))));
      const b = Math.max(0, Math.min(63, Math.round(g.lum + g.sat * Math.cos(angle - (4 * Math.PI / 3)))));
      pal.push(fromVgaDac(r, gCol, b));
    }
  }

  // Fill remainder with pure black if needed to reach exactly 256
  while (pal.length < 256) {
    pal.push([0, 0, 0]);
  }

  return pal.slice(0, 256);
}

// 8-BIT 256-Shade Grayscale
export function getGrayscale256Palette(): RGBColor[] {
  return Array.from({ length: 256 }, (_, i) => {
    const v6 = Math.floor((i / 255) * 63);
    return fromVgaDac(v6, v6, v6);
  });
}

// COLOR QUANTIZATION: Median-Cut Algorithm to produce optimal custom palette (16 or 256 colors)
interface ColorBox {
  colors: RGBColor[];
}

export function quantizePaletteMedianCut(imagePixels: RGBColor[], maxColors: number): RGBColor[] {
  if (imagePixels.length === 0) {
    return Array.from({ length: maxColors }, () => [0, 0, 0] as RGBColor);
  }

  // Sample down pixels if image is too large for fast median cut (max 50,000 samples)
  const step = Math.max(1, Math.floor(imagePixels.length / 50000));
  const sampled: RGBColor[] = [];
  for (let i = 0; i < imagePixels.length; i += step) {
    sampled.push(imagePixels[i]);
  }

  const boxes: ColorBox[] = [{ colors: sampled }];

  while (boxes.length < maxColors) {
    // Find the box with greatest range along any channel
    let bestBoxIdx = -1;
    let maxRange = -1;
    let splitChannel: 0 | 1 | 2 = 0;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.colors.length < 2) continue;

      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (const [r, g, b] of box.colors) {
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (g < minG) minG = g; if (g > maxG) maxG = g;
        if (b < minB) minB = b; if (b > maxB) maxB = b;
      }

      const rangeR = maxR - minR;
      const rangeG = maxG - minG;
      const rangeB = maxB - minB;
      const highest = Math.max(rangeR, rangeG, rangeB);

      if (highest > maxRange) {
        maxRange = highest;
        bestBoxIdx = i;
        splitChannel = highest === rangeR ? 0 : highest === rangeG ? 1 : 2;
      }
    }

    if (bestBoxIdx === -1 || maxRange === 0) break;

    const boxToSplit = boxes[bestBoxIdx];
    boxToSplit.colors.sort((a, b) => a[splitChannel] - b[splitChannel]);
    const median = Math.floor(boxToSplit.colors.length / 2);

    const box1: ColorBox = { colors: boxToSplit.colors.slice(0, median) };
    const box2: ColorBox = { colors: boxToSplit.colors.slice(median) };

    boxes.splice(bestBoxIdx, 1, box1, box2);
  }

  // Calculate average color for each box, and round to 6-bit VGA DAC resolution
  const result: RGBColor[] = boxes.map((box) => {
    if (box.colors.length === 0) return [0, 0, 0] as RGBColor;
    let sumR = 0, sumG = 0, sumB = 0;
    for (const [r, g, b] of box.colors) {
      sumR += r;
      sumG += g;
      sumB += b;
    }
    const len = box.colors.length;
    const avgR = Math.round(sumR / len);
    const avgG = Math.round(sumG / len);
    const avgB = Math.round(sumB / len);

    // Map to VGA 6-bit DAC values (0-63) then back to 8-bit to guarantee hardware fidelity
    const [r6, g6, b6] = toVgaDac([avgR, avgG, avgB]);
    return fromVgaDac(r6, g6, b6);
  });

  // Pad to maxColors if needed
  while (result.length < maxColors) {
    result.push([0, 0, 0]);
  }

  return result.slice(0, maxColors);
}

// Predefined palette library options
export function getPalettesForBitDepth(bitDepth: BitDepth): PaletteInfo[] {
  switch (bitDepth) {
    case 1:
      return [
        {
          id: '1bit_bw',
          name: 'Monochrome (B&W)',
          description: 'Standard 1-bit high-contrast black and white for SCREEN 2 / SCREEN 11.',
          colors: PALETTE_1BIT_BW,
          bitDepth: 1
        },
        {
          id: '1bit_green',
          name: 'P1 Green Phosphor',
          description: 'Classic monochrome green cathode ray CRT monitor look.',
          colors: PALETTE_1BIT_GREEN,
          bitDepth: 1
        },
        {
          id: '1bit_amber',
          name: 'P3 Amber Phosphor',
          description: 'Warm vintage amber monochrome terminal CRT phosphor.',
          colors: PALETTE_1BIT_AMBER,
          bitDepth: 1
        }
      ];

    case 2:
      return [
        {
          id: '2bit_cga1_high',
          name: 'CGA 1 High Intensity',
          description: 'Iconic 1981 IBM CGA: Black, Light Cyan, Light Magenta, White.',
          colors: PALETTE_2BIT_CGA1_HIGH,
          bitDepth: 2
        },
        {
          id: '2bit_cga1_low',
          name: 'CGA 1 Low Intensity',
          description: 'Muted 1981 IBM CGA: Black, Cyan, Magenta, Light Gray.',
          colors: PALETTE_2BIT_CGA1_LOW,
          bitDepth: 2
        },
        {
          id: '2bit_cga0_high',
          name: 'CGA 0 High Intensity',
          description: 'Vibrant CGA palette: Black, Light Green, Light Red, Yellow.',
          colors: PALETTE_2BIT_CGA0_HIGH,
          bitDepth: 2
        },
        {
          id: '2bit_cga0_low',
          name: 'CGA 0 Low Intensity',
          description: 'Earth-tone CGA: Black, Green, Red, Brown.',
          colors: PALETTE_2BIT_CGA0_LOW,
          bitDepth: 2
        },
        {
          id: '2bit_gray',
          name: 'CGA 4-Tone Grayscale',
          description: 'Clean 4-level monochrome gradient: Black, Dark Gray, Light Gray, White.',
          colors: PALETTE_2BIT_GRAY,
          bitDepth: 2
        }
      ];

    case 4:
      return [
        {
          id: '4bit_ega16',
          name: 'IBM EGA / VGA 16 Colors',
          description: 'Standard default 16-color palette for SCREEN 7, SCREEN 9, and SCREEN 12.',
          colors: PALETTE_4BIT_EGA16,
          bitDepth: 4
        },
        {
          id: '4bit_gray16',
          name: '16-Level Grayscale',
          description: '16 linear shades of monochrome gray for retro scan look.',
          colors: PALETTE_4BIT_GRAY,
          bitDepth: 4
        },
        {
          id: '4bit_custom',
          name: 'Custom 16 (Image Quantized)',
          description: 'Median-cut color reduction tuned specifically to this image.',
          colors: PALETTE_4BIT_EGA16, // Will be computed on load
          bitDepth: 4,
          isCustom: true
        }
      ];

    case 8:
      return [
        {
          id: '8bit_vga256',
          name: 'Standard IBM VGA 256 Colors',
          description: 'Default ROM palette for SCREEN 13 (EGA 16 + gray ramp + color cube).',
          colors: getStandardVga256Palette(),
          bitDepth: 8
        },
        {
          id: '8bit_custom256',
          name: 'Custom 256 (Image Quantized)',
          description: 'Optimal 256-color palette sampled directly from the input image with VGA DAC values.',
          colors: getStandardVga256Palette(), // Dynamically generated
          bitDepth: 8,
          isCustom: true
        },
        {
          id: '8bit_gray256',
          name: '256-Level Grayscale',
          description: 'Full 8-bit continuous monochrome ramp.',
          colors: getGrayscale256Palette(),
          bitDepth: 8
        }
      ];
  }
}
