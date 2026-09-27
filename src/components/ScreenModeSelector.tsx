import React from 'react';
import { BitDepth, ScreenModeConfig, ScreenModeId, PaletteInfo } from '../types/bsave';
import { SCREEN_MODES, SCREEN_MODES_LIST } from '../utils/screenModes';
import { getPalettesForBitDepth } from '../utils/palettes';
import { Monitor, Cpu, Layers } from 'lucide-react';

interface ScreenModeSelectorProps {
  selectedBitDepth: BitDepth;
  onSelectBitDepth: (bitDepth: BitDepth) => void;
  selectedMode: ScreenModeConfig;
  onSelectMode: (mode: ScreenModeConfig) => void;
  selectedPaletteId: string;
  onSelectPalette: (paletteId: string) => void;
  customPaletteAvailable: boolean;
}

export const ScreenModeSelector: React.FC<ScreenModeSelectorProps> = ({
  selectedBitDepth,
  onSelectBitDepth,
  selectedMode,
  onSelectMode,
  selectedPaletteId,
  onSelectPalette,
  customPaletteAvailable
}) => {
  const availableModes = SCREEN_MODES_LIST.filter(m => m.bitDepth === selectedBitDepth);
  const palettes = getPalettesForBitDepth(selectedBitDepth);

  const bitDepths: { depth: BitDepth; label: string; colors: string; desc: string }[] = [
    { depth: 1, label: '1-Bit', colors: '2 Colors', desc: 'SCREEN 2 / 11' },
    { depth: 2, label: '2-Bit', colors: '4 Colors', desc: 'SCREEN 1 (CGA)' },
    { depth: 4, label: '4-Bit', colors: '16 Colors', desc: 'SCREEN 7 / 9 / 12' },
    { depth: 8, label: '8-Bit', colors: '256 Colors', desc: 'SCREEN 13 (VGA)' },
  ];

  return (
    <div className="space-y-4">
      {/* Bit Depth Segmented Control */}
      <div>
        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Bit Depth Architecture
        </label>
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
          {bitDepths.map((b) => {
            const isActive = selectedBitDepth === b.depth;
            return (
              <button
                key={b.depth}
                type="button"
                onClick={() => {
                  onSelectBitDepth(b.depth);
                  const firstMode = SCREEN_MODES_LIST.find(m => m.bitDepth === b.depth);
                  if (firstMode) onSelectMode(firstMode);
                  const firstPal = getPalettesForBitDepth(b.depth)[0];
                  if (firstPal) onSelectPalette(firstPal.id);
                }}
                className={`py-2 px-1 text-center rounded transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                }`}
              >
                <div className="text-xs">{b.label}</div>
                <div className={`text-[10px] ${isActive ? 'text-neutral-900/80' : 'text-neutral-500'}`}>
                  {b.colors}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Screen Mode Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            QBasic Screen Mode
          </label>
          <span className="text-[11px] font-mono text-neutral-500">
            Address: &amp;H{selectedMode.defaultSegment.toString(16).toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableModes.map((mode) => {
            const isSelected = selectedMode.id === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400/80 bg-amber-500/10 text-neutral-100 ring-1 ring-amber-400/40'
                    : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-xs tracking-tight">
                    {mode.name}
                  </span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-300">
                    {mode.width}×{mode.height}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Palette Selection */}
      <div>
        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Color Palette
        </label>
        <div className="space-y-1.5">
          {palettes.map((pal) => {
            const isSelected = selectedPaletteId === pal.id;
            const previewColors = pal.colors.slice(0, 16);

            return (
              <button
                key={pal.id}
                type="button"
                onClick={() => onSelectPalette(pal.id)}
                className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-amber-400/80 bg-neutral-800 text-neutral-100 ring-1 ring-amber-400/40'
                    : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{pal.name}</span>
                    {pal.isCustom && (
                      <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Auto-Quantized
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                    {pal.description}
                  </div>
                </div>

                {/* Color preview bar */}
                <div className="flex h-3.5 w-24 shrink-0 rounded overflow-hidden border border-neutral-700">
                  {previewColors.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex-1 h-full"
                      style={{ backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})` }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
