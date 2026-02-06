// types.ts
export interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  category: string;
  dominance: number;
  imageUrl?: string;
  backupImageUrl?: string;
  pairUrl?: string;
  chainId?: string;
  isStable?: boolean;
  score?: number;
}

export interface Holder {
  address: string;
  balance: number;
  percentage: number;
  isContract: boolean;
  label?: string;
  connections?: string[];
}

export type ViewMode = 'TreeMap' | 'BubbleMap';
export type Mood = 'Professional' | 'Playful';

export interface MarketSummary {
  headline: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  insight: string;
}

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  rpcUrl?: string;
}

export const CHAINS: ChainConfig[] = [
  { id: 143, name: 'Monad Mainnet', shortName: 'Monad' },
  { id: 1, name: 'Ethereum', shortName: 'ETH' },
  { id: 56, name: 'BNB Chain', shortName: 'BNB' },
  { id: 8453, name: 'Base', shortName: 'Base' },
  { id: 101, name: 'Solana', shortName: 'SOL' },
  { id: 530, name: 'Sonic', shortName: 'Sonic' },
];

// Comprehensive token categories
export const TOKEN_CATEGORIES = [
  'All',
  'Memes',
  'Wrapped',
  'Stablecoins'
] as const;

export type TokenCategory = typeof TOKEN_CATEGORIES[number] | 'Other';
