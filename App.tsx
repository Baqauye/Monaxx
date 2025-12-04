import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PLAYFUL_COLORS, PROFESSIONAL_COLORS } from './constants';
import { Token, Mood, MarketSummary, ViewMode } from './types';
import Treemap from './components/Treemap';
import DetailModal from './components/DetailModal';
import HolderMap from './components/HolderMap';
import { getMarketInsight } from './services/geminiService';
import { fetchMonadTokens } from './services/monadService';

const BarChart2Icon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
);
const SparklesIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"></path></svg>
);
const RefreshCwIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
);
const MoonIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
);
const SunIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
);
const NetworkIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16.2 7.8 12 12l-4.2-4.2"></path><path d="m7.8 16.2 4.2-4.2 4.2 4.2"></path></svg>
);

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('TreeMap');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [mood, setMood] = useState<Mood>('Playful');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
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
    } else {
      setFilteredTokens(tokens.filter(t => t.category === selectedCategory));
    }
  }, [selectedCategory, tokens]);

  const fetchInsight = useCallback(async () => {
    if (!process.env.API_KEY || tokens.length === 0) return;
    setLoadingInsight(true);
    const result = await getMarketInsight(filteredTokens.length > 0 ? filteredTokens : tokens);
    setSummary(result);
    setLoadingInsight(false);
  }, [filteredTokens, tokens]);

  useEffect(() => {
    if (tokens.length > 0 && !summary && process.env.API_KEY) {
        fetchInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]); 

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

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 font-sans ${mood === 'Professional' ? 'dark' : ''}`}>
      
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-500 ${
        mood === 'Playful' ? 'bg-white/70 border-gray-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mood === 'Playful' ? 'bg-indigo-500 text-white rotate-3' : 'bg-purple-600 text-white'}`}>
              <BarChart2Icon size={24} />
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${mood === 'Playful' ? 'font-display' : 'font-mono'}`}>
              Monax
              <span className="text-xs ml-2 opacity-50 font-normal border border-current px-1.5 py-0.5 rounded">Monad</span>
            </h1>
          </div>

          <div className="hidden md:flex flex-1 mx-8 items-center justify-center">
            {viewMode === 'TreeMap' && (
                loadingInsight ? (
                <span className="text-xs animate-pulse opacity-50">Reading the blockchain...</span>
                ) : summary ? (
                <div 
                    className={`flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer hover:scale-105 transition-transform ${
                    mood === 'Playful' ? 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200' : 'bg-slate-800 border border-slate-700'
                    }`}
                    onClick={fetchInsight}
                >
                    <SparklesIcon size={16} className="text-purple-500" />
                    <span className="text-sm font-medium opacity-90">{summary.headline}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    summary.sentiment === 'Bullish' ? 'bg-green-500/10 text-green-600' : 
                    summary.sentiment === 'Bearish' ? 'bg-red-500/10 text-red-600' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                    {summary.sentiment}
                    </span>
                </div>
                ) : (
                    <button onClick={fetchInsight} className="text-sm opacity-50 hover:opacity-100 flex items-center gap-1">
                        <RefreshCwIcon size={14} /> AI Analysis
                    </button>
                )
            )}
            
            {viewMode === 'BubbleMap' && (
                <form onSubmit={handleSearch} className="w-full max-w-md flex items-center">
                    <input 
                        type="text" 
                        placeholder="Enter Monad Contract Address (0x...)"
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        className={`w-full px-4 py-2 rounded-l-lg border-y border-l focus:outline-none ${mood === 'Playful' ? 'bg-white border-gray-200' : 'bg-slate-900 border-slate-700 text-white'}`}
                    />
                    <button 
                        type="submit"
                        className="px-4 py-2 rounded-r-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Scan
                    </button>
                </form>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(v => v === 'TreeMap' ? 'BubbleMap' : 'TreeMap')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                 viewMode === 'BubbleMap' 
                 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                 : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
              }`}
              title="Toggle View Mode"
            >
                <NetworkIcon size={18} />
                <span className="hidden sm:inline">{viewMode === 'TreeMap' ? 'Market Map' : 'Holder Map'}</span>
            </button>

            <button 
              onClick={() => setMood(m => m === 'Playful' ? 'Professional' : 'Playful')}
              className={`p-2 rounded-full transition-all ${
                mood === 'Playful' 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                  : 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
              }`}
            >
              {mood === 'Playful' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 md:p-6 max-w-[1600px] w-full mx-auto flex flex-col gap-4">
        
        {summary && viewMode === 'TreeMap' && (
            <div className="md:hidden text-center text-sm opacity-80 animate-fade-in mb-2 px-4">
                <span className="font-bold">{summary.headline}:</span> {summary.insight}
            </div>
        )}

        {viewMode === 'BubbleMap' && (
             <div className="md:hidden mb-4">
                <form onSubmit={handleSearch} className="w-full flex items-center">
                    <input 
                        type="text" 
                        placeholder="Contract Address"
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        className={`flex-1 px-4 py-2 rounded-l-lg border focus:outline-none ${mood === 'Playful' ? 'bg-white border-gray-200' : 'bg-slate-900 border-slate-700'}`}
                    />
                    <button type="submit" className="px-4 py-2 rounded-r-lg bg-indigo-600 text-white">Scan</button>
                </form>
             </div>
        )}

        <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold opacity-70 uppercase tracking-wider">
                {viewMode === 'TreeMap' ? 'Top Tokens by Market Cap' : 'Token Holder Distribution'}
            </h2>
            <div className="flex items-center gap-2 text-xs">
                 <span className={`w-2 h-2 rounded-full ${isDataLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                 {isDataLoading ? 'Updating...' : 'Live Data'}
            </div>
        </div>

        <div 
          ref={containerRef} 
          className="flex-1 min-h-[500px] w-full rounded-2xl overflow-hidden relative transition-all duration-500 flex items-center justify-center border border-black/5 dark:border-white/5"
          style={{ 
            boxShadow: mood === 'Playful' ? '0 20px 40px -10px rgba(0,0,0,0.05)' : 'none',
            backgroundColor: mood === 'Playful' ? 'rgba(255,255,255,0.6)' : 'rgba(15, 23, 42, 0.6)'
          }}
        >
          {viewMode === 'TreeMap' ? (
            isDataLoading && tokens.length === 0 ? (
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${mood === 'Playful' ? 'border-indigo-500' : 'border-purple-500'}`}></div>
                    <div className="text-lg font-medium opacity-60">Scanning Monad Chain...</div>
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
            ) : (
                dimensions.width > 0 && dimensions.height > 0 && (
                    <Treemap
                        data={filteredTokens}
                        width={dimensions.width}
                        height={dimensions.height}
                        mood={mood}
                        onTileClick={setSelectedToken}
                        selectedId={selectedToken?.id}
                    />
                )
            )
          ) : (
            dimensions.width > 0 && dimensions.height > 0 && (
                <HolderMap 
                    tokenAddress={activeAddress}
                    width={dimensions.width} 
                    height={dimensions.height} 
                    mood={mood} 
                />
            )
          )}
        </div>

        {viewMode === 'TreeMap' && (
            <div className="flex flex-wrap justify-center gap-2 pb-8">
                {['All', 'Meme', 'AI', 'DeFi', 'Staked', 'Wrapped'].map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedCategory === cat
                                ? (mood === 'Playful' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'bg-indigo-600 text-white shadow-lg scale-105')
                                : (mood === 'Playful' ? 'bg-white hover:bg-gray-50 shadow-sm text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        )}
      </main>

      <DetailModal 
        token={selectedToken} 
        onClose={() => setSelectedToken(null)} 
        mood={mood}
      />
    </div>
  );
};

export default App;