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
  };
  return <span className="text-xs font-bold">{icons[chain.id] || chain.shortName.charAt(0)}</span>;
};

/**
 * Why: keeps treemap density readable across mobile and desktop by capping rendered tiles
 * according to available viewport area instead of always showing the full dataset.
 */
const getAdaptiveTokenLimit = (width: number, height: number): number => {
  if (width <= 0 || height <= 0) {
    return 36;
  }

  const area = width * height;
  const isMobile = width < 768;

  if (isMobile) {
    if (area < 180000) return 24;
    if (area < 260000) return 30;
    return 36;
  }

  if (area < 420000) return 40;
  if (area < 720000) return 52;
  return 60;
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('TreeMap');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [mood, setMood] = useState<Mood>('Playful');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeChain, setActiveChain] = useState<ChainConfig>(CHAINS[0]);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

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
        setLastUpdatedAt(new Date());
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
    setFilteredTokens(tokens);
  }, [tokens]);

  const handleChainSelect = (chain: ChainConfig) => {
    setActiveChain(chain);
    setShowChainSelector(false);
  };

  return (
    <div className="min-h-screen bg-[#081433] text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-[#0a1638]/90 border-b border-white/10">
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
            <div className="flex gap-1 p-1 bg-[#11214b] rounded-lg">
              {CHAINS.map(chain => (
                <button
                  key={chain.id}
                  onClick={() => setActiveChain(chain)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    activeChain.id === chain.id
                      ? (mood === 'Playful'
                          ? 'bg-[#1a2f68] text-slate-100 shadow-sm'
                          : 'bg-[#1a2f68] text-slate-100')
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

      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {viewMode === 'TreeMap' ? 'Top Tokens by Market Cap' : 'Token Holder Distribution'}
            </h2>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className={`w-2 h-2 rounded-full ${
                isDataLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              }`}></span>
              <span className="text-slate-300">
                {isDataLoading ? 'Updating...' : `Live Data · ${activeChain.name}`}
              </span>
              {!isDataLoading && filteredTokens.length > 0 && (
                <span className="text-slate-300">
                  · {filteredTokens.length} tokens
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 min-h-[560px] w-full rounded-2xl overflow-hidden relative transition-all duration-500 flex items-center justify-center border border-[#1b2a52]"
          style={{
            boxShadow: mood === 'Playful'
              ? '0 20px 40px -10px rgba(0,0,0,0.05)'
              : 'none',
            backgroundColor: '#0b1638',
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
            ) : filteredTokens.length === 0 ? (
              <div className="text-center opacity-60 p-8">
                <p className="mb-4">No tokens found for the selected chain.</p>
                <button
                  onClick={() => loadMarketData()}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
                >
                  Retry
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

          {lastUpdatedAt && !isDataLoading && filteredTokens.length > 0 && (
            <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-slate-300">
              Generated: {lastUpdatedAt.toISOString().replace('T', ' ').slice(0, 16)} UTC
            </div>
          )}
        </div>
      </main>

      {/* Bottom Sheet Chain Selector Modal */}
      {showChainSelector && (
        <div 
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setShowChainSelector(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
          
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>
            
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-center">Select Chain</h3>
            </div>
            
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
