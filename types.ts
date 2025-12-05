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
  decimals?: number; // From BlockVision
  totalSupply?: string; // From BlockVision
  liquidity?: number; // From Codex
}

export interface Holder {
  address: string;
  balance: number;
  percentage: number;
  isContract: boolean;
  label?: string; // e.g. "Binance", "Deployer"
  connections?: string[]; // IDs of other holders this wallet interacted with
}

export type ViewMode = 'Tokens' | 'HoldersMap' | 'Protocols'; // Update ViewMode
export type Mood = 'Professional' | 'Playful';

export interface MarketSummary {
  headline: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  insight: string;
}
