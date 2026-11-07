import { RGBColor, ScreenModeConfig } from '../types/bsave';
import { toVgaDac } from './palettes';

export interface CyclingPreset {
  id: string;
  name: string;
  description: string;
  start: number;
  end: number;
  speedFps: number;
  direction: 'forward' | 'reverse';
  iconName: 'waves' | 'flame' | 'zap' | 'palette' | 'sparkles';
}

/**
 * Rotates a contiguous range of colors [startIndex, endIndex] within a palette array.
 * Offset > 0 shifts colors towards higher indices (forward/clockwise).
 */
export function rotatePaletteRange(
  basePalette: RGBColor[],
  startIndex: number,
  endIndex: number,
  offset: number
): RGBColor[] {
  if (
    !basePalette ||
    basePalette.length === 0 ||
    startIndex < 0 ||
    endIndex >= basePalette.length ||
    startIndex >= endIndex
  ) {
    return basePalette;
  }

  const result = [...basePalette];
  const len = endIndex - startIndex + 1;
  // Normalize offset within [0, len - 1]
  const normalizedOffset = ((offset % len) + len) % len;
  if (normalizedOffset === 0) return result;

  const slice = basePalette.slice(startIndex, endIndex + 1);

  for (let i = 0; i < len; i++) {
    // In forward rotation, index i gets the color from (i - offset)
    const srcIdx = (i - normalizedOffset + len) % len;
    result[startIndex + i] = slice[srcIdx];
  }

  return result;
}

/**
 * Provides curated retro cycling presets based on the current screen mode and palette size.
 */
export function getCyclingPresetsForMode(
  mode: ScreenModeConfig,
  paletteLength: number
): CyclingPreset[] {
  if (mode.bitDepth === 8) {
    // 256-color VGA Mode 13h
    return [
      {
        id: 'waterfall_river',
        name: 'Waterfall & Stream',
        description: 'Smooth cascading water flow (indices 16–31 grayscale or blue hue ramp).',
        start: 16,
        end: 31,
        speedFps: 15,
        direction: 'forward',
        iconName: 'waves'
      },
      {
        id: 'torch_campfire',
        name: 'Campfire & Torches',
        description: 'Flickering fiery flame colors (classic LucasArts adventure game style).',
        start: 24,
        end: 31,
        speedFps: 10,
        direction: 'reverse',
        iconName: 'flame'
      },
      {
        id: 'cyber_neon',
        name: 'Neon Marquee / Pulse',
        description: 'Rapid electronic oscillation across glowing monitor indices.',
        start: 32,
        end: 47,
        speedFps: 24,
        direction: 'forward',
        iconName: 'zap'
      },
      {
        id: 'full_cycle',
        name: 'Full 256 VGA Loop',
        description: 'Continuous chromatic rotation through all 256 DAC color registers.',
        start: 0,
        end: Math.min(255, paletteLength - 1),
        speedFps: 20,
        direction: 'forward',
        iconName: 'palette'
      }
    ];
  }

  if (mode.bitDepth === 4) {
    // 16-color EGA/VGA Mode (SCREEN 7 / 9 / 12)
    return [
      {
        id: 'ega_high_intensity',
        name: 'Bright Tones Cycle',
        description: 'Rotates bright colors (indices 8–15) for glowing magical effects.',
        start: 8,
        end: 15,
        speedFps: 12,
        direction: 'forward',
        iconName: 'sparkles'
      },
      {
        id: 'ega_rainbow',
        name: 'Classic 16 Rainbow',
        description: 'Full EGA palette rotation across all non-black colors (1–15).',
        start: 1,
        end: 15,
        speedFps: 8,
        direction: 'forward',
        iconName: 'palette'
      },
      {
        id: 'ega_torch',
        name: 'Torch Flicker',
        description: 'Warm brown to yellow to white cycle (indices 6, 12, 14, 15).',
        start: 12,
        end: 15,
        speedFps: 10,
        direction: 'reverse',
        iconName: 'flame'
      }
    ];
  }

  if (mode.bitDepth === 2) {
    // 4-color CGA Mode (SCREEN 1)
    return [
      {
        id: 'cga_cycle',
        name: 'CGA 3-Color Shift',
        description: 'Rotates foreground colors (indices 1–3: cyan, magenta, white) with static black.',
        start: 1,
        end: 3,
        speedFps: 6,
        direction: 'forward',
        iconName: 'zap'
      },
      {
        id: 'cga_all',
        name: 'Full CGA Rotation',
        description: 'Cycles all 4 CGA indices including background.',
        start: 0,
        end: 3,
        speedFps: 4,
        direction: 'forward',
        iconName: 'palette'
      }
    ];
  }

  // 1-bit Monochrome (SCREEN 2 / 11)
  return [
    {
      id: 'mono_blink',
      name: 'Phosphor Strobe',
      description: 'Alternates index 0 and 1 for retro CRT blink/alarm simulation.',
      start: 0,
      end: 1,
      speedFps: 4,
      direction: 'forward',
      iconName: 'zap'
    }
  ];
}

/**
 * Generates ready-to-run QBasic source code demonstrating the exact active palette cycle.
 */
export function generateQBasicPaletteCycleCode(
  mode: ScreenModeConfig,
  startIndex: number,
  endIndex: number,
  speedFps: number,
  direction: 'forward' | 'reverse',
  palette: RGBColor[],
  imageName: string
): string {
  const baseName = imageName.replace(/\.[^/.]+$/, '').toUpperCase();
  const bsvFilename = `${baseName}.BSV`;
  const isVga256 = mode.id === 'SCREEN_13';
  const cycleLen = Math.max(2, endIndex - startIndex + 1);
  const delayLoops = Math.max(200, Math.round(18000 / Math.max(1, speedFps)));

  if (isVga256) {
    return `' =========================================================================
' QBASIC VGA 256-COLOR PALETTE CYCLING DEMO (Mode 13h)
' Techniques pioneered by Sierra (King's Quest) & LucasArts (Monkey Island)
' Notice: Video memory (&HA000) is NEVER touched during animation!
' We only rotate the hardware DAC registers via I/O Ports &H3C8 and &H3C9.
' =========================================================================
SCREEN 13
CLS

' 1. Load the background image directly into VRAM
DEF SEG = &HA000
BLOAD "${bsvFilename}", 0
DEF SEG

' 2. Define the palette cycling range
CONST STARTCOL% = ${startIndex}
CONST ENDCOL%   = ${endIndex}
CONST CYCLELEN% = ${cycleLen}

' Store 6-bit DAC values (0 to 63) for the cycling range
DIM R(0 TO CYCLELEN% - 1) AS INTEGER
DIM G(0 TO CYCLELEN% - 1) AS INTEGER
DIM B(0 TO CYCLELEN% - 1) AS INTEGER

' 3. Read initial DAC register values from hardware port &H3C9
FOR i% = 0 TO CYCLELEN% - 1
    OUT &H3C7, STARTCOL% + i%  ' Tell DAC to prepare for color reading
    R(i%) = INP(&H3C9)         ' Red channel (0 to 63)
    G(i%) = INP(&H3C9)         ' Green channel (0 to 63)
    B(i%) = INP(&H3C9)         ' Blue channel (0 to 63)
NEXT i%

LOCATE 24, 1
PRINT "Palette cycling active! Press any key to stop...";

' 4. Real-time animation loop
DO
    ' Wait for CRT Vertical Blank to eliminate visual tearing and snow
    WAIT &H3DA, 8              ' Wait for vertical retrace start
    WAIT &H3DA, 8, 8           ' Wait for vertical retrace end

${
  direction === 'forward'
    ? `    ' Shift colors forward: save the last color and shift down
    tempR% = R(CYCLELEN% - 1)
    tempG% = G(CYCLELEN% - 1)
    tempB% = B(CYCLELEN% - 1)

    FOR i% = CYCLELEN% - 1 TO 1 STEP -1
        R(i%) = R(i% - 1)
        G(i%) = G(i% - 1)
        B(i%) = B(i% - 1)
    NEXT i%

    R(0) = tempR%
    G(0) = tempG%
    B(0) = tempB%`
    : `    ' Shift colors in reverse: save the first color and shift up
    tempR% = R(0)
    tempG% = G(0)
    tempB% = B(0)

    FOR i% = 0 TO CYCLELEN% - 2
        R(i%) = R(i% + 1)
        G(i%) = G(i% + 1)
        B(i%) = B(i% + 1)
    NEXT i%

    R(CYCLELEN% - 1) = tempR%
    G(CYCLELEN% - 1) = tempG%
    B(CYCLELEN% - 1) = tempB%`
}

    ' Write updated rotated palette directly to VGA DAC hardware port
    OUT &H3C8, STARTCOL%       ' Port &H3C8: Starting color index to write
    FOR i% = 0 TO CYCLELEN% - 1
        OUT &H3C9, R(i%)       ' Port &H3C9: Red (0-63)
        OUT &H3C9, G(i%)       ' Port &H3C9: Green (0-63)
        OUT &H3C9, B(i%)       ' Port &H3C9: Blue (0-63)
    NEXT i%

    ' Calibrated delay loop for ~${speedFps} FPS (tune for your CPU / DOSBox cycles)
    FOR delay& = 1 TO ${delayLoops}: NEXT delay&
LOOP WHILE INKEY$ = ""

SCREEN 0: WIDTH 80: CLS
END`;
  }

  // 16-color or EGA/CGA modes: use QBasic PALETTE statement
  return `' =========================================================================
' QBASIC 16-COLOR PALETTE CYCLING DEMO (${mode.name})
' Uses QBasic PALETTE statement to rotate color attributes instantaneously.
' =========================================================================
SCREEN ${mode.qbMode}
CLS

' Load background image
${
  mode.bitDepth === 2
    ? `' CGA Screen 1
DEF SEG = &HB800
BLOAD "${bsvFilename}", 0
DEF SEG`
    : `' EGA Screen 7/9/12
DEF SEG = &HA000
BLOAD "${bsvFilename}", 0
DEF SEG`
}

CONST STARTCOL% = ${startIndex}
CONST ENDCOL%   = ${endIndex}
CONST CYCLELEN% = ${cycleLen}

DIM Pal(0 TO CYCLELEN% - 1) AS INTEGER

' Initialize color attribute table
FOR i% = 0 TO CYCLELEN% - 1
    Pal(i%) = STARTCOL% + i%
NEXT i%

LOCATE 24, 1
PRINT "EGA/CGA Palette cycling active! Press any key to stop...";

DO
    WAIT &H3DA, 8              ' Vertical Retrace sync
    WAIT &H3DA, 8, 8

${
  direction === 'forward'
    ? `    temp% = Pal(CYCLELEN% - 1)
    FOR i% = CYCLELEN% - 1 TO 1 STEP -1
        Pal(i%) = Pal(i% - 1)
        PALETTE STARTCOL% + i%, Pal(i%)
    NEXT i%
    Pal(0) = temp%
    PALETTE STARTCOL%, temp%`
    : `    temp% = Pal(0)
    FOR i% = 0 TO CYCLELEN% - 2
        Pal(i%) = Pal(i% + 1)
        PALETTE STARTCOL% + i%, Pal(i%)
    NEXT i%
    Pal(CYCLELEN% - 1) = temp%
    PALETTE ENDCOL%, temp%`
}

    FOR delay& = 1 TO ${delayLoops}: NEXT delay&
LOOP WHILE INKEY$ = ""

SCREEN 0: WIDTH 80: CLS
END`;
}
