import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BitDepth, 
  ScreenModeConfig, 
  DitherAlgorithm, 
  ImageAdjustments, 
  RGBColor, 
  PaletteInfo 
} from './types/bsave';
import { SCREEN_MODES, SCREEN_MODES_LIST } from './utils/screenModes';
import { 
  getPalettesForBitDepth, 
  quantizePaletteMedianCut, 
  getStandardVga256Palette 
} from './utils/palettes';
import { processAndDitherImage, DitherResult } from './utils/dithering';
import { encodeToBSAVE, BSAVEExportResult } from './utils/bsaveEncoder';
import { generateQBasicCode } from './utils/codeGenerator';
import { createDosboxZipBundle } from './utils/zipExporter';
import { SAMPLE_IMAGES, SampleItem } from './data/samples';

import { Header } from './components/Header';
import { ScreenModeSelector } from './components/ScreenModeSelector';
import { DitheringControls } from './components/DitheringControls';
import { RetroMonitor } from './components/RetroMonitor';
import { PaletteViewer } from './components/PaletteViewer';
import { QBasicCodePanel } from './components/QBasicCodePanel';
import { HexInspector } from './components/HexInspector';
import { BsaveUploaderModal } from './components/BsaveUploaderModal';
import { SamplePickerModal } from './components/SamplePickerModal';
import { PaletteCyclingSimulator } from './components/PaletteCyclingSimulator';

import { 
  Tv, 
  Code2, 
  Binary, 
  Palette, 
  Download, 
  Upload, 
  Image as ImageIcon,
  Sparkles,
  Layers,
  ChevronRight,
  Terminal,
  HelpCircle
} from 'lucide-react';

export default function App() {
  // Main Configuration States
  const [imageName, setImageName] = useState<string>('ADVENTURE');
  const [imageSrc, setImageSrc] = useState<string>(SAMPLE_IMAGES[0].imagePath);
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);

  const [selectedBitDepth, setSelectedBitDepth] = useState<BitDepth>(8);
  const [selectedMode, setSelectedMode] = useState<ScreenModeConfig>(SCREEN_MODES.SCREEN_13);
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('8bit_vga256');
  
  const [ditherAlgorithm, setDitherAlgorithm] = useState<DitherAlgorithm>('floyd_steinberg');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    ditherStrength: 100,
    invert: false
  });

  // Active palette computed
  const [activePalette, setActivePalette] = useState<RGBColor[]>(getStandardVga256Palette());

  // Converted Results
  const [ditherResult, setDitherResult] = useState<DitherResult | null>(null);
  const [exportResult, setExportResult] = useState<BSAVEExportResult | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'monitor' | 'code' | 'hex' | 'palette'>('monitor');

  // Modals
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Load image from URL/Path into ImageData
  const loadImage = useCallback((src: string) => {
    if (!src) return;
    const img = new Image();
    // Only set crossOrigin if external URL to prevent CORS/taint bugs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 320;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setSourceImageData(imgData);
      } catch (e) {
        console.error('Error extracting image data:', e);
        // Fallback: generate default procedural retro gradient pattern
        generateFallbackImageData();
      }
    };
    img.onerror = (e) => {
      console.warn('Failed to load image at path:', src, e);
      generateFallbackImageData();
    };
    img.src = src;
  }, []);

  const generateFallbackImageData = useCallback(() => {
    const width = 320;
    const height = 200;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw retro DOS fantasy landscape
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 120);
    skyGrad.addColorStop(0, '#000080'); // Deep navy blue
    skyGrad.addColorStop(1, '#ff6600'); // Sunset orange
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, 120);

    // Sun
    ctx.fillStyle = '#ffff55';
    ctx.beginPath();
    ctx.arc(160, 90, 36, 0, Math.PI * 2);
    ctx.fill();

    // Mountains
    ctx.fillStyle = '#550055';
    ctx.beginPath();
    ctx.moveTo(0, 130);
    ctx.lineTo(80, 50);
    ctx.lineTo(170, 130);
    ctx.lineTo(250, 70);
    ctx.lineTo(320, 130);
    ctx.lineTo(320, 200);
    ctx.lineTo(0, 200);
    ctx.fill();

    // Foreground ground
    ctx.fillStyle = '#005500';
    ctx.fillRect(0, 130, width, 70);

    const imgData = ctx.getImageData(0, 0, width, height);
    setSourceImageData(imgData);
  }, []);

  // Initial load
  useEffect(() => {
    loadImage(SAMPLE_IMAGES[0].imagePath);
  }, [loadImage]);

  // Update palette and recalculate when dependencies change
  useEffect(() => {
    if (!sourceImageData) return;

    // 1. Resolve Palette
    const availablePalettes = getPalettesForBitDepth(selectedBitDepth);
    const palConfig = availablePalettes.find(p => p.id === selectedPaletteId) || availablePalettes[0];
    
    let resolvedPalette: RGBColor[];
    if (palConfig.isCustom) {
      // Sample pixels from image data to quantize
      const sampled: RGBColor[] = [];
      const data = sourceImageData.data;
      const step = Math.max(1, Math.floor(data.length / 4 / 10000));
      for (let i = 0; i < data.length; i += step * 4) {
        sampled.push([data[i], data[i + 1], data[i + 2]]);
      }
      resolvedPalette = quantizePaletteMedianCut(sampled, selectedMode.colorsCount);
    } else {
      resolvedPalette = palConfig.colors;
    }

    setActivePalette(resolvedPalette);

    // 2. Perform Resizing & Dithering
    const ditherRes = processAndDitherImage(
      sourceImageData,
      selectedMode.width,
      selectedMode.height,
      resolvedPalette,
      ditherAlgorithm,
      adjustments
    );
    setDitherResult(ditherRes);

    // 3. Encode to BSAVE binary with 7-byte header
    const encoded = encodeToBSAVE(
      ditherRes.indexedPixels,
      selectedMode.width,
      selectedMode.height,
      selectedMode,
      resolvedPalette
    );
    setExportResult(encoded);
  }, [
    sourceImageData,
    selectedBitDepth,
    selectedMode,
    selectedPaletteId,
    ditherAlgorithm,
    adjustments
  ]);

  // Handle custom image file upload
  const handleUploadImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImageSrc(result);
        setImageName(file.name.replace(/\.[^/.]+$/, '').toUpperCase());
        loadImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle sample selection
  const handleSelectSample = (sample: SampleItem) => {
    setImageSrc(sample.imagePath);
    setImageName(sample.id.toUpperCase());
    loadImage(sample.imagePath);

    // Apply recommended mode & dither
    const recMode = SCREEN_MODES[sample.recommendedMode] || SCREEN_MODES.SCREEN_13;
    setSelectedBitDepth(recMode.bitDepth);
    setSelectedMode(recMode);
    setDitherAlgorithm(sample.recommendedDither);
    const pal = getPalettesForBitDepth(recMode.bitDepth)[0];
    if (pal) setSelectedPaletteId(pal.id);
  };

  // Handle loading decoded BSAVE image into editor
  const handleLoadBSAVEIntoEditor = (imgData: ImageData, mode: ScreenModeConfig, name: string) => {
    setSourceImageData(imgData);
    setImageName(name);
    setSelectedBitDepth(mode.bitDepth);
    setSelectedMode(mode);
    const pal = getPalettesForBitDepth(mode.bitDepth)[0];
    if (pal) setSelectedPaletteId(pal.id);
    setImageSrc('');
  };

  // Download complete DOSBox ZIP package
  const handleExportZip = async () => {
    if (!exportResult || !ditherResult) return;
    setIsExportingZip(true);
    try {
      const generatedCode = generateQBasicCode(
        selectedMode,
        activePalette,
        ditherResult.indexedPixels,
        imageName,
        'vram_direct',
        'quickbasic45'
      );

      const zipBlob = await createDosboxZipBundle(
        imageName,
        exportResult,
        generatedCode,
        selectedMode,
        activePalette
      );

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${imageName.toUpperCase()}_DOSBOX_PACKAGE.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to create ZIP package:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Bar Header */}
      <Header
        onOpenUploader={() => setUploaderOpen(true)}
        onExportZip={handleExportZip}
        onOpenSamples={() => setSamplesOpen(true)}
        activeScreenModeName={selectedMode.name}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar: Controls & Options (5 cols) */}
        <section className="lg:col-span-5 space-y-5 bg-neutral-900/60 p-4 sm:p-5 rounded-2xl border border-neutral-800 backdrop-blur-sm">
          {/* Active Image Banner */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                {imageSrc ? (
                  <img src={imageSrc} alt={imageName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-neutral-200 truncate">
                  {imageName}.BSV
                </div>
                <div className="text-[11px] text-neutral-500 font-mono">
                  {sourceImageData ? `${sourceImageData.width}×${sourceImageData.height} source` : 'Loading...'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSamplesOpen(true)}
                className="px-2.5 py-1 text-xs text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Samples</span>
              </button>
            </div>
          </div>

          {/* Mode & Palette Selector */}
          <ScreenModeSelector
            selectedBitDepth={selectedBitDepth}
            onSelectBitDepth={(depth) => setSelectedBitDepth(depth)}
            selectedMode={selectedMode}
            onSelectMode={(mode) => setSelectedMode(mode)}
            selectedPaletteId={selectedPaletteId}
            onSelectPalette={(palId) => setSelectedPaletteId(palId)}
            customPaletteAvailable={true}
          />

          {/* Dithering & Image Processing */}
          <DitheringControls
            algorithm={ditherAlgorithm}
            onSelectAlgorithm={(algo) => setDitherAlgorithm(algo)}
            adjustments={adjustments}
            onChangeAdjustments={(adj) => setAdjustments(adj)}
          />
        </section>

        {/* Right Stage: CRT Monitor, Code, Hex & Palette Tabs (7 cols) */}
        <section className="lg:col-span-7 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('monitor')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'monitor'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>CRT Monitor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'code'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>QBasic Loader Code</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hex')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'hex'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>BSAVE Hex Inspector</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('palette')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'palette'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Palette Matrix &amp; Cycling</span>
              </button>
            </div>

            {/* Quick Export ZIP button */}
            <button
              type="button"
              disabled={isExportingZip}
              onClick={handleExportZip}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white px-3 py-1.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{isExportingZip ? 'Packaging...' : 'Download ZIP Bundle'}</span>
            </button>
          </div>

          {/* Active Tab Views */}
          {activeTab === 'monitor' && (
            <div className="space-y-4">
              <RetroMonitor
                rgbaData={ditherResult ? ditherResult.rgbaData : null}
                indexedPixels={ditherResult ? ditherResult.indexedPixels : null}
                mode={selectedMode}
                palette={activePalette}
                originalImageSrc={imageSrc}
              />

              {/* Compact Palette Swatches Preview underneath monitor */}
              <PaletteViewer
                palette={activePalette}
                paletteName={selectedPaletteId}
              />
            </div>
          )}

          {activeTab === 'code' && (
            <QBasicCodePanel
              mode={selectedMode}
              palette={activePalette}
              indexedPixels={ditherResult?.indexedPixels || new Uint8Array(0)}
              filename={imageName}
            />
          )}

          {activeTab === 'hex' && exportResult && (
            <HexInspector
              exportResult={exportResult}
              mode={selectedMode}
              filename={imageName}
            />
          )}

          {activeTab === 'palette' && (
            <PaletteCyclingSimulator
              palette={activePalette}
              paletteName={selectedPaletteId}
              indexedPixels={ditherResult ? ditherResult.indexedPixels : null}
              mode={selectedMode}
              imageName={imageName}
            />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-4 px-4 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>QBasic BSAVE Converter · 1-bit, 2-bit, 4-bit, 8-bit VGA/CGA Memory Architecture</span>
          <span className="text-neutral-600">Compatible with MS-DOS 6.22, DOSBox-X, QB64, &amp; QuickBASIC 4.5</span>
        </div>
      </footer>

      {/* Modals */}
      <BsaveUploaderModal
        isOpen={uploaderOpen}
        onClose={() => setUploaderOpen(false)}
        onLoadIntoEditor={handleLoadBSAVEIntoEditor}
      />

      <SamplePickerModal
        isOpen={samplesOpen}
        onClose={() => setSamplesOpen(false)}
        onSelectSample={handleSelectSample}
        onUploadImage={handleUploadImageFile}
      />
    </div>
  );
}
