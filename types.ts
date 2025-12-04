// types.ts
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
  isStable?: boolean; // New field for stablecoins
  score?: number; // Added for ranking algorithm
}

// New interface for Nad.fun specific tokens
export interface NadFunToken extends Omit<Token, 'price' | 'change24h' | 'marketCap' | 'volume24h' | 'score'> {
  tokenURI: string;
  creator: string;
  pool: string;
  virtualMonReserve: number;
  virtualTokenReserve: number;
  targetTokenAmount: number;
  timestamp: number; // Milliseconds since epoch when created/detected
  // Override category
  category: 'NadFun';
}

export interface Holder {
  address: string;
  balance: number;
  percentage: number;
  isContract: boolean;
  label?: string; // e.g. "Binance", "Deployer"
  connections?: string[]; // IDs of other holders this wallet interacted with
}

// Extend ViewMode
export type ViewMode = 'TreeMap' | 'BubbleMap' | 'NadFunTimeline'; // Added 'NadFunTimeline'
export type Mood = 'Professional' | 'Playful';

export interface MarketSummary {
  headline: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  insight: string;
}
