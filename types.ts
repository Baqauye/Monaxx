// types.ts

// Existing Token type
export interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number; // Used for sizing
  volume24h: number;
  category: string; // e.g., 'Meme', 'DeFi', 'AI', 'NadFun', 'Protocol'
  dominance: number; // Calculated percentage
  imageUrl?: string;
  backupImageUrl?: string;
  pairUrl?: string;
  chainId?: string;
  isStable?: boolean; // New field for stablecoins
  fdv?: number; // Fully Diluted Valuation
  liquidity?: number; // Total Liquidity
  holders?: number; // Number of holders
  totalSupply?: string; // Total supply string
}

// Existing Holder type
export interface Holder {
  address: string;
  balance: number;
  percentage: number;
  isContract: boolean;
  label?: string; // e.g. "Binance", "Deployer"
  connections?: string[]; // IDs of other holders this wallet interacted with
}

// New Protocol type
export interface Protocol {
  id: string; // Could be the protocol name or a unique identifier
  name: string;
  logo: string;
  website: string;
  tvl: number; // Total Value Locked
  tvlChange24h?: number; // Change in TVL over 24 hours
  volume24h?: number; // Trading volume (if applicable)
  volumeChange24h?: number; // Change in volume over 24 hours
  fees24h?: number; // Fees generated (if applicable)
  category: string; // e.g., 'Dex', 'Lending', 'Yield', 'Other'
  activity: '12h' | '24h' | '7d'; // Indicator for recent activity metric used for sizing/ranking
  dominance?: number; // Calculated percentage based on TVL or another metric
  chainId?: string;
}

// Extend ViewMode
export type ViewMode = 'Tokens' | 'HoldersMap' | 'NadFunTokens' | 'Protocols'; // Updated ViewMode
export type Mood = 'Professional' | 'Playful';

export interface MarketSummary {
  headline: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  insight: string;
}
