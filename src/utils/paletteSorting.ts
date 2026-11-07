import { RGBColor } from '../types/bsave';
import { toVgaDac, fromVgaDac } from './palettes';

export type PaletteSortCriterion = 'original' | 'hue' | 'saturation' | 'brightness';
export type PaletteSortDirection = 'asc' | 'desc';

/**
 * Calculates Hue angle in degrees (0 to 360).
 */
export function getRGBHue(color: RGBColor): number {
  const r = color[0] / 255;
  const g = color[1] / 255;
  const b = color[2] / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  if (d === 0) return 0; // Achromatic / Grayscale

  let h = 0;
  if (max === r) {
    h = ((g - b) / d) % 6;
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
}

/**
 * Calculates HSL Saturation (0.0 to 1.0).
 */
export function getRGBSaturation(color: RGBColor): number {
  const r = color[0] / 255;
  const g = color[1] / 255;
  const b = color[2] / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) return 0; // Grayscale
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/**
 * Calculates Perceptual Luminance / Brightness (0 to 255) using CRT Rec.601 standard.
 */
export function getRGBBrightness(color: RGBColor): number {
  return 0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2];
}

/**
 * Normalizes an 8-bit RGB color to valid IBM VGA DAC 6-bit hardware channel levels.
 * The VGA DAC hardware (INMOS INM G171) only holds 6 bits per channel (values 0 to 63).
 * This maps each channel to 0-63, then scales precisely back to 0-255 using (val * 255) / 63.
 */
export function normalizeColorToVga6Bit(color: RGBColor): RGBColor {
  const [r6, g6, b6] = toVgaDac(color);
  return fromVgaDac(r6, g6, b6);
}

/**
 * Normalizes an entire palette array to valid VGA 6-bit DAC channel steps.
 */
export function normalizePaletteToVga6Bit(palette: RGBColor[]): RGBColor[] {
  return palette.map(normalizeColorToVga6Bit);
}

/**
 * Checks if a color already complies with valid VGA 6-bit DAC levels.
 */
export function isColorVga6BitNormalized(color: RGBColor): boolean {
  const norm = normalizeColorToVga6Bit(color);
  return norm[0] === color[0] && norm[1] === color[1] && norm[2] === color[2];
}

/**
 * Checks if all colors in a palette are 6-bit VGA compliant.
 */
export function isPaletteVga6BitNormalized(palette: RGBColor[]): boolean {
  return palette.every(isColorVga6BitNormalized);
}

/**
 * Sorts a palette by Hue, Saturation, or Brightness.
 */
export function sortPalette(
  palette: RGBColor[],
  criterion: PaletteSortCriterion,
  direction: PaletteSortDirection = 'asc',
  normalize6Bit: boolean = false
): RGBColor[] {
  let workingPalette = normalize6Bit ? normalizePaletteToVga6Bit(palette) : [...palette];

  if (criterion === 'original') {
    return workingPalette;
  }

  const items = workingPalette.map((color, originalIndex) => {
    let metric = 0;
    if (criterion === 'hue') {
      metric = getRGBHue(color);
      // Secondary sort by brightness so same-hue colors line up smoothly
      const secMetric = getRGBBrightness(color);
      return { color, originalIndex, metric, secMetric };
    } else if (criterion === 'saturation') {
      metric = getRGBSaturation(color);
      const secMetric = getRGBBrightness(color);
      return { color, originalIndex, metric, secMetric };
    } else {
      // brightness
      metric = getRGBBrightness(color);
      const secMetric = getRGBHue(color);
      return { color, originalIndex, metric, secMetric };
    }
  });

  items.sort((a, b) => {
    let diff = a.metric - b.metric;
    if (diff === 0) {
      diff = a.secMetric - b.secMetric;
    }
    return direction === 'asc' ? diff : -diff;
  });

  return items.map(item => item.color);
}
