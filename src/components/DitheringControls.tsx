import React from 'react';
import { DitherAlgorithm, ImageAdjustments } from '../types/bsave';
import { RotateCcw, Sliders, Sun, Contrast, Gauge } from 'lucide-react';

interface DitheringControlsProps {
  algorithm: DitherAlgorithm;
  onSelectAlgorithm: (algo: DitherAlgorithm) => void;
  adjustments: ImageAdjustments;
  onChangeAdjustments: (adjustments: ImageAdjustments) => void;
}

const DITHER_OPTIONS: { id: DitherAlgorithm; name: string; tag: string; desc: string }[] = [
  { id: 'floyd_steinberg', name: 'Floyd-Steinberg', tag: 'Standard', desc: 'Classic 4-neighbor error diffusion; balanced gradients.' },
  { id: 'atkinson', name: 'Atkinson', tag: 'Mac Retro', desc: 'Bill Atkinson’s 1/8 diffusion; sharp edges and high retro contrast.' },
  { id: 'bayer_4x4', name: 'Bayer 4×4 Matrix', tag: 'Ordered DOS', desc: 'Crosshatch matrix dithering used in early PC/EGA video games.' },
  { id: 'bayer_8x8', name: 'Bayer 8×8 Matrix', tag: 'Fine Matrix', desc: 'Fine-grained ordered dithering for smoother tonal ramps.' },
  { id: 'bayer_2x2', name: 'Bayer 2×2 Matrix', tag: 'Coarse', desc: 'Bold, high-texture vintage 2x2 pattern.' },
  { id: 'sierra', name: 'Sierra-3', tag: 'Smooth', desc: '3-row diffusion with gentle transitions and minimal speckle.' },
  { id: 'sierra_lite', name: 'Sierra Lite', tag: 'Fast', desc: 'Lightweight 2-row diffusion for crisp retro feel.' },
  { id: 'burkes', name: 'Burkes', tag: 'Clean', desc: '7-neighbor diffusion optimized to reduce worm artifacts.' },
  { id: 'jarvis_judice_ninke', name: 'Jarvis-Judice-Ninke', tag: 'Ultra Fine', desc: 'Dense 12-neighbor diffusion for maximum smoothness.' },
  { id: 'none', name: 'None (Threshold)', tag: 'Flat Poster', desc: 'Pure nearest-color Euclidean match without error diffusion.' }
];

export const DitheringControls: React.FC<DitheringControlsProps> = ({
  algorithm,
  onSelectAlgorithm,
  adjustments,
  onChangeAdjustments
}) => {
  const updateAdj = (key: keyof ImageAdjustments, value: any) => {
    onChangeAdjustments({
      ...adjustments,
      [key]: value
    });
  };

  const handleReset = () => {
    onChangeAdjustments({
      brightness: 0,
      contrast: 0,
      gamma: 1.0,
      ditherStrength: 100,
      invert: false
    });
  };

  return (
    <div className="space-y-4">
      {/* Algorithm selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Dithering Algorithm
          </label>
          <span className="text-[10px] text-neutral-500 font-mono">
            {DITHER_OPTIONS.find(d => d.id === algorithm)?.tag}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {DITHER_OPTIONS.map((opt) => {
            const isSelected = algorithm === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectAlgorithm(opt.id)}
                className={`p-2 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400/80 bg-neutral-800 text-neutral-100 ring-1 ring-amber-400/30'
                    : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold tracking-tight truncate">
                    {opt.name}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dither strength slider */}
      {algorithm !== 'none' && (
        <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Dither Strength
            </span>
            <span className="text-xs font-mono text-amber-400 font-semibold tabular-nums">
              {adjustments.ditherStrength}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={adjustments.ditherStrength}
            onChange={(e) => updateAdj('ditherStrength', Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-700 rounded-lg appearance-none"
          />
        </div>
      )}

      {/* Image Adjustments (Brightness, Contrast, Gamma, Invert) */}
      <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Image Pre-Processing
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset adjustments to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Brightness */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Sun className="w-3 h-3 text-neutral-500" />
              Brightness
            </span>
            <span className="font-mono text-neutral-300 tabular-nums">
              {adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}
            </span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            step={2}
            value={adjustments.brightness}
            onChange={(e) => updateAdj('brightness', Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1 bg-neutral-800 rounded appearance-none"
          />
        </div>

        {/* Contrast */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Contrast className="w-3 h-3 text-neutral-500" />
              Contrast
            </span>
            <span className="font-mono text-neutral-300 tabular-nums">
              {adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}
            </span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            step={2}
            value={adjustments.contrast}
            onChange={(e) => updateAdj('contrast', Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1 bg-neutral-800 rounded appearance-none"
          />
        </div>

        {/* Gamma */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Gauge className="w-3 h-3 text-neutral-500" />
              Gamma Curve
            </span>
            <span className="font-mono text-neutral-300 tabular-nums">
              {adjustments.gamma.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.05}
            value={adjustments.gamma}
            onChange={(e) => updateAdj('gamma', Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1 bg-neutral-800 rounded appearance-none"
          />
        </div>

        {/* Invert toggle */}
        <div className="pt-1 flex items-center justify-between border-t border-neutral-800">
          <label htmlFor="invert-toggle" className="text-xs text-neutral-300 cursor-pointer">
            Invert Negative Colors
          </label>
          <input
            id="invert-toggle"
            type="checkbox"
            checked={adjustments.invert}
            onChange={(e) => updateAdj('invert', e.target.checked)}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-amber-500 accent-amber-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
