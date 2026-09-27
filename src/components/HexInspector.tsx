import React, { useState } from 'react';
import { BSAVEExportResult } from '../utils/bsaveEncoder';
import { ScreenModeConfig } from '../types/bsave';
import { Download, Binary, FileCode, HardDrive } from 'lucide-react';

interface HexInspectorProps {
  exportResult: BSAVEExportResult;
  mode: ScreenModeConfig;
  filename: string;
}

export const HexInspector: React.FC<HexInspectorProps> = ({
  exportResult,
  mode,
  filename
}) => {
  const [maxBytes, setMaxBytes] = useState(256);
  const buffer = exportResult.bsaveBuffer;
  const baseName = filename.replace(/\.[^/.]+$/, '').toUpperCase();

  const handleDownloadBsv = () => {
    const blob = new Blob([exportResult.bsaveBuffer as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.BSV`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBin = () => {
    const blob = new Blob([exportResult.rawMemoryBuffer as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.BIN`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPal = () => {
    const blob = new Blob([exportResult.palBuffer as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.PAL`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate hex dump rows of 16 bytes each
  const rows: { offset: number; hex: string[]; ascii: string; isHeader: boolean[] }[] = [];
  const displayLength = Math.min(buffer.length, maxBytes);

  for (let i = 0; i < displayLength; i += 16) {
    const hex: string[] = [];
    const isHeader: boolean[] = [];
    let ascii = '';

    for (let j = 0; j < 16; j++) {
      const idx = i + j;
      if (idx < displayLength) {
        const byte = buffer[idx];
        hex.push(byte.toString(16).padStart(2, '0').toUpperCase());
        isHeader.push(idx < 7);
        // Printable ASCII (32 to 126)
        ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '·';
      } else {
        hex.push('  ');
        isHeader.push(false);
        ascii += ' ';
      }
    }

    rows.push({
      offset: i,
      hex,
      ascii,
      isHeader
    });
  }

  return (
    <div className="space-y-4">
      {/* 7-Byte Header Anatomy Card */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Binary className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
              BSAVE 7-Byte File Header Structure
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Total File: {buffer.length.toLocaleString()} Bytes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
          {/* Byte 0: Magic */}
          <div className="p-2.5 rounded bg-neutral-950 border border-amber-500/40">
            <div className="text-[10px] text-amber-400 uppercase font-semibold">Byte 0 (Signature)</div>
            <div className="text-base font-bold text-amber-300 mt-1">
              0xFD <span className="text-xs text-neutral-400 font-normal">(253)</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">MS-DOS BSAVE magic marker</div>
          </div>

          {/* Bytes 1-2: Segment */}
          <div className="p-2.5 rounded bg-neutral-950 border border-blue-500/40">
            <div className="text-[10px] text-blue-400 uppercase font-semibold">Bytes 1–2 (Segment)</div>
            <div className="text-base font-bold text-blue-300 mt-1">
              {exportResult.headerInfo.segmentHex}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Little-endian word</div>
          </div>

          {/* Bytes 3-4: Offset */}
          <div className="p-2.5 rounded bg-neutral-950 border border-emerald-500/40">
            <div className="text-[10px] text-emerald-400 uppercase font-semibold">Bytes 3–4 (Offset)</div>
            <div className="text-base font-bold text-emerald-300 mt-1">
              {exportResult.headerInfo.offsetHex}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Memory offset word</div>
          </div>

          {/* Bytes 5-6: Length */}
          <div className="p-2.5 rounded bg-neutral-950 border border-purple-500/40">
            <div className="text-[10px] text-purple-400 uppercase font-semibold">Bytes 5–6 (Length)</div>
            <div className="text-base font-bold text-purple-300 mt-1">
              {exportResult.headerInfo.lengthBytes.toLocaleString()} B
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Payload byte length</div>
          </div>
        </div>
      </div>

      {/* Hex Dump Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-xl">
        <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs font-mono text-neutral-400">
          <span>Binary Hex Dump View</span>
          <div className="flex items-center gap-2">
            <span>Showing:</span>
            {[256, 512, 1024].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setMaxBytes(count)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  maxBytes === count ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {count}B
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 overflow-x-auto text-xs font-mono select-text">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-neutral-600 border-b border-neutral-800/80 pb-1">
                <th className="pr-4 font-normal">OFFSET</th>
                <th className="pr-4 font-normal">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</th>
                <th className="font-normal pl-4">DECODED ASCII</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.offset} className="hover:bg-neutral-900/40">
                  <td className="pr-4 text-neutral-500 select-none tabular-nums">
                    {row.offset.toString(16).padStart(6, '0').toUpperCase()}
                  </td>
                  <td className="pr-4 font-mono tabular-nums">
                    <span className="inline-block space-x-1.5">
                      {row.hex.slice(0, 8).map((h, i) => (
                        <span 
                          key={i} 
                          className={
                            row.isHeader[i] 
                              ? 'text-amber-400 font-bold bg-amber-500/10 px-0.5 rounded-xs' 
                              : 'text-neutral-300'
                          }
                        >
                          {h}
                        </span>
                      ))}
                      <span className="text-neutral-700">·</span>
                      {row.hex.slice(8, 16).map((h, i) => (
                        <span 
                          key={i + 8} 
                          className={
                            row.isHeader[i + 8] 
                              ? 'text-amber-400 font-bold bg-amber-500/10 px-0.5 rounded-xs' 
                              : 'text-neutral-300'
                          }
                        >
                          {h}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="pl-4 text-neutral-400 font-mono tracking-widest">
                    {row.ascii}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual File Downloads */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleDownloadBsv}
          className="px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-neutral-950" />
          <span>Download {baseName}.BSV (With Header)</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadBin}
          className="px-3.5 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
          <span>Download {baseName}.BIN (Raw Payload)</span>
        </button>

        {mode.bitDepth >= 4 && (
          <button
            type="button"
            onClick={handleDownloadPal}
            className="px-3.5 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-neutral-400" />
            <span>Download {baseName}.PAL (768-Byte DAC)</span>
          </button>
        )}
      </div>
    </div>
  );
};
