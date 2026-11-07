import { RGBColor, ScreenModeConfig } from '../types/bsave';
import { toVgaDac } from './palettes';

export type VgaExportFormat = 'direct_out' | 'compact_data' | 'subroutine';

export interface VgaExportOptions {
  format: VgaExportFormat;
  startIndex: number;
  endIndex: number;
  includeComments: boolean;
  mode: ScreenModeConfig;
  imageName: string;
}

/**
 * Generates valid MS-DOS QBasic / QuickBASIC code setting the VGA palette
 * using hardware ports &H3C8 and &H3C9.
 */
export function generateVgaPortSetupCode(
  palette: RGBColor[],
  options: VgaExportOptions
): string {
  const { format, startIndex, endIndex, includeComments, mode, imageName } = options;
  const safeStart = Math.max(0, Math.min(startIndex, palette.length - 1));
  const safeEnd = Math.max(safeStart, Math.min(endIndex, palette.length - 1));
  const totalColors = safeEnd - safeStart + 1;
  const baseName = imageName.replace(/\.[^/.]+$/, '').toUpperCase();

  const header = `' =========================================================================
' FILE:        ${baseName}_PALETTE.BAS
' TARGET:      MS-DOS QBasic 1.1 / QuickBASIC 4.5 / QB64
' HARDWARE:    IBM PS/2 VGA DAC Registers (INMOS INM G171)
' PORTS:       Port &H3C8 = Write Index Register (0 to 255)
'              Port &H3C9 = Color Data Register (Red, Green, Blue in 0 to 63)
' RANGE:       Color Indices ${safeStart} to ${safeEnd} (${totalColors} Colors)
' =========================================================================\n\n`;

  if (format === 'direct_out') {
    let out = header;
    out += `' 1. Set screen mode (SCREEN 13 is VGA 320x200 256 colors)\n`;
    out += `SCREEN ${mode.qbMode}\n`;
    out += `CLS\n\n`;

    out += `' 2. Initialize starting DAC color index at port &H3C8\n`;
    out += `OUT &H3C8, ${safeStart}\n\n`;

    out += `' 3. Stream RGB DAC values into port &H3C9\n`;
    out += `' Note: The VGA DAC hardware automatically auto-increments to the next\n`;
    out += `' color index after every 3 consecutive writes (Red, Green, Blue)!\n`;
    out += `' Channels are 6-bit values from 0 to 63 (divide 8-bit RGB by 4).\n\n`;

    for (let i = safeStart; i <= safeEnd; i++) {
      const color = palette[i] || [0, 0, 0];
      const [r6, g6, b6] = toVgaDac(color);
      const hex = '#' + color.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

      const rStr = r6.toString().padStart(2, ' ');
      const gStr = g6.toString().padStart(2, ' ');
      const bStr = b6.toString().padStart(2, ' ');

      if (includeComments) {
        out += `OUT &H3C9, ${rStr}: OUT &H3C9, ${gStr}: OUT &H3C9, ${bStr}    ' Color ${i.toString().padStart(3, ' ')}: RGB(${color[0]}, ${color[1]}, ${color[2]}) ${hex}\n`;
      } else {
        out += `OUT &H3C9, ${rStr}: OUT &H3C9, ${gStr}: OUT &H3C9, ${bStr}\n`;
      }
    }

    out += `\nPRINT "VGA palette loaded (${totalColors} colors)! Press any key to exit...";\n`;
    out += `WHILE INKEY$ = "": WEND\n`;
    out += `SCREEN 0: WIDTH 80: CLS\n`;
    out += `END\n`;

    return out;
  }

  if (format === 'compact_data') {
    let out = header;
    out += `' Initialize screen mode\n`;
    out += `SCREEN ${mode.qbMode}\n`;
    out += `CLS\n\n`;

    out += `' Call palette setup routine\n`;
    out += `GOSUB SetVgaPalette\n\n`;

    out += `PRINT "Palette loaded via RESTORE / READ / OUT loop! Press any key...";\n`;
    out += `WHILE INKEY$ = "": WEND\n`;
    out += `SCREEN 0: WIDTH 80: CLS\n`;
    out += `END\n\n`;

    out += `' =========================================================================\n`;
    out += `' SUBROUTINE: SetVgaPalette\n`;
    out += `' Sets color indices ${safeStart} to ${safeEnd} using ports &H3C8 and &H3C9\n`;
    out += `' =========================================================================\n`;
    out += `SetVgaPalette:\n`;
    out += `    OUT &H3C8, ${safeStart}        ' Set starting palette index\n`;
    out += `    RESTORE VgaPaletteData\n`;
    out += `    FOR i% = ${safeStart} TO ${safeEnd}\n`;
    out += `        READ r6%, g6%, b6%\n`;
    out += `        OUT &H3C9, r6%         ' Red channel (0 to 63)\n`;
    out += `        OUT &H3C9, g6%         ' Green channel (0 to 63)\n`;
    out += `        OUT &H3C9, b6%         ' Blue channel (0 to 63)\n`;
    out += `    NEXT i%\n`;
    out += `    RETURN\n\n`;

    out += `' VGA 6-bit DAC values (0 to 63 per channel)\n`;
    out += `VgaPaletteData:\n`;

    const colorsPerLine = 4;
    for (let i = safeStart; i <= safeEnd; i += colorsPerLine) {
      const parts: string[] = [];
      const commentIndices: string[] = [];

      for (let j = 0; j < colorsPerLine && (i + j) <= safeEnd; j++) {
        const idx = i + j;
        const color = palette[idx] || [0, 0, 0];
        const [r6, g6, b6] = toVgaDac(color);
        parts.push(`${r6},${g6},${b6}`);
        commentIndices.push(`${idx}`);
      }

      if (includeComments) {
        out += `DATA ${parts.join(', ')}    ' Colors ${commentIndices.join(', ')}\n`;
      } else {
        out += `DATA ${parts.join(', ')}\n`;
      }
    }

    return out;
  }

  // format === 'subroutine' (QuickBASIC SUB)
  let out = header;
  out += `DECLARE SUB SetCustomPalette ()\n\n`;
  out += `SCREEN ${mode.qbMode}\n`;
  out += `CLS\n\n`;
  out += `' Call subroutine\n`;
  out += `CALL SetCustomPalette\n\n`;
  out += `PRINT "Custom VGA DAC palette programmed! Press any key...";\n`;
  out += `WHILE INKEY$ = "": WEND\n`;
  out += `SCREEN 0: WIDTH 80: CLS\n`;
  out += `END\n\n`;

  out += `SUB SetCustomPalette\n`;
  out += `    OUT &H3C8, ${safeStart}        ' Start index register\n`;
  out += `    RESTORE PaletteTable\n`;
  out += `    FOR i% = ${safeStart} TO ${safeEnd}\n`;
  out += `        READ r%, g%, b%\n`;
  out += `        OUT &H3C9, r%\n`;
  out += `        OUT &H3C9, g%\n`;
  out += `        OUT &H3C9, b%\n`;
  out += `    NEXT i%\n`;
  out += `END SUB\n\n`;

  out += `PaletteTable:\n`;
  const colorsPerLine = 4;
  for (let i = safeStart; i <= safeEnd; i += colorsPerLine) {
    const parts: string[] = [];
    const commentIndices: string[] = [];

    for (let j = 0; j < colorsPerLine && (i + j) <= safeEnd; j++) {
      const idx = i + j;
      const color = palette[idx] || [0, 0, 0];
      const [r6, g6, b6] = toVgaDac(color);
      parts.push(`${r6},${g6},${b6}`);
      commentIndices.push(`${idx}`);
    }

    if (includeComments) {
      out += `DATA ${parts.join(', ')}    ' [${commentIndices[0]}-${commentIndices[commentIndices.length - 1]}]\n`;
    } else {
      out += `DATA ${parts.join(', ')}\n`;
    }
  }

  return out;
}
