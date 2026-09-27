import { ScreenModeConfig, ScreenModeId } from '../types/bsave';

export const SCREEN_MODES: Record<ScreenModeId, ScreenModeConfig> = {
  SCREEN_13: {
    id: 'SCREEN_13',
    name: 'SCREEN 13 (VGA)',
    qbMode: 13,
    width: 320,
    height: 200,
    bitDepth: 8,
    colorsCount: 256,
    description: 'VGA 320×200 256 colors. 1 byte/pixel, linear memory at &HA000. Exactly 64,000 bytes.',
    defaultSegment: 0xA000,
    pixelAspectRatio: 1.2, // 320x200 on 4:3 CRT has tall pixels (320/200 = 1.6, 4/3 = 1.333, ratio = 1.2)
    memoryLayout: 'linear'
  },
  SCREEN_1: {
    id: 'SCREEN_1',
    name: 'SCREEN 1 (CGA)',
    qbMode: 1,
    width: 320,
    height: 200,
    bitDepth: 2,
    colorsCount: 4,
    description: 'CGA 320×200 4 colors. 2 bits/pixel (4 pixels/byte), interlaced scanlines at &HB800.',
    defaultSegment: 0xB800,
    pixelAspectRatio: 1.2,
    memoryLayout: 'cga_interleaved'
  },
  SCREEN_2: {
    id: 'SCREEN_2',
    name: 'SCREEN 2 (CGA/EGA)',
    qbMode: 2,
    width: 640,
    height: 200,
    bitDepth: 1,
    colorsCount: 2,
    description: 'CGA/EGA 640×200 monochrome. 1 bit/pixel (8 pixels/byte), interlaced scanlines at &HB800.',
    defaultSegment: 0xB800,
    pixelAspectRatio: 2.4, // 640x200 on 4:3 monitor
    memoryLayout: 'cga_interleaved'
  },
  SCREEN_7: {
    id: 'SCREEN_7',
    name: 'SCREEN 7 (EGA)',
    qbMode: 7,
    width: 320,
    height: 200,
    bitDepth: 4,
    colorsCount: 16,
    description: 'EGA 320×200 16 colors. 4-bit nibble/planar/array at &HA000.',
    defaultSegment: 0xA000,
    pixelAspectRatio: 1.2,
    memoryLayout: 'array_packed'
  },
  SCREEN_9: {
    id: 'SCREEN_9',
    name: 'SCREEN 9 (EGA)',
    qbMode: 9,
    width: 640,
    height: 350,
    bitDepth: 4,
    colorsCount: 16,
    description: 'EGA 640×350 16 colors. High-res classic EGA mode.',
    defaultSegment: 0xA000,
    pixelAspectRatio: 1.37,
    memoryLayout: 'array_packed'
  },
  SCREEN_11: {
    id: 'SCREEN_11',
    name: 'SCREEN 11 (VGA Mono)',
    qbMode: 11,
    width: 640,
    height: 480,
    bitDepth: 1,
    colorsCount: 2,
    description: 'VGA 640×480 monochrome 2 colors. Square 1:1 pixels.',
    defaultSegment: 0xA000,
    pixelAspectRatio: 1.0,
    memoryLayout: 'linear'
  },
  SCREEN_12: {
    id: 'SCREEN_12',
    name: 'SCREEN 12 (VGA 16)',
    qbMode: 12,
    width: 640,
    height: 480,
    bitDepth: 4,
    colorsCount: 16,
    description: 'VGA 640×480 16 colors. Square 1:1 pixels at &HA000.',
    defaultSegment: 0xA000,
    pixelAspectRatio: 1.0,
    memoryLayout: 'array_packed'
  }
};

export const SCREEN_MODES_LIST = Object.values(SCREEN_MODES);
