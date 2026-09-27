import React, { useRef, useState, useEffect } from 'react';
import { ScreenModeConfig, RGBColor, PixelInspection } from '../types/bsave';
import { toVgaDac } from '../utils/palettes';
import { 
  Tv, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid, 
  Eye, 
  Download,
  Ratio
} from 'lucide-react';

interface RetroMonitorProps {
  rgbaData: Uint8ClampedArray | null;
  indexedPixels: Uint8Array | null;
  mode: ScreenModeConfig;
  palette: RGBColor[];
  originalImageSrc: string | null;
}

export const RetroMonitor: React.FC<RetroMonitorProps> = ({
  rgbaData,
  indexedPixels,
  mode,
  palette,
  originalImageSrc
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Display toggles
  const [crtScanlines, setCrtScanlines] = useState(true);
  const [crtVignette, setCrtVignette] = useState(true);
  const [aspectCorrection, setAspectCorrection] = useState(true);
  const [pixelGrid, setPixelGrid] = useState(false);
  const [zoom, setZoom] = useState<'fit' | 1 | 2 | 4 | 8>('fit');
  const [showOriginal, setShowOriginal] = useState(false);

  // Hover pixel inspection
  const [inspect, setInspect] = useState<PixelInspection | null>(null);

  // Render pixels onto canvas
  useEffect(() => {
    if (!canvasRef.current || !rgbaData) return;
    const expectedLength = mode.width * mode.height * 4;
    if (rgbaData.length !== expectedLength) return;

    const canvas = canvasRef.current;
    canvas.width = mode.width;
    canvas.height = mode.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imgData = new ImageData(new Uint8ClampedArray(rgbaData), mode.width, mode.height);
      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.error('Failed to put image data to retro monitor canvas:', err);
    }
  }, [rgbaData, mode]);

  // Handle canvas mouse move for pixel inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !indexedPixels) return;
    const rect = canvasRef.current.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < 0 || mouseX >= rect.width || mouseY < 0 || mouseY >= rect.height) {
      setInspect(null);
      return;
    }

    const scaleX = mode.width / rect.width;
    const scaleY = mode.height / rect.height;

    const px = Math.floor(mouseX * scaleX);
    const py = Math.floor(mouseY * scaleY);

    if (px >= 0 && px < mode.width && py >= 0 && py < mode.height) {
      const idx = py * mode.width + px;
      const colIdx = indexedPixels[idx];
      const rgb = palette[colIdx % palette.length] || [0, 0, 0];
      const dac = toVgaDac(rgb);
      const hex = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

      setInspect({
        x: px,
        y: py,
        colorIndex: colIdx,
        rgb,
        dac6Bit: dac,
        hex
      });
    }
  };

  const handleMouseLeave = () => {
    setInspect(null);
  };

  // Download converted PNG
  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `QBASIC_${mode.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // Compute CSS sizing for aspect ratio & zoom
  // In 4:3 correction mode, 320x200 stretches vertically by 1.2x to fill 4:3 CRT frame
  const effectiveAspectRatio = aspectCorrection ? '4 / 3' : `${mode.width} / ${mode.height}`;

  return (
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/90 text-xs">
        {/* Left: View mode toggles */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCrtScanlines(!crtScanlines)}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              crtScanlines 
                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40' 
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title="Toggle authentic CRT monitor scanlines"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scanlines</span>
          </button>

          <button
            type="button"
            onClick={() => setAspectCorrection(!aspectCorrection)}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              aspectCorrection
                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40' 
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title="Toggle 4:3 CRT Non-Square Pixel Aspect Ratio"
          >
            <Ratio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">4:3 CRT Ratio</span>
          </button>

          <button
            type="button"
            onClick={() => setPixelGrid(!pixelGrid)}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              pixelGrid 
                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40' 
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title="Toggle pixel grid lines"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>

          {originalImageSrc && (
            <button
              type="button"
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              className="px-2 py-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer select-none"
              title="Hold to see original unquantized source image"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hold: Original</span>
            </button>
          )}
        </div>

        {/* Right: Zoom & Export PNG */}
        <div className="flex items-center gap-2">
          {/* Zoom buttons */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded p-0.5">
            {(['fit', 1, 2, 4] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                  zoom === z
                    ? 'bg-neutral-800 text-amber-300 font-bold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {z === 'fit' ? 'FIT' : `${z}x`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="px-2 py-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Download PNG snapshot of converted image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Retro CRT Display Screen */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 bg-black flex items-center justify-center overflow-auto p-4 select-none min-h-[360px] max-h-[580px]"
      >
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-black to-black pointer-events-none" />

        {/* Canvas wrapper container */}
        <div 
          className="relative max-w-full max-h-full transition-all duration-150 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.9)]"
          style={{
            aspectRatio: effectiveAspectRatio,
            width: zoom === 'fit' ? '100%' : `${mode.width * (zoom as number)}px`,
            maxWidth: zoom === 'fit' ? '100%' : 'none',
            height: zoom === 'fit' ? 'auto' : undefined
          }}
        >
          {/* Active Canvas */}
          <canvas
            ref={canvasRef}
            className={`w-full h-full pixelated block ${showOriginal ? 'hidden' : ''}`}
            style={{
              imageRendering: 'pixelated'
            }}
          />

          {/* Original Image comparison overlay */}
          {originalImageSrc && showOriginal && (
            <img
              src={originalImageSrc}
              alt="Original Source"
              className="w-full h-full object-cover block"
            />
          )}

          {/* CRT Scanline Overlay */}
          {crtScanlines && !showOriginal && (
            <div className="absolute inset-0 crt-scanlines rounded pointer-events-none" />
          )}

          {/* CRT Vignette Overlay */}
          {crtVignette && !showOriginal && (
            <div className="absolute inset-0 crt-vignette rounded pointer-events-none" />
          )}

          {/* Pixel grid overlay */}
          {pixelGrid && !showOriginal && (
            <div 
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: `${100 / mode.width}% ${100 / mode.height}%`
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom Bar: Live Pixel Inspector & DOS Status Ticker */}
      <div className="border-t border-neutral-800 bg-neutral-950 px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Pixel hover info */}
        {inspect ? (
          <div className="flex items-center gap-3 text-neutral-300">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">POS:</span>
              <span className="text-neutral-200 tabular-nums">X:{inspect.x} Y:{inspect.y}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-xs border border-neutral-700" 
                style={{ backgroundColor: inspect.hex }}
              />
              <span className="text-neutral-500">INDEX:</span>
              <span className="text-amber-400 font-bold tabular-nums">{inspect.colorIndex}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-neutral-500">RGB:</span>
              <span className="text-neutral-200 tabular-nums">
                ({inspect.rgb.join(', ')})
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-neutral-500">6-BIT DAC:</span>
              <span className="text-emerald-400 tabular-nums">
                ({inspect.dac6Bit.join(', ')})
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-neutral-500">
              HEX: <span className="text-neutral-300">{inspect.hex}</span>
            </div>
          </div>
        ) : (
          <div className="text-neutral-500 flex items-center gap-2">
            <span>Hover over monitor to inspect pixel coordinates, color index &amp; VGA DAC values</span>
          </div>
        )}

        {/* Resolution & Memory info */}
        <div className="flex items-center gap-3 text-neutral-400 ml-auto">
          <span>{mode.width}×{mode.height}</span>
          <span className="text-neutral-700">·</span>
          <span>{mode.bitDepth}-Bit ({mode.colorsCount} Colors)</span>
          <span className="text-neutral-700">·</span>
          <span className="text-amber-400/90">&amp;H{mode.defaultSegment.toString(16).toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};
