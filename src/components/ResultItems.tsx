import { ResultItem } from '../types';
import { ExternalLink } from 'lucide-react';

interface ResultsListProps {
  results: ResultItem[];
}

const ResultsList: React.FC<ResultsListProps> = ({ results }) => {
  const topResults = [...results].sort((a, b) => a.price - b.price).slice(0, 3);

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-10 text-white">
      <h2 className="mb-6 text-center text-lg font-semibold text-white/90">Best Deals Found</h2>

      <div className="space-y-3">
        {topResults.map((item, index) => (
          <div
            key={item.id}
            className="
              flex items-center gap-3
              rounded-xl border border-white/10
              bg-white/5 px-3 py-3
              backdrop-blur
            "
          >
            {/* Rank */}
            <div className="w-5 shrink-0 text-sm font-semibold text-blue-400">{index + 1}</div>

            {/* Image */}
            <img
              src={item.image}
              alt={item.name}
              className="h-10 w-10 shrink-0 rounded-md object-cover"
            />

            {/* Name + Vendor */}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{item.name}</span>
              <span className="text-xs text-white/50">{item.vendor}</span>
            </div>

            {/* Price */}
            <div className="shrink-0 text-sm font-semibold text-green-400">
              ${item.price.toFixed(2)}
            </div>

            {/* Link */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                ml-2 flex shrink-0 items-center gap-1
                text-xs text-blue-400
                hover:text-blue-300 transition
              "
            >
              Visit
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ResultsList;
