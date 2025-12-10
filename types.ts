// -----------------------------
// Token Categories
// -----------------------------
export type TokenCategory =
  | 'Meme Coins'
  | 'AI Tokens'
  | 'Stablecoins'
  | 'DeFi Tokens'
  | 'Governance Tokens'
  | 'Utility Tokens'
  | 'GameFi Tokens'
  | 'RWA Tokens'
  | 'Infrastructure & Tools'
  | 'Privacy Tokens';

// -----------------------------
// Token Interface (Merged)
// -----------------------------
export interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;

  // category is now typed strongly using TokenCategory
  category: TokenCategory;

  dominance: number;

  // optional URLs and metadata
  imageUrl?: string;
  backupImageUrl?: string;
  pairUrl?: string;

  // multi-chain support (unified)
  chainId: string;     // e.g., "monad", "eth", "sol"
  networkId: number;   // e.g., 143, 1, 101

  isStable?: boolean;
  score?: number;
}

// -----------------------------
// Holder Interface
// -----------------------------
export interface Holder {
  address: string;
  balance: number;
  percentage: number;
  isContract: boolean;
  label?: string;
  connections?: string[];
}

// -----------------------------
// UI Types
// -----------------------------
export type ViewMode = 'TreeMap' | 'BubbleMap';
export type Mood = 'Professional' | 'Playful';

// -----------------------------
// Chain Configuration
// -----------------------------
export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  icon?: string; // optional emoji or icon string
}

export const CHAINS: ChainConfig[] = [
  { id: 1, name: 'Ethereum', shortName: 'ETH' },
  { id: 56, name: 'BNB Chain', shortName: 'BNB' },
  { id: 8453, name: 'Base', shortName: 'Base' },
  { id: 101, name: 'Solana', shortName: 'SOL' },
  { id: 143, name: 'Monad', shortName: 'Monad' },
  { id: 530, name: 'HyperEVM', shortName: 'HyperEVM' },
];
