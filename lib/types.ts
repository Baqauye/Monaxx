export type ChainKey = 'ethereum' | 'bnb' | 'base' | 'solana' | 'sonic' | 'monad';

export interface ChainOption {
  key: ChainKey;
  label: string;
  display: string;
  short: string;
  coingeckoCategory?: string;
  definedSlug: string;
}

export interface TokenMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
  contract_address?: string;
  category: TokenCategory;
}

export type TokenCategory =
  | 'All'
  | 'Meme Coins'
  | 'Stablecoins'
  | 'DeFi Tokens'
  | 'Governance Tokens'
  | 'RWA Tokens'
  | 'Infrastructure & Tools'
  | 'Other';
