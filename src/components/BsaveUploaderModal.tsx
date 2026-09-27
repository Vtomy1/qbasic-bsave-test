import React, { useState, useRef } from 'react';
import { DecodedBSAVE, decodeBSAVEBuffer } from '../utils/bsaveDecoder';
import { SCREEN_MODES, SCREEN_MODES_LIST } from '../utils/screenModes';
import { ScreenModeConfig } from '../types/bsave';
import { Upload, X, AlertCircle, CheckCircle2, Download, Eye, FileText } from 'lucide-react';

interface BsaveUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadIntoEditor: (imageData: ImageData, mode: ScreenModeConfig, name: string) => void;
}

export const BsaveUploaderModal: React.FC<BsaveUploaderModalProps> = ({
  isOpen,
  onClose,
  onLoadIntoEditor
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [decoded, setDecoded] = useState<DecodedBSAVE | null>(null);
  const [selectedMode, setSelectedMode] = useState<ScreenModeConfig>(SCREEN_MODES.SCREEN_13);
  const [rawBuffer, setRawBuffer] = useState<Uint8Array | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setFile(file);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuf = e.target?.result as ArrayBuffer;
        if (!arrayBuf) return;
        const u8 = new Uint8Array(arrayBuf);
        setRawBuffer(u8);

        const result = decodeBSAVEBuffer(u8);
        setDecoded(result);
        setSelectedMode(result.inferredMode);

        renderDecodedToCanvas(result);
      } catch (err: any) {
        setErrorMsg('Failed to parse BSAVE file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderDecodedToCanvas = (data: DecodedBSAVE) => {
    setTimeout(() => {
      if (!previewCanvasRef.current) return;
      const expectedLength = data.width * data.height * 4;
      if (data.rgbaData.length !== expectedLength) return;

      const canvas = previewCanvasRef.current;
      canvas.width = data.width;
      canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      try {
        const imgData = new ImageData(new Uint8ClampedArray(data.rgbaData), data.width, data.height);
        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        console.error('Failed to render decoded canvas:', err);
      }
    }, 50);
  };

  const handleModeChange = (newMode: ScreenModeConfig) => {
    setSelectedMode(newMode);
    if (rawBuffer) {
      const result = decodeBSAVEBuffer(rawBuffer, newMode);
      setDecoded(result);
      renderDecodedToCanvas(result);
    }
  };

  const handleUseInEditor = () => {
    if (!decoded) return;
    const imgData = new ImageData(new Uint8ClampedArray(decoded.rgbaData), decoded.width, decoded.height);
    onLoadIntoEditor(imgData, decoded.inferredMode, file?.name.replace(/\.[^/.]+$/, '') || 'LOADED');
    onClose();
  };

  const handleDownloadDecodedPng = () => {
    if (!previewCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${file?.name || 'BSAVE'}_decoded.png`;
    link.href = previewCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Upload className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-neutral-100">
              QBasic BSAVE Binary File Inspector &amp; Loader
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileProcess(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-neutral-700 hover:border-amber-400/80 bg-neutral-950/60 rounded-xl p-6 text-center transition-all cursor-pointer"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.bsv,.bin,.dat,*';
              input.onchange = (e: any) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              };
              input.click();
            }}
          >
            <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-neutral-200">
              {file ? file.name : 'Drop a .BSV or .BIN file here, or click to browse'}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Supports standard MS-DOS BSAVE files (&amp;HA000, &amp;HB800, 1-bit, 2-bit, 4-bit, 8-bit VGA)
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {decoded && (
            <div className="space-y-4">
              {/* Header Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block">Magic 0xFD</span>
                  <span className={`font-bold ${decoded.hasValidHeader ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {decoded.hasValidHeader ? 'VALID (0xFD)' : 'NO HEADER (Raw)'}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block">Segment</span>
                  <span className="font-bold text-neutral-200">{decoded.segmentHex}</span>
                </div>

                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block">Offset</span>
                  <span className="font-bold text-neutral-200">{decoded.offsetHex}</span>
                </div>

                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block">Payload Size</span>
                  <span className="font-bold text-neutral-200">
                    {decoded.actualPayloadLength.toLocaleString()} B
                  </span>
                </div>
              </div>

              {/* Mode interpretation selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Decode Interpretation Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SCREEN_MODES_LIST.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModeChange(m)}
                      className={`p-2 rounded text-left border text-xs cursor-pointer transition-all ${
                        selectedMode.id === m.id
                          ? 'border-amber-400 bg-neutral-800 text-amber-300 font-semibold'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div>{m.name}</div>
                      <div className="text-[10px] text-neutral-500">{m.width}×{m.height}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Decoded preview canvas */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center">
                <span className="text-xs text-neutral-400 mb-2 font-mono">
                  Decoded Output: {decoded.width}×{decoded.height} ({selectedMode.bitDepth}-Bit)
                </span>
                <div className="max-w-full max-h-64 overflow-auto border border-neutral-800 rounded shadow-lg bg-black">
                  <canvas
                    ref={previewCanvasRef}
                    className="pixelated block"
                    style={{
                      imageRendering: 'pixelated',
                      maxHeight: '240px',
                      aspectRatio: `${decoded.width} / ${decoded.height}`
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {decoded && (
          <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDownloadDecodedPng}
              className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save as PNG</span>
            </button>

            <button
              type="button"
              onClick={handleUseInEditor}
              className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Load into Converter Editor</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
