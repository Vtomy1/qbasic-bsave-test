import React from 'react';
import { SAMPLE_IMAGES, SampleItem } from '../data/samples';
import { ScreenModeConfig, DitherAlgorithm } from '../types/bsave';
import { SCREEN_MODES } from '../utils/screenModes';
import { X, Sparkles, Image as ImageIcon, Upload } from 'lucide-react';

interface SamplePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: SampleItem) => void;
  onUploadImage: (file: File) => void;
}

export const SamplePickerModal: React.FC<SamplePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
  onUploadImage
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-neutral-100">
              Sample Image Gallery &amp; Custom Upload
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
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Custom upload box */}
          <div
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e: any) => {
                if (e.target.files && e.target.files[0]) {
                  onUploadImage(e.target.files[0]);
                  onClose();
                }
              };
              input.click();
            }}
            className="p-4 border-2 border-dashed border-neutral-700 hover:border-amber-400/70 bg-neutral-950/60 rounded-xl text-center cursor-pointer transition-colors"
          >
            <Upload className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <div className="text-xs font-semibold text-neutral-200">
              Upload Custom Image (PNG, JPG, WebP)
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Images will be rescaled, quantized, and dithered to your chosen QBasic screen mode.
            </p>
          </div>

          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pt-2">
            Curated Retro DOS Test Images
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_IMAGES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  onSelectSample(sample);
                  onClose();
                }}
                className="group p-2.5 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:border-amber-400/80 hover:bg-neutral-800/40 text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-4/3 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 mb-2 group-hover:border-amber-500/40">
                    <img
                      src={sample.imagePath}
                      alt={sample.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="font-semibold text-xs text-neutral-200 group-hover:text-amber-300">
                    {sample.name}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">
                    {sample.description}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span className="text-amber-400/90">{sample.recommendedMode}</span>
                  <span>{sample.recommendedDither}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
