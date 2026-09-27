import { ScreenModeConfig, RGBColor, LoaderTechnique, Dialect } from '../types/bsave';
import { toVgaDac } from './palettes';
import { generateDataStatements } from './bsaveEncoder';

export interface GeneratedCode {
  filename: string;
  sourceCode: string;
  explanation: string;
  dosboxInstructions: string;
}

export function generateQBasicCode(
  mode: ScreenModeConfig,
  palette: RGBColor[],
  indexedPixels: Uint8Array,
  filename: string,
  technique: LoaderTechnique,
  dialect: Dialect
): GeneratedCode {
  const baseName = filename.replace(/\.[^/.]+$/, '').toUpperCase();
  const bsvFilename = `${baseName}.BSV`;
  const palFilename = `${baseName}.PAL`;
  const basFilename = `${baseName}.BAS`;

  const segmentHex = '&H' + mode.defaultSegment.toString(16).toUpperCase().padStart(4, '0');
  const qbMode = mode.qbMode;
  const isVGA256 = mode.id === 'SCREEN_13';
  const hasCustomPalette = palette.length > 2 && (mode.bitDepth === 8 || mode.bitDepth === 4);

  let source = '';
  let explanation = '';

  // Header comment block
  source += `' =========================================================================\n`;
  source += `' FILE:        ${basFilename}\n`;
  source += `' TARGET:      ${dialect === 'qb64' ? 'QB64 / QB64-PE (64-bit DOS emulator)' : dialect === 'quickbasic45' ? 'Microsoft QuickBASIC 4.5 / 7.1 PDS' : 'MS-DOS QBasic 1.1'}\n`;
  source += `' GRAPHIC:     ${mode.name} (${mode.width}x${mode.height}, ${mode.bitDepth}-bit, ${mode.colorsCount} colors)\n`;
  source += `' TECHNIQUE:   ${technique === 'vram_direct' ? 'Direct Video RAM BLOAD' : technique === 'array_put' ? 'Graphic Array BLOAD & PUT' : technique === 'file_get' ? 'Binary File Stream Loader' : 'Self-Contained DATA Statements'}\n`;
  source += `' GENERATED:   ${new Date().toISOString().split('T')[0]}\n`;
  source += `' =========================================================================\n\n`;

  if (dialect === 'qb64') {
    source += `_TITLE "${baseName} - QBasic BSAVE Display"\n`;
  }

  // Technique 1: Direct Video RAM BLOAD (The classic DOS way)
  if (technique === 'vram_direct') {
    source += `' 1. Initialize screen mode\n`;
    source += `SCREEN ${qbMode}\n`;
    source += `CLS\n\n`;

    // Palette loading code for SCREEN 13 or custom colors
    if (isVGA256) {
      source += `' 2. Program VGA DAC Palette (Ports &H3C8 and &H3C9)\n`;
      source += `' VGA DAC hardware accepts 6-bit channel values: 0 to 63\n`;
      source += `GOSUB SetPalette\n\n`;
    } else if (mode.bitDepth === 2 && mode.id === 'SCREEN_1') {
      source += `' 2. CGA Palette Selection\n`;
      source += `' COLOR background, paletteGroup (0 or 1)\n`;
      source += `COLOR 0, 1\n\n`;
    }

    source += `' 3. Set Memory Segment to Video Display RAM\n`;
    source += `' ${mode.defaultSegment === 0xA000 ? '&HA000 is VGA Mode 13h memory' : '&HB800 is CGA/EGA video memory'}\n`;
    source += `DEF SEG = ${segmentHex}\n\n`;

    source += `' 4. BLOAD binary image directly into video memory\n`;
    source += `' Offset 0 represents the top-left pixel (0,0)\n`;
    source += `BLOAD "${bsvFilename}", 0\n\n`;

    source += `' 5. Reset segment back to default DGROUP data segment\n`;
    source += `DEF SEG\n\n`;

    source += `' 6. Wait for user keystroke before exiting\n`;
    source += `LOCATE 24, 1\n`;
    source += `PRINT "Press any key to exit...";\n`;
    source += `WHILE INKEY$ = "": WEND\n`;
    source += `SCREEN 0: WIDTH 80: CLS\n`;
    source += `END\n\n`;

    explanation = `Direct VRAM BLOAD is the fastest and most iconic method in MS-DOS. In SCREEN 13, video memory starts at segment &HA000. Each byte corresponds directly to a single pixel on screen (320 × 200 = 64,000 bytes). For CGA SCREEN 1 and SCREEN 2, memory resides at &HB800 with even and odd scanlines interleaved at offset 0 and &H2000.`;
  } 
  // Technique 2: Array BLOAD + PUT
  else if (technique === 'array_put') {
    const arrayElements = Math.ceil((4 + (mode.width * mode.height * mode.bitDepth) / 8) / 2);

    source += `' 1. Initialize screen mode\n`;
    source += `SCREEN ${qbMode}\n`;
    source += `CLS\n\n`;

    if (isVGA256) {
      source += `' 2. Program VGA DAC Palette\n`;
      source += `GOSUB SetPalette\n\n`;
    }

    source += `' 3. Dimension graphic array in 16-bit integers\n`;
    source += `' Calculation: 4 bytes header (width/height) + (width * height * bpp / 8) bytes\n`;
    source += `DIM ImageBuffer(0 TO ${arrayElements}) AS INTEGER\n\n`;

    source += `' 4. Point DEF SEG to the segment where ImageBuffer resides\n`;
    source += `DEF SEG = VARSEG(ImageBuffer(0))\n\n`;

    source += `' 5. BLOAD into the array starting at VARPTR\n`;
    source += `BLOAD "${bsvFilename}", VARPTR(ImageBuffer(0))\n\n`;

    source += `' 6. Reset Segment\n`;
    source += `DEF SEG\n\n`;

    source += `' 7. Draw the image anywhere on screen using PUT\n`;
    source += `PUT (0, 0), ImageBuffer, PSET\n\n`;

    source += `LOCATE 24, 1\n`;
    source += `PRINT "Press any key to exit...";\n`;
    source += `WHILE INKEY$ = "": WEND\n`;
    source += `SCREEN 0: WIDTH 80: CLS\n`;
    source += `END\n\n`;

    explanation = `Array BLOAD is ideal when you want to use the image as a sprite or movable graphic with the QBasic PUT statement (e.g. PUT (x, y), img, PSET or XOR / AND / OR).`;
  }
  // Technique 3: File Stream Reader (GET #1)
  else if (technique === 'file_get') {
    source += `' 1. Initialize screen mode\n`;
    source += `SCREEN ${qbMode}\n`;
    source += `CLS\n\n`;

    if (isVGA256) {
      source += `' 2. Set Palette\n`;
      source += `GOSUB SetPalette\n\n`;
    }

    source += `' 3. Read BSAVE file using binary file I/O\n`;
    source += `OPEN "${bsvFilename}" FOR BINARY AS #1\n\n`;

    source += `' 4. Read 7-byte BSAVE header\n`;
    source += `DIM HeaderByte AS STRING * 1\n`;
    source += `DIM Sig AS STRING * 1\n`;
    source += `GET #1, 1, Sig\n`;
    source += `IF ASC(Sig) <> &HFD THEN\n`;
    source += `    PRINT "Error: Not a valid BSAVE file (marker &HFD missing)!"\n`;
    source += `    CLOSE #1: END\n`;
    source += `END IF\n\n`;

    source += `' 5. Read pixel stream and plot (starts at byte offset 8 in file)\n`;
    source += `DIM PixelVal AS STRING * 1\n`;
    source += `DIM FilePos AS LONG\n`;
    source += `FilePos = 8\n\n`;

    source += `FOR y% = 0 TO ${mode.height - 1}\n`;
    source += `    FOR x% = 0 TO ${mode.width - 1}\n`;
    source += `        GET #1, FilePos, PixelVal\n`;
    source += `        PSET (x%, y%), ASC(PixelVal)\n`;
    source += `        FilePos = FilePos + 1\n`;
    source += `    NEXT x%\n`;
    source += `NEXT y%\n\n`;

    source += `CLOSE #1\n\n`;
    source += `LOCATE 24, 1\n`;
    source += `PRINT "Loaded successfully! Press any key...";\n`;
    source += `WHILE INKEY$ = "": WEND\n`;
    source += `SCREEN 0: WIDTH 80: CLS\n`;
    source += `END\n\n`;

    explanation = `Binary file stream reading parses the 7-byte BSAVE header explicitly and plots pixels. Useful for debugging or custom format conversion.`;
  }
  // Technique 4: Standalone Self-Contained DATA Statements
  else {
    source += `' 1. Initialize screen mode\n`;
    source += `SCREEN ${qbMode}\n`;
    source += `CLS\n\n`;

    if (isVGA256) {
      source += `' 2. Set Palette\n`;
      source += `GOSUB SetPalette\n\n`;
    }

    source += `' 3. Read embedded DATA values into screen\n`;
    source += `DEF SEG = ${segmentHex}\n`;
    source += `RESTORE PixelData\n`;
    source += `FOR offset& = 0 TO ${Math.min(indexedPixels.length - 1, 3199)}\n`;
    source += `    READ val%\n`;
    source += `    POKE offset&, val%\n`;
    source += `NEXT offset&\n`;
    source += `DEF SEG\n\n`;

    source += `LOCATE 24, 1\n`;
    source += `PRINT "Press any key to exit...";\n`;
    source += `WHILE INKEY$ = "": WEND\n`;
    source += `SCREEN 0: WIDTH 80: CLS\n`;
    source += `END\n\n`;

    source += `' =========================================================================\n`;
    source += `' EMBEDDED PIXEL DATA (First bytes)\n`;
    source += `' =========================================================================\n`;
    source += `PixelData:\n`;
    source += generateDataStatements(indexedPixels, 480) + `\n\n`;

    explanation = `The DATA statement loader embeds pixel values right inside the BASIC program source code, meaning you only need one single .BAS file to run!`;
  }

  // Palette subroutine for 256 colors or custom palettes
  if (isVGA256) {
    source += `' =========================================================================\n`;
    source += `' SUBROUTINE: Set VGA 256-Color Palette via Hardware DAC registers\n`;
    source += `' Port &H3C8: Palette Index Register (0 to 255)\n`;
    source += `' Port &H3C9: Palette Data Register (Red, Green, Blue in 0 to 63)\n`;
    source += `' =========================================================================\n`;
    source += `SetPalette:\n`;
    source += `    ' Tell DAC to start reading colors at index 0\n`;
    source += `    OUT &H3C8, 0\n`;
    source += `    RESTORE PaletteData\n`;
    source += `    FOR c% = 0 TO 255\n`;
    source += `        READ r6%, g6%, b6%\n`;
    source += `        OUT &H3C9, r6%\n`;
    source += `        OUT &H3C9, g6%\n`;
    source += `        OUT &H3C9, b6%\n`;
    source += `    NEXT c%\n`;
    source += `    RETURN\n\n`;

    source += `' Palette entries (R, G, B in 6-bit DAC values 0 to 63)\n`;
    source += `PaletteData:\n`;
    for (let i = 0; i < Math.min(256, palette.length); i += 4) {
      const parts: string[] = [];
      for (let j = 0; j < 4 && (i + j) < palette.length; j++) {
        const [r6, g6, b6] = toVgaDac(palette[i + j]);
        parts.push(`${r6},${g6},${b6}`);
      }
      source += `DATA ${parts.join(',')}\n`;
    }
    source += `\n`;
  }

  // Also include a saver sample block in comments at bottom for user reference!
  source += `' =========================================================================\n`;
  source += `' BONUS: HOW TO BSAVE AN IMAGE FROM QBASIC DIRECTLY TO DISK\n`;
  source += `' =========================================================================\n`;
  source += `' To save any screen image back to a .BSV file in your own QBasic programs:\n`;
  source += `'   DEF SEG = ${segmentHex}                 ' Point to screen memory\n`;
  source += `'   BSAVE "${bsvFilename}", 0, ${mode.bitDepth === 8 ? '64000' : mode.id === 'SCREEN_1' || mode.id === 'SCREEN_2' ? '16192' : '32004'}   ' Offset, Length\n`;
  source += `'   DEF SEG                             ' Restore default segment\n`;
  source += `' =========================================================================\n`;

  const dosboxInstructions = `
1. Place '${bsvFilename}' and '${basFilename}' into your DOSBox shared directory (e.g. C:\\DOSBOX).
2. Start DOSBox and mount your folder:
   Z:\\> MOUNT C C:\\DOSBOX
   Z:\\> C:
3. Run QBasic or QuickBASIC:
   C:\\> QBASIC /RUN ${basFilename}
   (Or in QB64: simply open '${basFilename}' and hit F5 to compile and run!)
`.trim();

  return {
    filename: basFilename,
    sourceCode: source,
    explanation,
    dosboxInstructions
  };
}
