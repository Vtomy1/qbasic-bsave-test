import React from 'react';
import { Download, Upload, Terminal, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenUploader: () => void;
  onExportZip: () => void;
  onOpenSamples: () => void;
  activeScreenModeName: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUploader,
  onExportZip,
  onOpenSamples,
  activeScreenModeName
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-retro text-xl font-bold">
            BS
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight text-neutral-100 flex items-center gap-2">
              QBasic BSAVE Studio
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Info */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-400 font-medium">
          <button 
            onClick={onOpenSamples}
            className="hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
            <span>Sample Library</span>
          </button>

          <span className="text-neutral-700">|</span>

          <span className="text-neutral-400">
            Active Mode: <strong className="text-neutral-200 font-mono">{activeScreenModeName}</strong>
          </span>

          <span className="text-neutral-700">|</span>

          <span className="text-neutral-400 font-mono">
            Segment: <span className="text-emerald-400">&amp;HA000 / &amp;HB800</span>
          </span>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenUploader}
            className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white rounded border border-neutral-700 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Inspect or load an existing .BSV binary file"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span>Inspect .BSV</span>
          </button>

          <button
            onClick={onExportZip}
            className="px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95"
            title="Download full DOSBox bundle with .BSV, .BAS, .PAL and README"
          >
            <Download className="w-3.5 h-3.5 text-neutral-950" />
            <span>Export DOS Package</span>
          </button>
        </div>
      </div>
    </header>
  );
};
