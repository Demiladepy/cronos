import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import AnalyzingModal from './AnalyzingModal';
import { HomeHeroProps, ResultItem } from '../types';

const HomeHero: React.FC<HomeHeroProps> = ({ onResult }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) return;

    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);

          // ✅ DEMO RESULT DATA
          const demoResults: ResultItem[] = [
            {
              id: '1',
              name: 'Wireless Headphones',
              image: 'https://via.placeholder.com/150',
              price: 129.99,
              vendor: 'Amazon',
              url: 'https://amazon.com',
            },
            {
              id: '2',
              name: 'Wireless Headphones',
              image: 'https://via.placeholder.com/150',
              price: 119.99,
              vendor: 'Best Buy',
              url: 'https://bestbuy.com',
            },
            {
              id: '3',
              name: 'Wireless Headphones',
              image: 'https://via.placeholder.com/150',
              price: 114.99,
              vendor: 'AliExpress',
              url: 'https://aliexpress.com',
            },
          ];

          // ✅ SEND RESULTS TO APP
          onResult(demoResults);

          return 100;
        }
        return prev + 5;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isAnalyzing, onResult]);

  const handleStartAnalyze = () => {
    setIsAnalyzing(true);
  };

  const handleCancelAnalyze = () => {
    setIsAnalyzing(false);
    setProgress(0);
  };

  return (
    <>
      <main className="flex flex-col items-center justify-center text-center px-4 py-12 md:py-20 bg-[#0b1220] text-white min-h-[calc(100vh-64px)]">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1 text-xs font-medium text-green-400">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          READY AND CONNECTED
        </div>

        <h1 className="max-w-xl text-2xl md:text-4xl font-bold leading-tight mb-8">
          Find a better deal for the product on your current tab.
        </h1>

        <button
          onClick={handleStartAnalyze}
          className="mb-4 w-full max-w-sm rounded-lg bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-500 transition disabled:opacity-50"
          disabled={isAnalyzing}
        >
          GET MY BARGAIN
        </button>

        <button
          className="mb-6 w-full max-w-sm rounded-lg border border-white/20 py-3 text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-2"
          disabled={isAnalyzing}
        >
          <Mic size={20} />
          Use Voice Command
        </button>

        <p className="max-w-md text-xs text-white/60">
          We will automatically compare prices across 50+ stores to find you the lowest price.
        </p>
      </main>

      <AnalyzingModal isOpen={isAnalyzing} progress={progress} onCancel={handleCancelAnalyze} />
    </>
  );
};

export default HomeHero;
