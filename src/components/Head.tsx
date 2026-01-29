import React from 'react';
import { HistoryIcon, Sun, Moon } from 'lucide-react';

// 1. Define the interface
interface HeaderProps {
  onToggleHighContrast: () => void;
  highContrast: boolean;
}

// 2. Pass the interface to React.FC<HeaderProps>
const Header: React.FC<HeaderProps> = ({ onToggleHighContrast, highContrast }) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 md:px-6 border-b border-white/10 bg-[#0b1220]">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-blue-500" />
        <span className="text-sm md:text-base font-semibold text-white">Blind Bargain</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-5">
        {/* Toggle Button using the props you passed */}
        <button
          onClick={onToggleHighContrast}
          aria-label="Toggle High Contrast"
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white"
        >
          {highContrast ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          aria-label="History"
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white"
        >
          <HistoryIcon size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;