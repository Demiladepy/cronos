import React from 'react';
import { AnalyzingModalProps } from '../types';
import { Search } from 'lucide-react';


const AnalyzingModal: React.FC<AnalyzingModalProps> = ({ isOpen, progress, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-[#0b1220] px-6 py-10 text-center text-white shadow-xl">
        {/* Scanning label */}
        <p className="mb-4 text-xs tracking-widest text-white/50">SCANNING: WIRELESS HEADPHONES</p>

        {/* Spinner */}
        <div className="relative mx-auto mb-6 h-28 w-28">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-blue-500 text-2xl">
            <Search size={24} />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-lg font-semibold">Analyzing product details...</h2>

        {/* Subtitle */}
        <p className="mb-6 text-sm text-white/60">
          Searching for a better bargain across 50+ retailers.
        </p>

        {/* Progress card */}
        <div className="mb-6 rounded-lg bg-white/5 p-4">
          <div className="mb-2 flex justify-between text-xs text-white/70">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-white/40">This usually takes less than 10 seconds</p>
        </div>

        {/* Cancel */}
        <button onClick={onCancel} className="text-xs text-white/50 hover:text-white transition">
          ✕ Cancel Search
        </button>
      </div>
    </div>
  );
};

export default AnalyzingModal;