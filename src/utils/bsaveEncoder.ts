import { ScreenModeConfig, RGBColor } from '../types/bsave';
import { toVgaDac } from './palettes';

export interface BSAVEExportResult {
  bsaveBuffer: Uint8Array;       // Full BSAVE file including 7-byte header
  rawMemoryBuffer: Uint8Array;   // Raw memory payload without 7-byte header
  palBuffer: Uint8Array;         // 768-byte DAC palette file (0-63 per channel)
  headerInfo: {
    marker: number;
    segmentHex: string;
    offsetHex: string;
    lengthBytes: number;
  };
}

export function encodeToBSAVE(
  indexedPixels: Uint8Array,
  width: number,
  height: number,
  mode: ScreenModeConfig,
  palette: RGBColor[]
): BSAVEExportResult {
  let memoryPayload: Uint8Array;
  const segment = mode.defaultSegment;
  const offset = 0;

  switch (mode.bitDepth) {
    case 8: {
      // SCREEN 13: Linear 1 byte per pixel
      // 320x200 = 64,000 bytes
      memoryPayload = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) {
        memoryPayload[i] = indexedPixels[i] & 0xFF;
      }
      break;
    }

    case 2: {
      // SCREEN 1 (CGA): 320x200, 2 bits per pixel (4 pixels per byte)
      // Interleaved scanlines at &HB800:
      // Even lines at offset 0, odd lines at offset 0x2000 (8192)
      // 80 bytes per scanline * 100 = 8000 bytes per field
      const bytesPerLine = Math.ceil(width / 4); // 80 bytes for 320 px
      const evenLinesCount = Math.ceil(height / 2); // 100 lines
      const oddLinesCount = Math.floor(height / 2);  // 100 lines
      const oddOffset = 8192; // &H2000
      const totalLen = oddOffset + oddLinesCount * bytesPerLine; // 16,192 bytes
      
      memoryPayload = new Uint8Array(totalLen);

      // Encode even scanlines (0, 2, 4, ...)
      for (let y = 0; y < height; y += 2) {
        const lineIdx = y / 2;
        const lineStartOffset = lineIdx * bytesPerLine;
        
        for (let bx = 0; bx < bytesPerLine; bx++) {
          let b = 0;
          for (let p = 0; p < 4; p++) {
            const px = bx * 4 + p;
            const val = px < width ? indexedPixels[y * width + px] & 0x03 : 0;
            // Shift into MSB position: p=0 -> shift 6, p=1 -> shift 4, etc.
            b |= (val << ((3 - p) * 2));
          }
          memoryPayload[lineStartOffset + bx] = b;
        }
      }

      // Encode odd scanlines (1, 3, 5, ...)
      for (let y = 1; y < height; y += 2) {
        const lineIdx = Math.floor(y / 2);
        const lineStartOffset = oddOffset + lineIdx * bytesPerLine;

        for (let bx = 0; bx < bytesPerLine; bx++) {
          let b = 0;
          for (let p = 0; p < 4; p++) {
            const px = bx * 4 + p;
            const val = px < width ? indexedPixels[y * width + px] & 0x03 : 0;
            b |= (val << ((3 - p) * 2));
          }
          memoryPayload[lineStartOffset + bx] = b;
        }
      }
      break;
    }

    case 1: {
      // SCREEN 2 (CGA/EGA): 640x200, 1 bit per pixel (8 pixels per byte)
      // Interleaved scanlines at &HB800
      if (mode.id === 'SCREEN_2') {
        const bytesPerLine = Math.ceil(width / 8); // 80 bytes for 640 px
        const oddOffset = 8192; // &H2000
        const oddLinesCount = Math.floor(height / 2);
        const totalLen = oddOffset + oddLinesCount * bytesPerLine; // 16,192 bytes

        memoryPayload = new Uint8Array(totalLen);

        // Even lines
        for (let y = 0; y < height; y += 2) {
          const lineIdx = y / 2;
          const lineStartOffset = lineIdx * bytesPerLine;

          for (let bx = 0; bx < bytesPerLine; bx++) {
            let b = 0;
            for (let p = 0; p < 8; p++) {
              const px = bx * 8 + p;
              const val = px < width ? (indexedPixels[y * width + px] & 0x01) : 0;
              b |= (val << (7 - p));
            }
            memoryPayload[lineStartOffset + bx] = b;
          }
        }

        // Odd lines
        for (let y = 1; y < height; y += 2) {
          const lineIdx = Math.floor(y / 2);
          const lineStartOffset = oddOffset + lineIdx * bytesPerLine;

          for (let bx = 0; bx < bytesPerLine; bx++) {
            let b = 0;
            for (let p = 0; p < 8; p++) {
              const px = bx * 8 + p;
              const val = px < width ? (indexedPixels[y * width + px] & 0x01) : 0;
              b |= (val << (7 - p));
            }
            memoryPayload[lineStartOffset + bx] = b;
          }
        }
      } else {
        // SCREEN 11 (640x480 1-bit linear/packed)
        const bytesPerLine = Math.ceil(width / 8);
        memoryPayload = new Uint8Array(bytesPerLine * height);

        for (let y = 0; y < height; y++) {
          const lineStartOffset = y * bytesPerLine;
          for (let bx = 0; bx < bytesPerLine; bx++) {
            let b = 0;
            for (let p = 0; p < 8; p++) {
              const px = bx * 8 + p;
              const val = px < width ? (indexedPixels[y * width + px] & 0x01) : 0;
              b |= (val << (7 - p));
            }
            memoryPayload[lineStartOffset + bx] = b;
          }
        }
      }
      break;
    }

    case 4: {
      // 4-bit modes (SCREEN 7, SCREEN 9, SCREEN 12)
      // Provide QBasic Graphic Array compatible format (Width word + Height word + 4-bit nibbles)
      // In QBasic PUT/GET format for SCREEN 7:
      // Word 0 (2 bytes): width * 4 (bits) or width
      // Word 1 (2 bytes): height (scanlines)
      // Followed by packed nibbles (2 pixels per byte: high nibble p0, low nibble p1)
      const packedNibbleLen = Math.ceil((width * height) / 2);
      const headerBytes = 4; // 2 words for dimensions
      memoryPayload = new Uint8Array(headerBytes + packedNibbleLen);

      // Width in bits (width * 4 in QBasic EGA/VGA PUT format)
      const widthBits = width * 4;
      memoryPayload[0] = widthBits & 0xFF;
      memoryPayload[1] = (widthBits >> 8) & 0xFF;

      // Height in scanlines
      memoryPayload[2] = height & 0xFF;
      memoryPayload[3] = (height >> 8) & 0xFF;

      // Pack pixels 2 per byte
      let byteIdx = headerBytes;
      for (let i = 0; i < width * height; i += 2) {
        const p0 = indexedPixels[i] & 0x0F;
        const p1 = (i + 1 < width * height) ? (indexedPixels[i + 1] & 0x0F) : 0;
        memoryPayload[byteIdx++] = (p0 << 4) | p1;
      }
      break;
    }
  }

  const dataLength = memoryPayload.length;

  // Build complete 7-byte BSAVE file
  const bsaveBuffer = new Uint8Array(7 + dataLength);
  bsaveBuffer[0] = 0xFD; // Magic signature
  bsaveBuffer[1] = segment & 0xFF;
  bsaveBuffer[2] = (segment >> 8) & 0xFF;
  bsaveBuffer[3] = offset & 0xFF;
  bsaveBuffer[4] = (offset >> 8) & 0xFF;
  bsaveBuffer[5] = dataLength & 0xFF;
  bsaveBuffer[6] = (dataLength >> 8) & 0xFF;
  bsaveBuffer.set(memoryPayload, 7);

  // Build standard 768-byte VGA DAC palette file (256 * 3 bytes, 0-63 each)
  const palBuffer = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    if (i < palette.length) {
      const [r6, g6, b6] = toVgaDac(palette[i]);
      palBuffer[i * 3] = r6;
      palBuffer[i * 3 + 1] = g6;
      palBuffer[i * 3 + 2] = b6;
    } else {
      palBuffer[i * 3] = 0;
      palBuffer[i * 3 + 1] = 0;
      palBuffer[i * 3 + 2] = 0;
    }
  }

  return {
    bsaveBuffer,
    rawMemoryBuffer: memoryPayload,
    palBuffer,
    headerInfo: {
      marker: 0xFD,
      segmentHex: '&H' + segment.toString(16).toUpperCase().padStart(4, '0'),
      offsetHex: '&H' + offset.toString(16).toUpperCase().padStart(4, '0'),
      lengthBytes: dataLength
    }
  };
}

// Generate QBasic DATA statements for standalone programs
export function generateDataStatements(bytes: Uint8Array, maxBytes: number = 3200): string {
  const count = Math.min(bytes.length, maxBytes);
  const lines: string[] = [];
  const bytesPerLine = 16;

  for (let i = 0; i < count; i += bytesPerLine) {
    const chunk: string[] = [];
    for (let j = 0; j < bytesPerLine && (i + j) < count; j++) {
      chunk.push(bytes[i + j].toString());
    }
    lines.push(`DATA ${chunk.join(',')}`);
  }

  if (bytes.length > maxBytes) {
    lines.push(`' ... (${bytes.length - maxBytes} more bytes omitted for brevity; use BLOAD for large images)`);
  }

  return lines.join('\n');
}
