import React from 'react';
import { ResultItem } from '../types';
import { ExternalLink, TrendingDown } from 'lucide-react';

interface ResultsListProps {
  results: ResultItem[];
}

const ResultsList: React.FC<ResultsListProps> = ({ results }) => {
  const allDeals = [...results]; 
  const EXCHANGE_RATE = 1450;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="text-green-400" size={20} />
        <h2 className="text-md font-bold text-white">Live Bargains Found</h2>
      </div>

      <div className="space-y-2">
        {allDeals.map((item, index) => {
          // Cleaned-up Logic: Define these once per item
          const vendorName = item.vendor.toLowerCase().trim();
          const isNaira = ['jumia', 'konga', 'slot', 'jiji'].includes(vendorName);
          const isUSD = ['amazon', 'aliexpress'].includes(vendorName);
          const currencySymbol = isNaira ? '₦' : '$';

          return (
            <div 
              key={`${item.vendor}-${index}`} 
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all group"
            >
              {/* Rank */}
              <div className="text-sm font-black text-white/20 w-4">{index + 1}</div>
              
              {/* Image */}
              <img 
                src={item.image || "https://placehold.jp/150x150.png"} 
                alt="" 
                className="h-10 w-10 rounded-lg object-cover bg-white/10" 
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-sm font-medium truncate">{item.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-bold text-blue-400 uppercase bg-blue-400/10 px-1.5 py-0.5 rounded">
                    {item.vendor}
                  </span>
                  {index === 0 && (
                    <span className="text-[9px] font-bold text-green-400 uppercase bg-green-400/10 px-1.5 py-0.5 rounded">
                      Best Deal
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Currency Fix */}
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-green-400">
                  {currencySymbol}{item.price.toLocaleString()}
                </div>
                {isUSD && (
                  <div className="text-[9px] text-white/40 font-medium">
                    ≈ ₦{(item.price * EXCHANGE_RATE).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Link */}
              <a 
                href={item.url} 
                target="_blank" 
                rel="noreferrer" 
                className="p-2 rounded-full bg-white/5 text-white/50 hover:bg-blue-600 hover:text-white transition-all"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          );
        })}
      </div>
      
      {allDeals.length === 0 && (
        <p className="text-center text-white/30 text-xs py-10">No deals found yet.</p>
      )}
    </section>
  );
};

export default ResultsList;