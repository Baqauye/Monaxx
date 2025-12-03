import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MOCK_TOKENS_INIT, PLAYFUL_COLORS, PROFESSIONAL_COLORS } from './constants';
import { Token, Mood, MarketSummary } from './types';
import Treemap from './components/Treemap';
import DetailModal from './components/DetailModal';
import { getMarketInsight } from './services/geminiService';
import { fetchMonadTokens } from './services/monadService';
import { Sparkles, BarChart2, Zap, RefreshCw, Moon, Sun, Search, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>(MOCK_TOKENS_INIT);
  const [mood, setMood] = useState<Mood>('Playful');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const themeColors = mood === 'Playful' ? PLAYFUL_COLORS : PROFESSIONAL_COLORS;

  // Handle Resize for D3
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
    handleResize(); // Init

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Live Monad Data
  const loadMarketData = async () => {
    setIsDataLoading(true);
    try {
        const liveTokens = await fetchMonadTokens();
        if (liveTokens.length > 0) {
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
    const interval = setInterval(loadMarketData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  // Fetch AI Insight
  const fetchInsight = useCallback(async () => {
    if (!process.env.API_KEY) return;
    setLoadingInsight(true);
    // Use the current tokens state for insight
    const result = await getMarketInsight(tokens);
    setSummary(result);
    setLoadingInsight(false);
  }, [tokens]);

  // Initial insight fetch once tokens are loaded or changed significantly
  useEffect(() => {
    if (tokens.length > 0 && !summary && process.env.API_KEY) {
        fetchInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]); 

  // Toggle Body Background
  useEffect(() => {
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color = themeColors.text;
  }, [mood, themeColors]);


  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 font-sans ${mood === 'Professional' ? 'dark' : ''}`}>
      
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-500 ${
        mood === 'Playful' ? 'bg-white/70 border-gray-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mood === 'Playful' ? 'bg-indigo-500 text-white rotate-3' : 'bg-purple-600 text-white'}`}>
              <BarChart2 size={24} strokeWidth={2.5} />
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${mood === 'Playful' ? 'font-display' : 'font-mono'}`}>
              Monax
              <span className="text-xs ml-2 opacity-50 font-normal border border-current px-1.5 py-0.5 rounded">Monad Ecosystem</span>
            </h1>
          </div>

          {/* AI Insight Bar (Desktop) */}
          <div className="hidden md:flex flex-1 mx-8 items-center justify-center">
            {loadingInsight ? (
              <span className="text-xs animate-pulse opacity-50">Analysing Monad ecosystem...</span>
            ) : summary ? (
              <div 
                className={`flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer hover:scale-105 transition-transform ${
                  mood === 'Playful' ? 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200' : 'bg-slate-800 border border-slate-700'
                }`}
                onClick={fetchInsight}
              >
                <Sparkles size={16} className={mood === 'Playful' ? 'text-purple-500' : 'text-emerald-400'} />
                <span className="text-sm font-medium opacity-90">{summary.headline}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  summary.sentiment === 'Bullish' ? 'bg-green-500/20 text-green-600' : 
                  summary.sentiment === 'Bearish' ? 'bg-red-500/20 text-red-600' : 'bg-gray-500/20 text-gray-500'
                }`}>
                  {summary.sentiment}
                </span>
              </div>
            ) : (
                <button onClick={fetchInsight} className="text-sm opacity-50 hover:opacity-100 flex items-center gap-1">
                    <RefreshCw size={14} /> AI Analysis
                </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMood(m => m === 'Playful' ? 'Professional' : 'Playful')}
              className={`p-2 rounded-full transition-all ${
                mood === 'Playful' 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                  : 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
              }`}
            >
              {mood === 'Playful' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className={`p-2 rounded-full hidden sm:block ${mood === 'Playful' ? 'hover:bg-gray-100' : 'hover:bg-slate-800'}`}>
                <Search size={20} />
            </button>
             <button className={`p-2 rounded-full sm:hidden ${mood === 'Playful' ? 'hover:bg-gray-100' : 'hover:bg-slate-800'}`}>
                <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2 sm:p-4 md:p-6 max-w-[1600px] w-full mx-auto flex flex-col gap-4">
        
        {/* Mobile Insight (if needed) */}
        {summary && (
            <div className="md:hidden text-center text-sm opacity-80 animate-fade-in mb-2 px-4">
                <span className="font-bold">{summary.headline}:</span> {summary.insight}
            </div>
        )}

        <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold opacity-70 uppercase tracking-wider">Top Ecosystem Tokens</h2>
            <div className="flex items-center gap-2 text-xs">
                 <span className={`w-2 h-2 rounded-full ${isDataLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                 {isDataLoading ? 'Fetching from Codex...' : 'Live Monad Data'}
            </div>
        </div>

        {/* Treemap Container */}
        <div 
          ref={containerRef} 
          className="flex-1 min-h-[500px] w-full rounded-2xl overflow-hidden relative transition-all duration-500"
          style={{ 
            boxShadow: mood === 'Playful' ? '0 20px 40px -10px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          {dimensions.width > 0 && dimensions.height > 0 && (
            <Treemap
              data={tokens}
              width={dimensions.width}
              height={dimensions.height}
              mood={mood}
              onTileClick={setSelectedToken}
            />
          )}
        </div>

        {/* Categories / Filter Bar */}
        <div className="flex flex-wrap justify-center gap-2 pb-8">
            {['All', 'Layer 1', 'Meme', 'DeFi', 'Gaming', 'AI'].map(cat => (
                <button 
                    key={cat}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        cat === 'All' 
                            ? (mood === 'Playful' ? 'bg-black text-white' : 'bg-indigo-600 text-white')
                            : (mood === 'Playful' ? 'bg-white hover:bg-gray-50 shadow-sm text-gray-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
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