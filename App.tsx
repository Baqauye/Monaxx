import React, { useState, useEffect, useRef } from 'react';
import { PLAYFUL_COLORS, PROFESSIONAL_COLORS } from './constants';
import { Token, Mood, ViewMode, CHAINS, ChainConfig } from './types';
import Treemap from './components/Treemap';
import DetailModal from './components/DetailModal';
import { fetchTokensForNetwork } from './services/tokenService';

const BarChart2Icon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChainIcon = ({ chain }: { chain: ChainConfig }) => {
  const icons: Record<number, string> = {
    1: 'Ξ',
    56: 'B',
    8453: 'B',
    101: '◎',
    143: 'M',
    530: '⚡',
  };
  return <span className="text-xs font-bold">{icons[chain.id] || chain.shortName.charAt(0)}</span>;
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('TreeMap');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [mood, setMood] = useState<Mood>('Playful');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeChain, setActiveChain] = useState<ChainConfig>(CHAINS[0]); // default: Monad
  const [showChainSelector, setShowChainSelector] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadMarketData = async () => {
    setIsDataLoading(true);
    try {
      const liveTokens = await fetchTokensForNetwork(activeChain.id);
      if (liveTokens) {
        setTokens(liveTokens);
      }
    } catch (e) {
      console.error('Failed to load market data', e);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 60_000);
    return () => clearInterval(interval);
  }, [activeChain]);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredTokens(tokens);
    } else {
      setFilteredTokens(tokens.filter(t => t.category === selectedCategory));
    }
  }, [selectedCategory, tokens]);

  // Inside App.tsx, after tokens are loaded
const ALL_CATEGORIES: TokenCategory[] = [
  'Meme Coins',
  'AI Tokens',
  'Stablecoins',
  'DeFi Tokens',
  'Governance Tokens',
  'Utility Tokens',
  'GameFi Tokens',
  'RWA Tokens',
  'Infrastructure & Tools',
  'Privacy Tokens'
];

const uniqueCategories = Array.from(
  new Set([
    ...ALL_CATEGORIES.filter(cat => tokens.some(t => t.category === cat)),
    // fallback if new category appears
    ...tokens.map(t => t.category).filter(cat => !ALL_CATEGORIES.includes(cat as any))
  ])
);

  const handleChainSelect = (chain: ChainConfig) => {
    setActiveChain(chain);
    setShowChainSelector(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              mood === 'Playful' ? 'bg-indigo-500 text-white rotate-3' : 'bg-purple-600 text-white'
            }`}>
              <BarChart2Icon />
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${mood === 'Playful' ? 'font-display' : 'font-mono'}`}>
              Monax <span className="text-xs ml-2 opacity-50 font-normal border border-current px-1.5 py-0.5 rounded">Eco</span>
            </h1>
          </div>

          {/* Desktop Chain Selector */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {CHAINS.map(chain => (
                <button
                  key={chain.id}
                  onClick={() => setActiveChain(chain)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    activeChain.id === chain.id
                      ? (mood === 'Playful'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'bg-slate-700 text-white')
                      : (mood === 'Playful'
                          ? 'text-slate-600 hover:bg-slate-200'
                          : 'text-slate-400 hover:bg-slate-700/50')
                  }`}
                >
                  <ChainIcon chain={chain} />
                  <span>{chain.shortName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Chain Selector Button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowChainSelector(true)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
            >
              <ChainIcon chain={activeChain} />
              <span>{activeChain.shortName}</span>
              <ChevronDownIcon />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMood(mood === 'Playful' ? 'Professional' : 'Playful')}
              className={`p-2 rounded-full transition-colors ${
                mood === 'Playful' 
                  ? 'bg-gray-100 hover:bg-gray-200 text-slate-700' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Toggle mood"
            >
              <GlobeIcon />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex flex-wrap gap-2 justify-center">
            {['All', ...uniqueCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedCategory === cat
                    ? (mood === 'Playful'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-indigo-900 text-indigo-200')
                    : (mood === 'Playful'
                        ? 'bg-white text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">
              {viewMode === 'TreeMap' ? 'Top Tokens by Market Cap' : 'Token Holder Distribution'}
            </h2>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className={`w-2 h-2 rounded-full ${
                isDataLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              }`}></span>
              <span className="text-slate-600 dark:text-slate-400">
                {isDataLoading ? 'Updating...' : `Live Data · ${activeChain.name}`}
              </span>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 min-h-[500px] w-full rounded-2xl overflow-hidden relative transition-all duration-500 flex items-center justify-center border border-black/5 dark:border-white/5"
          style={{
            boxShadow: mood === 'Playful'
              ? '0 20px 40px -10px rgba(0,0,0,0.05)'
              : 'none',
            backgroundColor: mood === 'Playful'
              ? 'rgba(255,255,255,0.6)'
              : 'rgba(15, 23, 42, 0.6)',
          }}
        >
          {viewMode === 'TreeMap' ? (
            isDataLoading && tokens.length === 0 ? (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${
                  mood === 'Playful' ? 'border-indigo-500' : 'border-purple-500'
                }`}></div>
                <div className="text-lg font-medium opacity-60">
                  Scanning {activeChain.name}...
                </div>
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center opacity-60 p-8">
                <p className="mb-4">No tokens found matching current criteria.</p>
                <button
                  onClick={loadMarketData}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
                >
                  Retry Fetch
                </button>
              </div>
            ) : dimensions.width > 0 && dimensions.height > 0 ? (
              <Treemap
                data={filteredTokens}
                width={dimensions.width}
                height={dimensions.height}
                mood={mood}
                onTileClick={setSelectedToken}
                selectedId={selectedToken?.id}
              />
            ) : null
          ) : null}
        </div>
      </main>

      {/* Bottom Sheet Chain Selector Modal */}
      {showChainSelector && (
        <div 
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setShowChainSelector(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
          
          {/* Bottom Sheet */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-center">Select Chain</h3>
            </div>
            
            {/* Chain Options */}
            <div className="px-4 py-2 max-h-[70vh] overflow-y-auto">
              {CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleChainSelect(chain)}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
                    activeChain.id === chain.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      activeChain.id === chain.id
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      <ChainIcon chain={chain} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{chain.name}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{chain.shortName}</div>
                    </div>
                  </div>
                  
                  {activeChain.id === chain.id && (
                    <div className="text-indigo-500">
                      <CheckIcon />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Safe area spacing for mobile */}
            <div className="h-8" />
          </div>
        </div>
      )}

      <DetailModal token={selectedToken} onClose={() => setSelectedToken(null)} mood={mood} />

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
