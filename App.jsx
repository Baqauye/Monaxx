import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---

export interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number; // Used for sizing
  volume24h: number;
  category: string; 
  dominance: number; // Calculated percentage
  imageUrl?: string;
  backupImageUrl?: string;
  pairUrl?: string;
  chainId?: string;
}

export interface Holder {
  address: string;
  balance: number;
  percentage: number;
  isContract: boolean;
  label?: string; // e.g. "Binance", "Deployer"
  connections?: string[]; // IDs of other holders this wallet interacted with
}

export type ViewMode = 'TreeMap' | 'BubbleMap';
export type Mood = 'Professional' | 'Playful';

export interface MarketSummary {
  headline: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  insight: string;
}

// --- CONSTANTS ---

// Palette for Playful Mood (Pastels)
const PLAYFUL_COLORS = {
  up: ['#86efac', '#4ade80', '#22c55e'], // Greens
  down: ['#fda4af', '#fb7185', '#f43f5e'], // Reds
  neutral: '#e2e8f0',
  text: '#1e293b',
  background: '#f0f9ff',
  cardBg: '#ffffff',
};

// Palette for Professional Mood (Dark, Neon)
const PROFESSIONAL_COLORS = {
  up: ['#059669', '#10b981', '#34d399'],
  down: ['#9f1239', '#e11d48', '#fb7185'],
  neutral: '#334155',
  text: '#f1f5f9',
  background: '#020617',
  cardBg: '#0f172a',
};

// --- UTILS ---

const formatCompactNumber = (num: number): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  
  // Handle very small numbers (no compact notation needed, just precision)
  if (Math.abs(num) < 1000 && Math.abs(num) > 0.001) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  const formatter = Intl.NumberFormat('en-US', {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  });
  
  return formatter.format(num).toLowerCase();
};

const formatPrice = (p: number) => {
    if (p < 0.000001) return p.toExponential(4);
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// --- SERVICES: GEMINI ---

// Access injected API key (assuming standard Vite define injection)
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const getMarketInsight = async (tokens: Token[]): Promise<MarketSummary> => {
  if (!ai) {
    console.warn("Gemini AI not initialized. API_KEY is missing.");
    return {
      headline: "AI Key Missing: Analysis Disabled",
      sentiment: "Neutral",
      insight: "Please configure your Gemini API Key in the environment settings to see AI insights."
    };
  }

  try {
    // Only consider tokens with significant market cap or volume
    const relevantTokens = tokens.filter(t => t.marketCap > 10000 || t.volume24h > 5000).slice(0, 10);
    
    const topGainers = [...relevantTokens].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
    const topLosers = [...relevantTokens].sort((a, b) => a.change24h - b.change24h).slice(0, 3);
    
    const marketSnapshot = {
      gainers: topGainers.map(t => `${t.symbol} (+${t.change24h.toFixed(1)}%)`),
      losers: topLosers.map(t => `${t.symbol} (${t.change24h.toFixed(1)}%)`),
      count: tokens.length
    };

    const prompt = `
      Act as a witty crypto analyst observing the Monad Testnet ecosystem. 
      Based on this snapshot: ${JSON.stringify(marketSnapshot)}.
      Provide a short, punchy 1-sentence headline and a brief 2-sentence insight.
      Determine if sentiment is Bullish, Bearish, or Neutral.
      Treat the data as real market movements.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
            insight: { type: Type.STRING },
          },
          required: ["headline", "sentiment", "insight"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as MarketSummary;
    }
    throw new Error("No response text");

  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      headline: "Monad Ecosystem Active",
      sentiment: "Neutral",
      insight: "The ecosystem is evolving rapidly. Watch for new deployments and liquidity shifts."
    };
  }
};


// --- SERVICES: MONAD (DATA FETCH) ---

// Placeholder key for the simulated Codex API access
const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

const guessCategory = (symbol: string, name: string): string => {
   const s = (symbol || '').toUpperCase();
   const n = (name || '').toUpperCase();
   
   if (s === 'WMON' || s === 'WETH' || s === 'WBTC' || n.includes('WRAPPED')) {
       return 'Wrapped';
   }

   if (s.startsWith('ST') || s.startsWith('EZ') || n.includes('STAKED') || n.includes('LIQUID')) {
       return 'Staked';
   }

   if (n.includes('AI') || n.includes('GPT') || s.includes('AI') || n.includes('INTELLIGENCE') || n.includes('AGENT')) {
       return 'AI';
   }

   if (
       n.includes('SWAP') || n.includes('DEX') || n.includes('FINANCE') || 
       n.includes('PROTOCOL') || n.includes('YIELD') || n.includes('PERP') || 
       n.includes('DAO')
    ) {
       return 'DeFi';
   }
   
   if (s.length < 5 || n.includes('COIN')) {
       return 'Meme';
   }

   return 'Other'; 
}

const fetchMonadTokens = async (): Promise<Token[]> => {
  // Query for Monad Testnet (143)
  const query = `
    query MonadTokens {
      filterTokens(
        filters: {
          network: [143]
          liquidity: { gt: 1000 }
        }
        limit: 150
        rankings: {
          attribute: trendingScore24
          direction: DESC
        }
      ) {
        results {
          priceUSD
          change24
          volume24
          marketCap
          token {
            address
            name
            symbol
            info {
              imageLargeUrl
              imageSmallUrl
              imageThumbUrl
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CODEX_API_KEY
      },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    
    if (result.errors) {
        console.error("Codex API Errors:", result.errors);
        return [];
    }

    const items = result.data?.filterTokens?.results || [];

    const tokens = items
        .filter((item) => {
            const t = item.token;
            if (!t || !t.symbol || !t.name) return false;

            const s = t.symbol.toUpperCase();
            const n = t.name.toUpperCase();
            
            // Allow stablecoins and major wrapped tokens to pass filter if they have market data
            if (s === 'USDC' || s === 'USDT' || s === 'WETH' || s === 'WMON') return true; 

            // Filter out obvious test/junk tokens
            const junkKeywords = ['FAUCET', 'TEST', 'MOCK', 'EXAMPLE', 'TETHER', 'MINED']; 
            if (junkKeywords.some(keyword => n.includes(keyword) || s.includes(keyword))) {
                return false;
            }

            return true;
        })
        .map((item) => {
            const t = item.token;
            const info = t.info || {};
            
            const price = parseFloat(item.priceUSD || '0');
            const change = parseFloat(item.change24 || '0') * 100;
            let mcap = parseFloat(item.marketCap || '0');
            const volume = parseFloat(item.volume24 || '0');
            
            // Simple fall back for market cap calculation if missing
            if (mcap === 0 && price > 0) {
               mcap = volume * 10; 
            }

            const dexscreenerImage = `https://dd.dexscreener.com/ds-data/tokens/monad/${t.address}.png`;
            const codexImage = info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl;

            return {
                id: t.address,
                symbol: t.symbol,
                name: t.name,
                price: price,
                change24h: change,
                marketCap: mcap,
                volume24h: volume,
                category: guessCategory(t.symbol, t.name),
                dominance: 0,
                imageUrl: dexscreenerImage,
                backupImageUrl: codexImage,
                pairUrl: `https://www.defined.fi/monad/${t.address}`,
                chainId: 'monad'
            };
        });
    
    tokens.sort((a, b) => b.marketCap - a.marketCap);

    const totalMcap = tokens.reduce((sum, t) => sum + t.marketCap, 0);
    return tokens.map(t => ({
        ...t,
        dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0
    }));

  } catch (error) {
    console.error("Failed to fetch Monad tokens:", error);
    return [];
  }
};

const fetchTokenHolders = async (tokenAddress: string): Promise<Holder[]> => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simple validation
    if (!tokenAddress || !tokenAddress.startsWith('0x') || tokenAddress.length < 40) {
        throw new Error("Invalid or short address format.");
    }

    const holders = [];
    const totalSupply = 1_000_000_000;
    let remainingSupply = totalSupply;

    // 1. LP
    holders.push({
        address: "0x33b8a61427181c953580B4c2077e5c940b54D350",
        balance: totalSupply * 0.15,
        percentage: 15,
        isContract: true,
        label: "Liquidity Pool V3"
    });
    remainingSupply -= totalSupply * 0.15;

    // 2. Whales
    const whaleCount = 5;
    for (let i = 0; i < whaleCount; i++) {
        const percent = (Math.random() * 5) + 2; 
        const amount = totalSupply * (percent / 100);
        const address = `0x${Math.random().toString(16).slice(2, 42)}`;
        holders.push({
            address,
            balance: amount,
            percentage: percent,
            isContract: i === 0 || i === 4 ? true : false, // Deployer is a contract
            label: i === 0 ? "Deployer/Bridge" : i === 1 ? "Vesting" : i === 2 ? "Exchange C" : undefined,
            connections: [address] 
        });
        remainingSupply -= amount;
    }

    // 3. Medium
    const mediumCount = 20;
    for (let i = 0; i < mediumCount; i++) {
        const percent = (Math.random() * 0.8) + 0.1; 
        const amount = totalSupply * (percent / 100);
        const parent = holders[Math.floor(Math.random() * 5)].address; 
        holders.push({
            address: `0x${Math.random().toString(16).slice(2, 42)}`,
            balance: amount,
            percentage: percent,
            isContract: false,
            connections: Math.random() > 0.7 ? [parent] : []
        });
        remainingSupply -= amount;
    }

    // 4. Dust
    // Distribute remaining supply among smaller holders
    const smallCount = 75;
    for (let i = 0; i < smallCount; i++) {
        const amount = (remainingSupply / smallCount) * (0.5 + Math.random()); 
        holders.push({
            address: `0x${Math.random().toString(16).slice(2, 42)}`,
            balance: amount,
            percentage: (amount / totalSupply) * 100,
            isContract: false
        });
    }

    return holders.filter(h => h.balance > 1000).sort((a, b) => b.balance - a.balance);
};


// --- ICONS ---

const BarChart2Icon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
);
const SparklesIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
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
const XIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const GlobeIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
);
const ActivityIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);
const TrendingUp = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);
const TrendingDown = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
    <polyline points="17 18 23 18 23 12"></polyline>
  </svg>
);


// --- COMPONENTS ---

interface TokenTileProps {
  token: Token;
  width: number;
  height: number;
  mood: Mood;
  onClick: (token: Token) => void;
  dimmed?: boolean;
  onHover?: (isHovering: boolean) => void;
}

const TokenTile: React.FC<TokenTileProps> = ({ token, width, height, mood, onClick, dimmed, onHover }) => {
  const [currentImgSrc, setCurrentImgSrc] = useState(token.imageUrl);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const isPositive = token.change24h >= 0;
  const colors = mood === 'Playful' ? PLAYFUL_COLORS : PROFESSIONAL_COLORS;

  useEffect(() => {
    setCurrentImgSrc(token.imageUrl);
    setImageError(false);
  }, [token.imageUrl, token.id]);

  const handleImageError = () => {
    if (currentImgSrc === token.imageUrl && token.backupImageUrl) {
      setCurrentImgSrc(token.backupImageUrl);
    } else {
      setImageError(true);
    }
  };

  const intensity = Math.min(Math.abs(token.change24h) / 15, 1);
  const colorIndex = intensity < 0.3 ? 0 : intensity < 0.6 ? 1 : 2;
  const bgColor = isPositive ? colors.up[colorIndex] : colors.down[colorIndex];
  
  const fontSize = Math.min(width / 5, height / 4, 24);
  const smallFontSize = Math.max(fontSize * 0.6, 10);
  
  const showText = width > 40 && height > 40;
  const showDetail = width > 80 && height > 60;
  
  const imgSize = Math.min(width * 0.4, height * 0.4, 60);
  const showImage = width > 50 && height > 50;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHover) onHover(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHover) onHover(false);
  };

  return (
    <div
      onClick={() => onClick(token)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        color: isPositive && mood === 'Playful' ? '#064e3b' : isPositive ? '#f0fdf4' : '#fff0f2',
        opacity: dimmed ? 0.3 : 1,
        filter: dimmed ? 'grayscale(0.6) blur(1px)' : 'none',
        transform: isHovered ? 'scale(1.02)' : dimmed ? 'scale(0.95)' : 'scale(1)',
        zIndex: isHovered ? 20 : 1,
        transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}
      className={`
        relative overflow-hidden cursor-pointer shadow-sm
        ${mood === 'Playful' ? 'rounded-2xl border-4 border-white/20' : 'rounded-none border border-black/10'}
        flex flex-col items-center justify-center text-center p-1
        ${!dimmed ? 'hover:shadow-2xl' : ''}
      `}
    >
      <div className="absolute pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 group-hover:scale-110 opacity-10 mix-blend-overlay">
        {currentImgSrc && !imageError ? (
            <img 
              src={currentImgSrc} 
              alt="" 
              className="w-32 h-32 object-cover grayscale blur-sm" 
              onError={handleImageError}
            />
        ) : (
            <div className="w-24 h-24 rounded-full bg-white/20" />
        )}
      </div>

      {showImage && (
        <div className="mb-1 relative z-10 transition-transform duration-300" style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}>
            {currentImgSrc && !imageError ? (
                <img 
                    src={currentImgSrc} 
                    alt={token.symbol}
                    style={{ width: imgSize, height: imgSize }}
                    className={`object-cover shadow-sm bg-white/10 ${mood === 'Playful' ? 'rounded-full border-2 border-white/40' : 'rounded-md'}`}
                    onError={handleImageError}
                />
            ) : (
                <div 
                    style={{ width: imgSize, height: imgSize }}
                    className={`flex items-center justify-center bg-black/10 dark:bg-white/10 backdrop-blur-sm ${mood === 'Playful' ? 'rounded-full' : 'rounded-md'}`}
                >
                    <span className="font-bold opacity-50 text-xs">{token.symbol.substring(0, 1)}</span>
                </div>
            )}
        </div>
      )}

      {showText && (
        <>
          <span 
            className={`font-bold uppercase tracking-tight truncate w-full px-1 z-10 ${mood === 'Playful' ? 'font-display' : 'font-sans'}`}
            style={{ fontSize: `${fontSize}px`, textShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          >
            {token.symbol}
          </span>
          <div className="flex items-center gap-1 font-medium z-10 opacity-90" style={{ fontSize: `${smallFontSize}px` }}>
            {isPositive ? <TrendingUp size={smallFontSize} /> : <TrendingDown size={smallFontSize} />}
            <span>{Math.abs(token.change24h).toFixed(2)}%</span>
          </div>
        </>
      )}

      {showDetail && (
        <span 
          className="mt-1 opacity-80 z-10 font-mono tracking-tighter" 
          style={{ fontSize: `${smallFontSize * 0.8}px` }}
        >
          ${formatPrice(token.price)}
        </span>
      )}
    </div>
  );
};


interface TreemapProps {
  data: Token[];
  width: number;
  height: number;
  mood: Mood;
  selectedId?: string | null;
  onTileClick: (token: Token) => void;
}

const Treemap: React.FC<TreemapProps> = ({ data, width, height, mood, selectedId, onTileClick }) => {
  const [hoveredId, setHoveredId] = useState(null);

  const root = useMemo(() => {
    if (data.length === 0 || width === 0 || height === 0) return null;

    const hierarchyData = {
      name: 'Market',
      children: data
    };

    const rootNode = d3.hierarchy(hierarchyData)
      .sum((d) => d.marketCap)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3.treemap()
      .size([width, height])
      .paddingInner(mood === 'Playful' ? 4 : 1)
      .paddingOuter(mood === 'Playful' ? 4 : 0)
      .round(true);

    treemapLayout(rootNode);
    return rootNode;
  }, [data, width, height, mood]);

  const transformStyle = useMemo(() => {
    if (!selectedId || !root) return { transform: 'translate(0px, 0px) scale(1)' };

    const selectedNode = root.leaves().find((n) => n.data.id === selectedId);
    
    if (!selectedNode) return { transform: 'translate(0px, 0px) scale(1)' };

    // Calculate center coordinates of the selected node
    const x = (selectedNode.x0 + selectedNode.x1) / 2;
    const y = (selectedNode.y0 + selectedNode.y1) / 2;
    
    // Use a moderate scale for accent, not full zoom
    const scale = 1.8; 
    
    // Calculate translation to center the selected point after scaling
    const translateX = width / 2 - x * scale;
    const translateY = height / 2 - y * scale;

    // Ensure the transformation doesn't move the entire map too far off-screen
    // Max translation should keep some content visible, but we rely on overflow:hidden for safety.
    return {
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`
    };

  }, [selectedId, root, width, height]);


  if (!root) return <div className="text-center opacity-50 p-4">Loading or No Data</div>;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transition: 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform',
          ...transformStyle
        }}
      >
        {root.leaves().map((leaf) => (
          <div
            key={leaf.data.id}
            style={{
              position: 'absolute',
              left: leaf.x0,
              top: leaf.y0,
              width: leaf.x1 - leaf.x0,
              height: leaf.y1 - leaf.y0,
              transition: 'all 0.5s ease-out'
            }}
          >
            <TokenTile
              token={leaf.data}
              width={leaf.x1 - leaf.x0}
              height={leaf.y1 - leaf.y0}
              mood={mood}
              onClick={onTileClick}
              dimmed={hoveredId !== null && hoveredId !== leaf.data.id && leaf.data.id !== selectedId}
              onHover={(isHovering) => setHoveredId(isHovering ? leaf.data.id : null)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};


interface HolderMapProps {
  tokenAddress: string;
  width: number;
  height: number;
  mood: Mood;
}

const HolderMap: React.FC<HolderMapProps> = ({ tokenAddress, width, height, mood }) => {
  const svgRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tokenAddress) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setData([]);
      
      try {
        const holders = await fetchTokenHolders(tokenAddress);
        setData(holders);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load holder data. Please check the address.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tokenAddress]);

  useEffect(() => {
    if (!data.length || !svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const colorScale = d3.scaleOrdinal(
      mood === 'Playful' 
        ? ['#f472b6', '#c084fc', '#818cf8', '#22d3ee', '#34d399'] 
        : ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
    );

    const nodes = data.map(d => ({
      ...d,
      r: Math.max(Math.sqrt(d.percentage) * (width < 600 ? 15 : 25), 4),
      x: width / 2 + (Math.random() - 0.5) * 50,
      y: height / 2 + (Math.random() - 0.5) * 50
    }));

    const links = [];
    nodes.forEach((source) => {
        if (source.connections) {
            source.connections.forEach((targetId) => {
                const target = nodes.find((n) => n.address === targetId);
                if (target && source.address !== target.address) {
                    links.push({ source, target });
                }
            });
        }
    });

    const simulation = d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-200)) // Increased strength for repulsion
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d) => d.r + 5).strength(0.8)) // Increased padding
      .force("link", d3.forceLink(links).id(d => d.address).distance(150).strength(0.1))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    const link = svg.append("g")
        .attr("stroke", mood === 'Playful' ? "#cbd5e1" : "#334155")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", 1.5);

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    node.append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => d.isContract ? (mood === 'Playful' ? '#fbbf24' : '#f59e0b') : colorScale(d.address))
      .attr("stroke", mood === 'Playful' ? '#fff' : '#000')
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8)
      .style("filter", mood === 'Professional' ? "drop-shadow(0 0 8px rgba(100,255,255,0.3))" : "drop-shadow(0 4px 6px rgba(0,0,0,0.2))");

    node.filter((d) => d.r > 25 || d.label)
      .append("text")
      .text((d) => d.label || `${d.percentage.toFixed(1)}%`)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", (d) => d.isContract ? '#333' : 'white')
      .attr("font-size", (d) => Math.min(d.r * 0.4, 14))
      .attr("font-weight", "bold")
      .attr("pointer-events", "none");

    node.append("title")
      .text((d) => `${d.label ? d.label + '\n' : ''}${d.address}\nBalance: ${formatCompactNumber(d.balance)} (${d.percentage.toFixed(2)}%)`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node
        .attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, width, height, mood, tokenAddress]);

  if (loading) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center">
              <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${mood === 'Playful' ? 'border-indigo-500' : 'border-purple-500'}`}></div>
              <div className="mt-4 opacity-60 font-mono">Scanning Ledger...</div>
          </div>
      );
  }

  if (error) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8">
              <div className="text-red-500 text-2xl mb-4">⚠️</div>
              <div className="text-xl font-bold mb-2 opacity-80">Error Loading Data</div>
              <div className="text-sm opacity-60 text-center">{error}</div>
          </div>
      );
  }

  if (!tokenAddress) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
              <div className="text-6xl mb-4">🔍</div>
              <div className="text-xl font-bold">Enter a Contract Address</div>
              <div>Visualize holder distribution instantly (Monad Testnet)</div>
          </div>
      );
  }

  if (data.length === 0 && !loading) {
       return (
          <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
              <div className="text-6xl mb-4">🤷</div>
              <div className="text-xl font-bold">No Holders Found</div>
              <div>Try a different Monad contract address.</div>
          </div>
      );
  }

  return (
    <div className="w-full h-full overflow-hidden relative">
        <svg 
            ref={svgRef} 
            width={width} 
            height={height} 
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full cursor-grab active:cursor-grabbing"
        />
        <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs p-2 rounded backdrop-blur-md">
            Token Holder Network (Simulated)
        </div>
    </div>
  );
};


interface DetailModalProps {
  token: Token | null;
  onClose: () => void;
  mood: Mood;
}

const DetailModal: React.FC<DetailModalProps> = ({ token, onClose, mood }) => {
  const [currentImgSrc, setCurrentImgSrc] = useState(token?.imageUrl);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (token) {
        setCurrentImgSrc(token.imageUrl);
        setImageError(false);
    }
  }, [token]);

  if (!token) return null;

  const handleImageError = () => {
    if (currentImgSrc === token.imageUrl && token.backupImageUrl) {
        setCurrentImgSrc(token.backupImageUrl);
    } else {
        setImageError(true);
    }
  };

  const isPositive = token.change24h >= 0;

  const overlayClass = mood === 'Playful' 
    ? 'bg-black/20 backdrop-blur-sm' 
    : 'bg-black/60 backdrop-blur-md border border-white/10';
  
  const cardClass = mood === 'Playful'
    ? 'bg-white rounded-3xl shadow-2xl border-4 border-white'
    : 'bg-slate-900 rounded-none border border-slate-700 shadow-2xl text-white';


  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayClass}`} onClick={onClose}>
      <div 
        className={`w-full max-w-lg overflow-hidden relative animate-[fadeIn_0.2s_ease-out] ${cardClass}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex justify-between items-start">
          <div className="flex items-start gap-4">
             {currentImgSrc && !imageError && (
                 <img 
                    src={currentImgSrc} 
                    alt={token.name} 
                    className={`w-16 h-16 object-cover shadow-md ${mood === 'Playful' ? 'rounded-2xl' : 'rounded-full border border-white/10'}`} 
                    onError={handleImageError}
                    // Placeholder for when image fails
                    fallback="https://placehold.co/60x60/334155/ffffff?text=?"
                 />
             )}
             <div>
                <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold opacity-50 px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200">
                    {token.category}
                </span>
                {token.chainId && (
                    <span className="text-xs font-bold opacity-50 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 uppercase">
                        {token.chainId}
                    </span>
                )}
                </div>
                <h2 className={`text-3xl font-bold leading-tight ${mood === 'Playful' ? 'font-display text-slate-800' : 'font-sans'}`}>
                {token.name}
                </h2>
                <span className="text-lg opacity-40 font-bold">{token.symbol}</span>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <XIcon size={24} />
          </button>
        </div>

        <div className="px-6 pb-6">
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-mono font-medium ${mood === 'Playful' ? 'text-slate-700' : 'text-white'}`}>
                ${formatPrice(token.price)}
              </span>
              <span className={`text-2xl font-bold px-2 py-1 rounded ${isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                {isPositive ? '+' : ''}{token.change24h.toFixed(2)}%
              </span>
            </div>
        </div>

        <div className={`p-6 grid grid-cols-2 gap-4 ${mood === 'Playful' ? 'bg-slate-50' : 'bg-slate-950'}`}>
          <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="text-sm opacity-50 mb-1">Market Cap</div>
            <div className="font-mono font-medium text-lg truncate">
              ${formatCompactNumber(token.marketCap)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="text-sm opacity-50 mb-1">24h Volume</div>
            <div className="font-mono font-medium text-lg truncate">
              ${formatCompactNumber(token.volume24h)}
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
            <a 
              href={token.pairUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-transform active:scale-95 no-underline ${
              mood === 'Playful' 
                ? 'bg-black text-white rounded-xl shadow-lg hover:-translate-y-1' 
                : 'bg-indigo-600 text-white rounded-none hover:bg-indigo-500'
            }`}>
              <ActivityIcon size={18} /> View on Defined.fi
            </a>
            <button className={`p-3 transition-colors ${
              mood === 'Playful' 
                ? 'bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-600' 
                : 'bg-slate-800 rounded-none hover:bg-slate-700 text-slate-300'
            }`}>
              <GlobeIcon size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

const App = () => {
  const [viewMode, setViewMode] = useState('TreeMap');
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [mood, setMood] = useState('Playful');
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [summary, setSummary] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [searchAddress, setSearchAddress] = useState('');
  const [activeAddress, setActiveAddress] = useState('');

  const containerRef = useRef(null);
  const themeColors = mood === 'Playful' ? PLAYFUL_COLORS : PROFESSIONAL_COLORS;

  // 1. Handle Resize/Dimensions
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        // Subtract padding/margin if necessary, but using clientWidth/Height is safer.
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Load Market Data (Initial and Interval)
  const loadMarketData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 60000); 
    return () => clearInterval(interval);
  }, [loadMarketData]);

  // 3. Filter Tokens by Category
  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredTokens(tokens);
    } else {
      setFilteredTokens(tokens.filter(t => t.category === selectedCategory));
    }
  }, [selectedCategory, tokens]);

  // 4. Fetch AI Insight
  const fetchInsight = useCallback(async () => {
    if (!API_KEY || tokens.length === 0) return;
    setLoadingInsight(true);
    const result = await getMarketInsight(filteredTokens.length > 0 ? filteredTokens : tokens);
    setSummary(result);
    setLoadingInsight(false);
  }, [filteredTokens, tokens]);

  useEffect(() => {
    // Only fetch insight once on initial load if data is ready
    if (tokens.length > 0 && !summary && API_KEY) {
        fetchInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]); 

  // 5. Theme / Mood Management
  useEffect(() => {
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color = themeColors.text;
    if (mood === 'Professional') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mood, themeColors]);

  // 6. Holder Map Search Handler
  const handleSearch = (e) => {
      e.preventDefault();
      const address = searchAddress.trim();
      if (address.length > 10) {
          setActiveAddress(address);
      } else {
          setActiveAddress('');
      }
  };

  const categories = useMemo(() => {
      const cats = new Set(tokens.map(t => t.category));
      return ['All', ...Array.from(cats)].filter(c => c !== 'Other' || c === 'All');
  }, [tokens]);


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
                <span className="text-sm px-4 py-2 rounded-full animate-pulse opacity-60">
                    <SparklesIcon size={16} className="inline mr-2 text-purple-500" />
                    Reading the blockchain ledger...
                </span>
                ) : summary ? (
                <div 
                    className={`flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer hover:scale-[1.02] transition-transform ${
                    mood === 'Playful' ? 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200' : 'bg-slate-800 border border-slate-700'
                    }`}
                    onClick={fetchInsight}
                >
                    <SparklesIcon size={16} className="text-purple-500" />
                    <span className="text-sm font-medium opacity-90">{summary.headline}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    summary.sentiment === 'Bullish' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 
                    summary.sentiment === 'Bearish' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                    }`}>
                    {summary.sentiment}
                    </span>
                </div>
                ) : (
                    <button onClick={fetchInsight} className="text-sm opacity-50 hover:opacity-100 flex items-center gap-1">
                        <RefreshCwIcon size={14} /> Fetch AI Analysis
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
                        className={`w-full px-4 py-2 rounded-l-lg border-y border-l focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mood === 'Playful' ? 'bg-white border-gray-200' : 'bg-slate-900 border-slate-700 text-white'}`}
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
              onClick={() => {
                setViewMode(v => v === 'TreeMap' ? 'BubbleMap' : 'TreeMap');
                setSelectedToken(null); // Clear selected token when switching view
                setActiveAddress(''); // Clear active address when going back to Treemap
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                 viewMode === 'BubbleMap' 
                 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                 : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
              }`}
              title="Toggle View Mode"
            >
                <NetworkIcon size={18} />
                <span className="hidden sm:inline">{viewMode === 'TreeMap' ? 'Holder Map' : 'Market Map'}</span>
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
                <form onSubmit={handleSearch} className="w-full flex items-center shadow-md rounded-lg">
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
                {viewMode === 'TreeMap' ? 'Top Tokens by Market Cap' : `Token Holder Distribution ${activeAddress ? 'for...' : ''}`}
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
            boxShadow: mood === 'Playful' ? '0 20px 40px -10px rgba(0,0,0,0.05)' : '0 10px 30px -5px rgba(0,0,0,0.5)',
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
                {categories.map(cat => (
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


