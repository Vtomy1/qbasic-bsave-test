import React, { useState, useMemo } from 'react';
import { RGBColor, ScreenModeConfig } from '../types/bsave';
import { generateVgaPortSetupCode, VgaExportFormat } from '../utils/vgaPaletteExporter';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Cpu, 
  Sliders, 
  BookOpen, 
  Code2, 
  Layers,
  Sparkles
} from 'lucide-react';

interface VgaPaletteCodeExporterProps {
  palette: RGBColor[];
  paletteName: string;
  mode: ScreenModeConfig;
  imageName: string;
  cycleStart?: number;
  cycleEnd?: number;
}

export const VgaPaletteCodeExporter: React.FC<VgaPaletteCodeExporterProps> = ({
  palette,
  paletteName,
  mode,
  imageName,
  cycleStart = 0,
  cycleEnd
}) => {
  const maxIdx = Math.max(0, palette.length - 1);
  const defaultCycleEnd = cycleEnd !== undefined ? Math.min(cycleEnd, maxIdx) : maxIdx;
  const defaultCycleStart = Math.min(cycleStart, defaultCycleEnd);

  // States
  const [format, setFormat] = useState<VgaExportFormat>('direct_out');
  const [scope, setScope] = useState<'all' | 'cycle'>('all');
  const [includeComments, setIncludeComments] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Determine actual export range
  const exportStart = scope === 'cycle' ? defaultCycleStart : 0;
  const exportEnd = scope === 'cycle' ? defaultCycleEnd : maxIdx;
  const totalColors = exportEnd - exportStart + 1;

  // Generate the QBasic source code
  const generatedCode = useMemo(() => {
    return generateVgaPortSetupCode(palette, {
      format,
      startIndex: exportStart,
      endIndex: exportEnd,
      includeComments,
      mode,
      imageName
    });
  }, [palette, format, exportStart, exportEnd, includeComments, mode, imageName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${imageName.toUpperCase()}_OUT_PALETTE.BAS`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = generatedCode.split('\n').length;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 overflow-hidden shadow-xl space-y-0">
      {/* Header Bar */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-100 flex items-center gap-2">
              <span>VGA Hardware DAC Port Commands (OUT &amp;H3C8 / &amp;H3C9)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Ready to Paste
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Export active palette setup commands directly into your QBasic / QuickBASIC / QB64 programs.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 hover:text-white rounded border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied OUT Code!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>Copy OUT Commands</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-neutral-950" />
            <span>Download .BAS</span>
          </button>
        </div>
      </div>

      {/* Configuration Controls Bar */}
      <div className="p-3.5 border-b border-neutral-800/80 bg-neutral-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Style / Format Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-neutral-400 font-medium">Export Format:</span>
          <div className="flex bg-neutral-900 border border-neutral-800 rounded p-0.5 text-xs">
            {[
              { id: 'direct_out', label: 'Direct OUT Commands', desc: 'Series of OUT &H3C8 / &H3C9' },
              { id: 'compact_data', label: 'Compact DATA & Loop', desc: 'RESTORE / READ / OUT' },
              { id: 'subroutine', label: 'SUB Procedure', desc: 'Callable QuickBASIC SUB' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id as VgaExportFormat)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  format === f.id
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title={f.desc}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scope Selector: All Colors vs Cycling Range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-neutral-400 font-medium">Palette Scope:</span>
          <div className="flex bg-neutral-900 border border-neutral-800 rounded p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                scope === 'all'
                  ? 'bg-neutral-800 text-amber-300 font-bold border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All Colors (0–{maxIdx})
            </button>
            <button
              type="button"
              onClick={() => setScope('cycle')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                scope === 'cycle'
                  ? 'bg-neutral-800 text-amber-300 font-bold border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Cycle Range ([{defaultCycleStart}–{defaultCycleEnd}])
            </button>
          </div>
        </div>

        {/* Comments Toggle */}
        <div className="flex items-center gap-2">
          <label htmlFor="comments-toggle" className="text-neutral-400 cursor-pointer flex items-center gap-1.5 select-none">
            <input
              id="comments-toggle"
              type="checkbox"
              checked={includeComments}
              onChange={(e) => setIncludeComments(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-800 text-amber-400 accent-amber-400 cursor-pointer"
            />
            <span>Include RGB/Hex Annotations</span>
          </label>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative bg-neutral-950 overflow-x-auto max-h-[420px] text-xs font-mono leading-relaxed select-text p-4">
        <pre className="text-neutral-300">
          {generatedCode.split('\n').map((line, idx) => {
            const isComment = line.trim().startsWith("'");
            const isOutCmd = /^OUT\b/i.test(line.trim());
            const isDataCmd = /^DATA\b/i.test(line.trim());
            const isKeyword = /^(SCREEN|DEF SEG|BLOAD|BSAVE|DIM|OPEN|GET|PUT|OUT|INP|FOR|NEXT|DO|LOOP|WHILE|WEND|CLS|END|LOCATE|PRINT|WAIT|CONST|AS|INTEGER|PALETTE|GOSUB|RETURN|SUB|DECLARE|CALL)\b/i.test(line.trim());

            return (
              <div key={idx} className="table-row">
                <span className="table-cell pr-4 text-neutral-600 select-none text-right tabular-nums w-10">
                  {idx + 1}
                </span>
                <span className={`table-cell ${
                  isComment 
                    ? 'text-neutral-500 italic' 
                    : isOutCmd 
                      ? 'text-amber-400 font-semibold' 
                      : isDataCmd
                        ? 'text-cyan-400'
                        : isKeyword 
                          ? 'text-amber-300' 
                          : 'text-neutral-200'
                }`}>
                  {line}
                </span>
              </div>
            );
          })}
        </pre>
      </div>

      {/* Technical Footer & Port Usage Info */}
      <div className="p-3 bg-neutral-950/90 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-neutral-400">
        <div className="flex items-center gap-3">
          <span>{totalColors} Colors Exported</span>
          <span className="text-neutral-700">·</span>
          <span>{lineCount} Lines of BASIC Code</span>
          <span className="text-neutral-700">·</span>
          <span className="text-emerald-400 font-semibold">6-Bit DAC Range: 0 to 63</span>
        </div>

        <div className="text-neutral-500">
          Port <code className="text-neutral-300">&amp;H3C8</code> (Write Index) &rarr; Port <code className="text-neutral-300">&amp;H3C9</code> (Data RGB)
        </div>
      </div>
    </div>
  );
};
