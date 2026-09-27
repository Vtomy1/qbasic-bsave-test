export type BitDepth = 1 | 2 | 4 | 8;

export type ScreenModeId = 
  | 'SCREEN_1'   // 320x200, 2-bit (4 colors CGA)
  | 'SCREEN_2'   // 640x200, 1-bit (Monochrome CGA/EGA/VGA)
  | 'SCREEN_7'   // 320x200, 4-bit (16 colors EGA/VGA)
  | 'SCREEN_9'   // 640x350, 4-bit (16 colors EGA/VGA)
  | 'SCREEN_11'  // 640x480, 1-bit (Monochrome VGA)
  | 'SCREEN_12'  // 640x480, 4-bit (16 colors VGA)
  | 'SCREEN_13';  // 320x200, 8-bit (256 colors VGA)

export type DitherAlgorithm = 
  | 'none'
  | 'floyd_steinberg'
  | 'atkinson'
  | 'bayer_2x2'
  | 'bayer_4x4'
  | 'bayer_8x8'
  | 'sierra'
  | 'sierra_lite'
  | 'burkes'
  | 'jarvis_judice_ninke';

export type AspectRatioMode = 'stretch' | 'fit' | 'fill';

export type LoaderTechnique = 
  | 'vram_direct'      // DEF SEG = &HA000 : BLOAD
  | 'array_put'        // DIM img() : BLOAD ... : PUT (x,y), img, PSET
  | 'file_get'         // OPEN FOR BINARY : GET #1
  | 'data_statements'; // Standalone .BAS with DATA statements

export type Dialect = 'qbasic11' | 'quickbasic45' | 'qb64';

export interface ScreenModeConfig {
  id: ScreenModeId;
  name: string;
  qbMode: number;
  width: number;
  height: number;
  bitDepth: BitDepth;
  colorsCount: number;
  description: string;
  defaultSegment: number; // e.g. 0xA000 or 0xB800
  pixelAspectRatio: number; // e.g. 1.2 for 320x200 to display in 4:3
  memoryLayout: 'linear' | 'cga_interleaved' | 'planar_ega' | 'array_packed';
}

export type RGBColor = [number, number, number];

export interface PaletteInfo {
  id: string;
  name: string;
  description: string;
  colors: RGBColor[];
  bitDepth: BitDepth;
  isCustom?: boolean;
}

export interface ImageAdjustments {
  brightness: number;  // -100 to 100 (0 default)
  contrast: number;    // -100 to 100 (0 default)
  gamma: number;       // 0.5 to 2.5 (1.0 default)
  ditherStrength: number; // 0 to 100 (100 default)
  invert: boolean;
}

export interface BSAVEFileHeader {
  marker: number;      // 0xFD
  segment: number;     // 16-bit uint (e.g. 0xA000)
  offset: number;      // 16-bit uint (e.g. 0x0000)
  dataLength: number;  // 16-bit uint
}

export interface BSAVEData {
  header: BSAVEFileHeader;
  bytes: Uint8Array;
  width: number;
  height: number;
  mode: ScreenModeConfig;
  palette: RGBColor[];
}

export interface PixelInspection {
  x: number;
  y: number;
  colorIndex: number;
  rgb: RGBColor;
  dac6Bit: [number, number, number];
  hex: string;
}
