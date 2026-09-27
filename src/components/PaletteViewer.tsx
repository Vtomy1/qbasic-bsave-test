import React, { useState } from 'react';
import { RGBColor } from '../types/bsave';
import { toVgaDac } from '../utils/palettes';
import { Copy, Check } from 'lucide-react';

interface PaletteViewerProps {
  palette: RGBColor[];
  paletteName: string;
}

export const PaletteViewer: React.FC<PaletteViewerProps> = ({ palette, paletteName }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopyColor = (color: RGBColor, idx: number) => {
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Active Palette Swatches ({palette.length} Colors)
        </span>
        <span className="text-[11px] text-neutral-400 font-mono">
          {paletteName}
        </span>
      </div>

      {/* Grid of swatches */}
      <div 
        className={`grid gap-1 ${
          is256 
            ? 'grid-cols-8 sm:grid-cols-16 max-h-40 overflow-y-auto pr-1' 
            : palette.length <= 4 
              ? 'grid-cols-4' 
              : 'grid-cols-8'
        }`}
      >
        {palette.map((c, i) => {
          const hex = '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
          const dac = toVgaDac(c);
          const isCopied = copiedIdx === i;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleCopyColor(c, i)}
              className="group relative aspect-square rounded-xs border border-neutral-700/60 transition-transform hover:scale-115 hover:z-20 cursor-pointer shadow-sm"
              style={{ backgroundColor: hex }}
              title={`Index ${i}: RGB(${c.join(',')}) DAC(${dac.join(',')}) ${hex}`}
            >
              {/* Index label for smaller palettes */}
              {!is256 && (
                <span 
                  className={`text-[9px] font-mono font-bold px-0.5 rounded-xs absolute bottom-0.5 right-0.5 ${
                    (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) > 128 ? 'text-black' : 'text-white'
                  }`}
                >
                  {i}
                </span>
              )}

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

      <p className="text-[10px] text-neutral-500 mt-2">
        Click any swatch to copy its RGB, 6-bit VGA DAC register values (0–63), and hex code.
      </p>
    </div>
  );
};
