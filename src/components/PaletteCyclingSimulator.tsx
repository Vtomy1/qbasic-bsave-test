import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RGBColor, ScreenModeConfig } from '../types/bsave';
import { 
  rotatePaletteRange, 
  getCyclingPresetsForMode, 
  CyclingPreset, 
  generateQBasicPaletteCycleCode 
} from '../utils/paletteCycling';
import { PaletteViewer } from './PaletteViewer';
import { VgaPaletteCodeExporter } from './VgaPaletteCodeExporter';
import { 
  Play, 
  Pause, 
  RotateCw, 
  RotateCcw, 
  SkipForward, 
  SkipBack, 
  Sliders, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Waves, 
  Flame, 
  Zap, 
  Sparkles, 
  Palette as PaletteIcon,
  Tv,
  HelpCircle,
  ExternalLink,
  Info,
  ChevronDown,
  Layers,
  Cpu
} from 'lucide-react';

interface PaletteCyclingSimulatorProps {
  palette: RGBColor[];
  paletteName: string;
  indexedPixels: Uint8Array | null;
  mode: ScreenModeConfig;
  imageName: string;
}

export const PaletteCyclingSimulator: React.FC<PaletteCyclingSimulatorProps> = ({
  palette,
  paletteName,
  indexedPixels,
  mode,
  imageName
}) => {
  const maxColorIndex = Math.max(1, palette.length - 1);

  // Cycling configuration state
  const presets = useMemo(() => getCyclingPresetsForMode(mode, palette.length), [mode, palette.length]);
  const defaultPreset = presets[0] || {
    start: Math.min(16, maxColorIndex),
    end: Math.min(31, maxColorIndex),
    speedFps: 12,
    direction: 'forward' as const
  };

  const [startIndex, setStartIndex] = useState<number>(defaultPreset.start);
  const [endIndex, setEndIndex] = useState<number>(defaultPreset.end);
  const [speedFps, setSpeedFps] = useState<number>(defaultPreset.speedFps);
  const [direction, setDirection] = useState<'forward' | 'reverse'>(defaultPreset.direction);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [activePresetId, setActivePresetId] = useState<string | null>(presets[0]?.id || null);

  // CRT preview options
  const [showScanlines, setShowScanlines] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [codeViewMode, setCodeViewMode] = useState<'vga_ports' | 'cycling_loop'>('vga_ports');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Clamped safe range
  const safeStart = Math.min(Math.max(0, startIndex), maxColorIndex);
  const safeEnd = Math.max(safeStart, Math.min(endIndex, maxColorIndex));
  const cycleSpan = Math.max(1, safeEnd - safeStart + 1);

  // When mode or palette changes, ensure range is clamped safely
  useEffect(() => {
    if (startIndex > maxColorIndex || endIndex > maxColorIndex) {
      const p = getCyclingPresetsForMode(mode, palette.length)[0];
      if (p) {
        setStartIndex(p.start);
        setEndIndex(p.end);
        setSpeedFps(p.speedFps);
        setDirection(p.direction);
        setActivePresetId(p.id);
      } else {
        setStartIndex(0);
        setEndIndex(maxColorIndex);
        setActivePresetId(null);
      }
      setCurrentOffset(0);
    }
  }, [mode, palette.length, maxColorIndex]);

  // Real-time animation loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || cycleSpan <= 1) return;

    const intervalMs = 1000 / Math.max(1, speedFps);
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const delta = now - lastTime;
      if (delta >= intervalMs) {
        setCurrentOffset(prev => {
          if (direction === 'forward') {
            return (prev + 1) % cycleSpan;
          } else {
            return (prev - 1 + cycleSpan) % cycleSpan;
          }
        });
        lastTime = now;
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speedFps, direction, cycleSpan]);

  // Compute the dynamically rotated palette
  const rotatedPalette = useMemo(() => {
    return rotatePaletteRange(palette, safeStart, safeEnd, currentOffset);
  }, [palette, safeStart, safeEnd, currentOffset]);

  // Render the scene to the mini CRT canvas whenever the rotated palette updates
  useEffect(() => {
    if (!canvasRef.current || !indexedPixels || indexedPixels.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = mode.width;
    const height = mode.height;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const expectedLength = width * height;
    if (indexedPixels.length < expectedLength) return;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let i = 0; i < expectedLength; i++) {
      const colIdx = indexedPixels[i];
      const c = rotatedPalette[colIdx % rotatedPalette.length] || [0, 0, 0];
      const p4 = i * 4;
      data[p4] = c[0];
      data[p4 + 1] = c[1];
      data[p4 + 2] = c[2];
      data[p4 + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [rotatedPalette, indexedPixels, mode]);

  // Step controls
  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentOffset(prev => (prev + 1) % cycleSpan);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentOffset(prev => (prev - 1 + cycleSpan) % cycleSpan);
  };

  const handleApplyPreset = (preset: CyclingPreset) => {
    setStartIndex(preset.start);
    setEndIndex(preset.end);
    setSpeedFps(preset.speedFps);
    setDirection(preset.direction);
    setActivePresetId(preset.id);
    setCurrentOffset(0);
    setIsPlaying(true);
  };

  // Shift-click swatch handler to set start or end index
  const handleSelectIndexForCycle = (idx: number) => {
    if (idx <= startIndex) {
      setStartIndex(idx);
    } else {
      setEndIndex(idx);
    }
    setActivePresetId(null);
    setCurrentOffset(0);
  };

  // Generate runnable QBasic code matching current parameters
  const qbasicCycleCode = useMemo(() => {
    return generateQBasicPaletteCycleCode(
      mode,
      safeStart,
      safeEnd,
      speedFps,
      direction,
      palette,
      imageName
    );
  }, [mode, safeStart, safeEnd, speedFps, direction, palette, imageName]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qbasicCycleCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadBas = () => {
    const blob = new Blob([qbasicCycleCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${imageName.toUpperCase()}_CYCLE.BAS`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Overview & Vintage Context Banner */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-neutral-300 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>1980s Retro Palette Cycling Simulator</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/40">
            Sierra / LucasArts Animation Architecture
          </span>
        </div>
        <p className="text-neutral-400 leading-relaxed">
          In classic MS-DOS games like <em>King's Quest</em>, <em>The Secret of Monkey Island</em>, and <em>Space Quest</em>, 
          fluid animations (waterfalls, rushing rivers, glowing computer consoles, flickering campfire torches) 
          were generated with <strong>zero video memory redraws</strong>! 
          The pixel data in VRAM stayed 100% static while the hardware VGA DAC palette registers shifted every frame.
        </p>
      </div>

      {/* Main Interactive Cycling Console */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4">
        {/* Pre-defined Cycling Pattern Dropdown Selector */}
        <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="pattern-dropdown" className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pre-Defined Cycling Pattern:</span>
            </label>
            {activePresetId ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Auto-Animating: {presets.find(p => p.id === activePresetId)?.name}</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                Custom Index Range
              </span>
            )}
          </div>

          <div className="relative">
            <select
              id="pattern-dropdown"
              value={activePresetId || 'custom'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setActivePresetId(null);
                  return;
                }
                const found = presets.find(p => p.id === val);
                if (found) {
                  handleApplyPreset(found);
                }
              }}
              className="w-full appearance-none bg-neutral-900 border border-neutral-700 hover:border-amber-400/80 rounded-lg px-3.5 py-2.5 pr-10 text-xs font-semibold text-neutral-100 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <optgroup label="Pre-Defined Cycling Patterns">
                {presets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — (Indices {p.start} to {p.end} · {p.speedFps} FPS {p.direction === 'forward' ? '▶ Forward' : '◀ Reverse'})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Manual User Range">
                <option value="custom">
                  Custom User Range — (Indices {safeStart} to {safeEnd} · {speedFps} FPS)
                </option>
              </optgroup>
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Active Pattern Description banner */}
          <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-amber-400 font-semibold">
              {presets.find(p => p.id === activePresetId)?.name || 'Custom Pattern'}:
            </span>
            <span className="text-neutral-300">
              {presets.find(p => p.id === activePresetId)?.description || `Animating user-selected range of indices [${safeStart} to ${safeEnd}].`}
            </span>
          </div>
        </div>

        {/* Top Control Bar: Play / Pause, Direction, Speed */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isPlaying 
                  ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300' 
                  : 'bg-emerald-500 text-white hover:bg-emerald-400'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Cycle</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleStepBack}
              className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
              title="Step backward one index"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleStepForward}
              className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
              title="Step forward one index"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Direction switch */}
            <button
              type="button"
              onClick={() => setDirection(d => d === 'forward' ? 'reverse' : 'forward')}
              className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
              title="Switch cycling direction (Forward vs Reverse)"
            >
              {direction === 'forward' ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Forward (Right)</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reverse (Left)</span>
                </>
              )}
            </button>
          </div>

          {/* Speed Control Slider & Presets */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-neutral-500" />
              <span>Speed:</span>
            </span>

            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded p-1">
              {[
                { fps: 6, label: '6 FPS' },
                { fps: 12, label: '12 FPS (DOS)' },
                { fps: 20, label: '20 FPS' },
                { fps: 30, label: '30 FPS' }
              ].map(s => (
                <button
                  key={s.fps}
                  type="button"
                  onClick={() => setSpeedFps(s.fps)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                    speedFps === s.fps
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Pattern Chips Grid */}
        <div>
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
            Quick Pattern Selector
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map(preset => {
              const isActive = activePresetId === preset.id;
              const Icon = preset.iconName === 'waves' 
                ? Waves 
                : preset.iconName === 'flame' 
                  ? Flame 
                  : preset.iconName === 'zap' 
                    ? Zap 
                    : preset.iconName === 'sparkles' 
                      ? Sparkles 
                      : PaletteIcon;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'border-amber-400 bg-amber-400/10 text-neutral-100 ring-1 ring-amber-400/40 shadow-sm'
                      : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
                      {preset.name}
                    </span>
                    <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-300">
                      {preset.start}–{preset.end}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Custom Range Steppers */}
        <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/70 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-neutral-300">
              Active Cycle Range: <strong className="text-amber-400 font-mono">[{safeStart} to {safeEnd}]</strong>
              <span className="text-neutral-500 ml-2">({cycleSpan} colors rotating)</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              Offset Step: <span className="text-emerald-400">+{currentOffset}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Start Index */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                <span>Start Color Index:</span>
                <span className="font-mono text-amber-300">{safeStart}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, safeEnd - 1)}
                value={safeStart}
                onChange={(e) => {
                  setStartIndex(Number(e.target.value));
                  setActivePresetId(null);
                  setCurrentOffset(0);
                }}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded appearance-none"
              />
            </div>

            {/* End Index */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                <span>End Color Index:</span>
                <span className="font-mono text-emerald-300">{safeEnd}</span>
              </div>
              <input
                type="range"
                min={Math.min(maxColorIndex, safeStart + 1)}
                max={maxColorIndex}
                value={safeEnd}
                onChange={(e) => {
                  setEndIndex(Number(e.target.value));
                  setActivePresetId(null);
                  setCurrentOffset(0);
                }}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-neutral-800 rounded appearance-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side or stacked view: Live CRT Animated Viewport & Swatches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Animated Palette Swatches (7 cols) */}
        <div className="lg:col-span-7 space-y-2">
          <PaletteViewer
            palette={rotatedPalette}
            paletteName={`${paletteName} (Live Cycling)`}
            cyclingRange={{ start: safeStart, end: safeEnd }}
            isCycling={isPlaying}
            currentOffset={currentOffset}
            onSelectIndexForCycle={handleSelectIndexForCycle}
          />
        </div>

        {/* Right: Real-time Live Animated CRT Image Scene (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/80 overflow-hidden shadow-xl">
          <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Animated Scene</span>
            </span>

            <button
              type="button"
              onClick={() => setShowScanlines(!showScanlines)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                showScanlines 
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Scanlines
            </button>
          </div>

          <div className="relative bg-black flex items-center justify-center p-3 select-none aspect-4/3 overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-full pixelated block object-contain"
              style={{
                imageRendering: 'pixelated',
                aspectRatio: '4 / 3'
              }}
            />

            {showScanlines && (
              <div className="absolute inset-0 crt-scanlines pointer-events-none rounded" />
            )}
            <div className="absolute inset-0 crt-vignette pointer-events-none rounded" />
          </div>

          <div className="p-2.5 bg-neutral-950 text-[10px] font-mono text-neutral-400 border-t border-neutral-800 flex items-center justify-between">
            <span>{mode.width}×{mode.height} ({mode.bitDepth}-Bit)</span>
            <span className="text-amber-400">FPS: ~{speedFps}</span>
          </div>
        </div>
      </div>

      {/* QBasic Code & Palette Export Suite */}
      <div className="space-y-3">
        {/* Sub-tab navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setCodeViewMode('vga_ports')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer font-medium ${
                codeViewMode === 'vga_ports'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>OUT &amp;H3C8/&amp;H3C9 Port Commands</span>
            </button>

            <button
              type="button"
              onClick={() => setCodeViewMode('cycling_loop')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer font-medium ${
                codeViewMode === 'cycling_loop'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Cycling Animation Loop</span>
            </button>
          </div>

          <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
            Target: MS-DOS 6.22 / QuickBASIC 4.5 / QB64
          </span>
        </div>

        {/* View 1: VGA Hardware Port Commands Exporter */}
        {codeViewMode === 'vga_ports' && (
          <VgaPaletteCodeExporter
            palette={palette}
            paletteName={paletteName}
            mode={mode}
            imageName={imageName}
            cycleStart={safeStart}
            cycleEnd={safeEnd}
          />
        )}

        {/* View 2: Real-time Cycling Animation Loop Code */}
        {codeViewMode === 'cycling_loop' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-xl space-y-0">
            <div className="px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-neutral-300">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">QBasic Source Code: Palette Cycling Animation Loop</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 text-xs text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>Copy Animation Code</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBas}
                  className="px-2.5 py-1 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-neutral-950" />
                  <span>Download .BAS</span>
                </button>
              </div>
            </div>

            {/* Code Pre Box */}
            <div className="p-4 overflow-x-auto max-h-[380px] text-xs font-mono leading-relaxed select-text bg-neutral-950">
              <pre className="text-neutral-300">
                {qbasicCycleCode.split('\n').map((line, idx) => {
                  const isComment = line.trim().startsWith("'");
                  const isKeyword = /^(SCREEN|DEF SEG|BLOAD|BSAVE|DIM|OPEN|GET|PUT|OUT|INP|FOR|NEXT|DO|LOOP|WHILE|WEND|CLS|END|LOCATE|PRINT|WAIT|CONST|AS|INTEGER|PALETTE)\b/i.test(line.trim());
                  return (
                    <div key={idx} className="table-row">
                      <span className="table-cell pr-4 text-neutral-600 select-none text-right tabular-nums w-8">
                        {idx + 1}
                      </span>
                      <span className={`table-cell ${
                        isComment ? 'text-neutral-500 italic' : isKeyword ? 'text-amber-400 font-semibold' : 'text-neutral-200'
                      }`}>
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* How it works in QBasic / Hardware Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-neutral-400">
        <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-1.5">
          <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            1. Zero VRAM Redraws
          </div>
          <p className="leading-relaxed">
            In early DOS PCs (8088/286/386), transferring $64,000$ bytes across the ISA bus every frame 
            would drop performance to single-digit framerates. With palette cycling, pixels in memory 
            stay completely still; only the 256 DAC color lookup table changes!
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-1.5">
          <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-emerald-400" />
            2. Vertical Retrace Sync
          </div>
          <p className="leading-relaxed">
            The statement <code>WAIT &amp;H3DA, 8</code> halts the CPU until the cathode-ray electron beam 
            reaches the bottom of the screen (Vertical Blank). Changing DAC registers during VBLANK 
            prevents flickering and video "snow" artifacts.
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-1.5">
          <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            3. Hardware Ports &amp;H3C8 / &amp;H3C9
          </div>
          <p className="leading-relaxed">
            Port <code>&amp;H3C8</code> is the DAC write address register. Port <code>&amp;H3C9</code> takes 
            3 consecutive 6-bit values (0 to 63) for Red, Green, and Blue. The hardware auto-increments 
            to the next color index automatically after the blue channel write.
          </p>
        </div>
      </div>
    </div>
  );
};
