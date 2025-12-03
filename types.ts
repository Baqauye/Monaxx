export interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number; // Used for sizing
  volume24h: number;
  category: string; // Made generic string to accommodate dynamic categories
  dominance: number; // Calculated percentage
  imageUrl?: string;
  pairUrl?: string;
  chainId?: string;
}

export type ViewMode = 'TreeMap' | 'List';
export type Mood = 'Professional' | 'Playful';

export interface MarketSummary {
  headline: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  insight: string;
}