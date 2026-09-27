import React, { useState } from 'react';
import { LoaderTechnique, Dialect, ScreenModeConfig, RGBColor } from '../types/bsave';
import { GeneratedCode, generateQBasicCode } from '../utils/codeGenerator';
import { Copy, Check, Download, Terminal, Code2, BookOpen, ExternalLink } from 'lucide-react';

interface QBasicCodePanelProps {
  mode: ScreenModeConfig;
  palette: RGBColor[];
  indexedPixels: Uint8Array;
  filename: string;
}

export const QBasicCodePanel: React.FC<QBasicCodePanelProps> = ({
  mode,
  palette,
  indexedPixels,
  filename
}) => {
  const [technique, setTechnique] = useState<LoaderTechnique>('vram_direct');
  const [dialect, setDialect] = useState<Dialect>('quickbasic45');
  const [copied, setCopied] = useState(false);

  const generatedCode: GeneratedCode = generateQBasicCode(
    mode,
    palette,
    indexedPixels,
    filename,
    technique,
    dialect
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode.sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBas = () => {
    const blob = new Blob([generatedCode.sourceCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generatedCode.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Loader Technique & Dialect */}
      <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/60 space-y-3">
        {/* Technique selection */}
        <div>
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
            QBasic Loader Technique
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: 'vram_direct', name: 'Direct VRAM BLOAD', desc: 'Fastest (DEF SEG = &HA000)' },
              { id: 'array_put', name: 'Array BLOAD + PUT', desc: 'Movable sprite array' },
              { id: 'file_get', name: 'Binary GET Stream', desc: 'Explicit byte reader' },
              { id: 'data_statements', name: 'DATA Statements', desc: 'Standalone single .BAS' },
            ].map((t) => {
              const isSelected = technique === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTechnique(t.id as LoaderTechnique)}
                  className={`p-2 rounded border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400/80 bg-neutral-800 text-neutral-100 ring-1 ring-amber-400/40'
                      : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="text-xs font-semibold">{t.name}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dialect selection */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Target Dialect:</span>
            <div className="flex bg-neutral-950 border border-neutral-800 rounded p-0.5 text-xs">
              {[
                { id: 'quickbasic45', label: 'QuickBASIC 4.5' },
                { id: 'qbasic11', label: 'QBasic 1.1 (DOS)' },
                { id: 'qb64', label: 'QB64 / QB64-PE' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDialect(d.id as Dialect)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    dialect === d.id
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadBas}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-950" />
              <span>Download {generatedCode.filename}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-xl">
        <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs font-mono text-neutral-400">
          <span className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            {generatedCode.filename}
          </span>
          <span className="text-neutral-500">
            {generatedCode.sourceCode.split('\n').length} Lines
          </span>
        </div>

        <div className="p-4 overflow-x-auto max-h-[460px] text-xs font-mono leading-relaxed select-text">
          <pre className="text-neutral-300">
            {generatedCode.sourceCode.split('\n').map((line, idx) => {
              const isComment = line.trim().startsWith("'");
              const isKeyword = /^(SCREEN|DEF SEG|BLOAD|BSAVE|DIM|OPEN|GET|PUT|OUT|FOR|NEXT|WHILE|WEND|CLS|END|LOCATE|PRINT|RESTORE|READ|POKE|DATA|COLOR|GOSUB|RETURN)\b/i.test(line.trim());
              const isLabel = /^[A-Za-z0-9_]+:/.test(line.trim());

              return (
                <div key={idx} className="table-row">
                  <span className="table-cell pr-4 text-neutral-600 select-none text-right tabular-nums w-10">
                    {idx + 1}
                  </span>
                  <span className={`table-cell ${
                    isComment 
                      ? 'text-neutral-500 italic' 
                      : isLabel 
                        ? 'text-amber-300 font-bold' 
                        : isKeyword 
                          ? 'text-amber-400' 
                          : 'text-neutral-200'
                  }`}>
                    {line}
                  </span>
                </div>
              );
            })}
          </pre>
        </div>
      </div>

      {/* Explanation & DOSBox Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-1.5">
          <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            How this QBasic loader works
          </div>
          <p className="text-neutral-400 leading-relaxed">
            {generatedCode.explanation}
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-1.5">
          <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Running in DOSBox
          </div>
          <pre className="text-neutral-400 font-mono text-[11px] whitespace-pre-wrap leading-tight">
            {generatedCode.dosboxInstructions}
          </pre>
        </div>
      </div>
    </div>
  );
};
