import React, { useState, useEffect, useRef } from 'react';
import { PLAYFUL_COLORS, PROFESSIONAL_COLORS } from './constants';
import { Token, Mood, ViewMode } from './types';
import Treemap from './components/Treemap';
import DetailModal from './components/DetailModal';
import HolderMap from './components/HolderMap';
import { fetchMonadTokens } from './services/monadService';

// Simple SVG components without unused props
const BarChart2Icon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const RefreshCwIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
    <path d="M21 3v5h-5"></path>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
    <path d="M8 16H3v5"></path>
  </svg>
);

const MoonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
  </svg>
);

const SunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="m4.93 4.93 1.41 1.41"></path>
    <path d="m17.66 17.66 1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="m6.34 17.66-1.41 1.41"></path>
    <path d="m19.07 4.93-1.41 1.41"></path>
  </svg>
);

const NetworkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M16.2 7.8 12 12l-4.2-4.2"></path>
    <path d="m7.8 16.2 4.2-4.2 4.2 4.2"></path>
  </svg>
);

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('TreeMap');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [mood, setMood] = useState<Mood>('Playful');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [searchAddress, setSearchAddress] = useState('');
  const [activeAddress, setActiveAddress] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const themeColors = mood === 'Playful' ? PLAYFUL_COLORS : PROFESSIONAL_COLORS;

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadMarketData = async () => {
    setIsDataLoading(true);
    try {
        const liveTokens = await fetchMonadTokens();
        if (liveTokens) {
            setTokens(liveTokens);
        }
    } catch (e) {
        console.error("Failed to load market data", e);
    } finally {
        setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 60000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredTokens(tokens);
    } else if (selectedCategory === 'Stable') {
      setFilteredTokens(tokens.filter(t => t.isStable));
    } else {
      setFilteredTokens(tokens.filter(t => t.category === selectedCategory));
    }
  }, [selectedCategory, tokens]);

  useEffect(() => {
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color = themeColors.text;
    if (mood === 'Professional') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mood, themeColors]);

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchAddress.trim().length > 10) {
          setActiveAddress(searchAddress.trim());
      }
  };

  const categories = ['All', 'Stable', 'Meme', 'DeFi', 'AI', 'Wrapped', 'Staked'];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 font-sans ${mood === 'Professional' ? 'dark' : ''}`}>
      
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-500 ${
        mood === 'Playful' ? 'bg-white/70 border-gray-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mood === 'Playful' ? 'bg-indigo-500 text-white rotate-12' : 'bg-slate-700 text-slate-200'}`}>
              <NetworkIcon />
            </div>
            <h1 className="text-xl font-bold">Monax Explorer</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setViewMode('TreeMap')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'TreeMap' 
                    ? (mood === 'Playful' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-700 text-slate-200') 
                    : (mood === 'Playful' ? 'hover:bg-gray-100' : 'hover:bg-slate-800')
                }`}
                title="Token Treemap"
              >
                <BarChart2Icon />
              </button>
              <button 
                onClick={() => setViewMode('BubbleMap')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'BubbleMap' 
                    ? (mood === 'Playful' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-700 text-slate-200') 
                    : (mood === 'Playful' ? 'hover:bg-gray-100' : 'hover:bg-slate-800')
                }`}
                title="Holder Map"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="4"></circle>
                  <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line>
                  <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line>
                  <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line>
                  <line x1="14.83" y1="9.17" x2="18.36" y2="5.64"></line>
                  <line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line>
                </svg>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMood(mood === 'Playful' ? 'Professional' : 'Playful')}
                className={`p-2 rounded-lg transition-colors ${
                  mood === 'Playful' ? 'hover:bg-gray-100' : 'hover:bg-slate-800'
                }`}
                title={`Switch to ${mood === 'Playful' ? 'Professional' : 'Playful'} mode`}
              >
                {mood === 'Playful' ? <MoonIcon /> : <SunIcon />}
              </button>
              <button
                onClick={loadMarketData}
                disabled={isDataLoading}
                className={`p-2 rounded-lg transition-colors ${
                  isDataLoading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : mood === 'Playful' ? 'hover:bg-gray-100' : 'hover:bg-slate-800'
                }`}
                title="Refresh data"
              >
                <RefreshCwIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedCategory === category
                      ? mood === 'Playful'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-700 text-slate-100'
                      : mood === 'Playful'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} className="ml-auto flex gap-2">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Search token address..."
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  mood === 'Playful'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}
              />
              <button
                type="submit"
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  mood === 'Playful'
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                }`}
              >
                Search
              </button>
            </form>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
        >
          {isDataLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500">Loading market data...</p>
              </div>
            </div>
          ) : viewMode === 'TreeMap' ? (
            <Treemap
              width={dimensions.width}
              height={dimensions.height}
              tokens={filteredTokens}
              mood={mood}
              onSelectToken={setSelectedToken}
            />
          ) : (
            <HolderMap 
              width={dimensions.width}
              height={dimensions.height}
              tokens={filteredTokens}
              mood={mood}
              activeAddress={activeAddress}
              onSelectToken={setSelectedToken}
            />
          )}
        </div>
      </div>

      {selectedToken && (
        <DetailModal 
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          mood={mood}
        />
      )}
    </div>
  );
};

export default App;
