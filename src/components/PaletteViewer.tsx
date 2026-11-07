import React, { useState } from 'react';
import { RGBColor } from '../types/bsave';
import { toVgaDac } from '../utils/palettes';
import { Check, Flame, ArrowRight, CornerDownRight } from 'lucide-react';

interface PaletteViewerProps {
  palette: RGBColor[];
  paletteName: string;
  cyclingRange?: { start: number; end: number };
  isCycling?: boolean;
  currentOffset?: number;
  onSelectIndexForCycle?: (index: number) => void;
}

export const PaletteViewer: React.FC<PaletteViewerProps> = ({
  palette,
  paletteName,
  cyclingRange,
  isCycling = false,
  currentOffset = 0,
  onSelectIndexForCycle
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopyColor = (color: RGBColor, idx: number, e: React.MouseEvent) => {
    // If shift key or alt key is held and callback provided, set cycle range
    if (e.shiftKey && onSelectIndexForCycle) {
      onSelectIndexForCycle(idx);
      return;
    }

    const dac = toVgaDac(color);
    const hex = '#' + color.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    const text = `Color ${idx}: RGB(${color.join(',')}) | DAC 6-bit(${dac.join(',')}) | ${hex}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const is256 = palette.length > 32;

  return (
    <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/60">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Active Palette Swatches ({palette.length} Colors)
          </span>
          {cyclingRange && isCycling && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30 animate-pulse">
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Cycling: [{cyclingRange.start}–{cyclingRange.end}] (+{currentOffset})</span>
            </span>
          )}
        </div>
        <span className="text-[11px] text-neutral-400 font-mono">
          {paletteName}
        </span>
      </div>

      {/* Grid of swatches */}
      <div 
        className={`grid gap-1 ${
          is256 
            ? 'grid-cols-8 sm:grid-cols-16 max-h-48 overflow-y-auto pr-1' 
            : palette.length <= 4 
              ? 'grid-cols-4' 
              : 'grid-cols-8'
        }`}
      >
        {palette.map((c, i) => {
          const hex = '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
          const dac = toVgaDac(c);
          const isCopied = copiedIdx === i;

          const isInCycleRange = cyclingRange && i >= cyclingRange.start && i <= cyclingRange.end;
          const isCycleStart = cyclingRange && i === cyclingRange.start;
          const isCycleEnd = cyclingRange && i === cyclingRange.end;

          return (
            <button
              key={i}
              type="button"
              onClick={(e) => handleCopyColor(c, i, e)}
              className={`group relative aspect-square rounded-xs border transition-all cursor-pointer shadow-sm ${
                isInCycleRange && isCycling
                  ? 'border-amber-400 ring-2 ring-amber-400/70 ring-offset-1 ring-offset-neutral-950 scale-105 z-10'
                  : isInCycleRange
                    ? 'border-amber-400/70 ring-1 ring-amber-400/40 ring-offset-1 ring-offset-neutral-950'
                    : 'border-neutral-700/60 hover:scale-115 hover:z-20'
              }`}
              style={{ backgroundColor: hex }}
              title={`Index ${i}: RGB(${c.join(',')}) DAC(${dac.join(',')}) ${hex}${
                isInCycleRange ? ' [IN CYCLE RANGE]' : ''
              }${onSelectIndexForCycle ? ' (Shift+Click to set cycle start/end)' : ''}`}
            >
              {/* Range Start Marker */}
              {isCycleStart && (
                <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-black shadow text-[7px] text-black font-bold flex items-center justify-center">
                  S
                </span>
              )}

              {/* Range End Marker */}
              {isCycleEnd && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-black shadow text-[7px] text-black font-bold flex items-center justify-center">
                  E
                </span>
              )}

              {/* Index label for smaller palettes or hover tooltip */}
              {!is256 ? (
                <span 
                  className={`text-[9px] font-mono font-bold px-0.5 rounded-xs absolute bottom-0.5 right-0.5 ${
                    (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) > 128 ? 'text-black' : 'text-white'
                  }`}
                >
                  {i}
                </span>
              ) : isInCycleRange ? (
                <span className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/75 text-amber-300 font-mono text-[9px] font-bold flex items-center justify-center pointer-events-none rounded-xs">
                  {i}
                </span>
              ) : null}

              {/* Copied indicator */}
              {isCopied && (
                <div className="absolute inset-0 bg-neutral-900/90 flex items-center justify-center rounded-xs">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500 mt-2">
        <span>Click any swatch to copy its RGB, 6-bit VGA DAC values (0–63), and hex code.</span>
        {onSelectIndexForCycle && (
          <span className="text-amber-400/80 font-mono">Shift+Click swatch to set cycle index</span>
        )}
      </div>
    </div>
  );
};

