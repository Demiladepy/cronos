import React from 'react';
import { Settings, HistoryIcon } from 'lucide-react';

const Head: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 py-3 md:px-6 border-b border-white/10 bg-[#0b1220]">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <img 
          src="/logo.png" 
          alt="Blind Bargain Logo" 
          className="h-8 w-8 rounded-full object-contain"
        />
        <span className="text-sm md:text-base font-semibold text-white">Blind Bargain</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-5">
        { <button
          aria-label="Settings"
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white"
        >
          <Settings size={24} />
        </button> }
        <button
          aria-label="Help"
          className="h-8 w-8 flex items-center justify-center gap-4 rounded-md hover:bg-white/10 text-white"
        >
          
          <HistoryIcon />
        </button>
      </div>
    </header>
  );
};

export default Head;