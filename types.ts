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
  chainId: string; // e.g., 'monad', 'eth', 'sol'
  networkId: number; // e.g., 143, 1, 101
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

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  icon?: string; // optional emoji or class
}

export const CHAINS: ChainConfig[] = [
  { id: 1, name: 'Ethereum', shortName: 'ETH' }, 
  { id: 56, name: 'BNB Chain', shortName: 'BNB' },
  { id: 8453, name: 'Base', shortName: 'Base' },
  { id: 101, name: 'Solana', shortName: 'SOL' },
  { id: 143, name: 'Monad', shortName: 'Monad' },
  { id: 530, name: 'HyperEVM', shortName: 'HyperEVM' },
];
