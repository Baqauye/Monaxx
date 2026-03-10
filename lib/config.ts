import { ChainOption, TokenCategory } from './types';

export const CHAINS: ChainOption[] = [
  { key: 'ethereum', label: 'Ethereum', display: 'Ethereum', short: '≡ ETH', coingeckoCategory: 'ethereum-ecosystem', definedSlug: 'eth' },
  { key: 'bnb', label: 'BNB Chain', display: 'BNB Chain', short: '◉ BNB', coingeckoCategory: 'bnb-chain-ecosystem', definedSlug: 'bsc' },
  { key: 'base', label: 'Base', display: 'Base', short: '◉ Base', coingeckoCategory: 'base-ecosystem', definedSlug: 'base' },
  { key: 'solana', label: 'Solana', display: 'Solana', short: '◎ SOL', coingeckoCategory: 'solana-ecosystem', definedSlug: 'solana' },
  { key: 'sonic', label: 'Sonic', display: 'Sonic', short: '⚡ Sonic', definedSlug: 'sonic' },
  { key: 'monad', label: 'Monad Mainnet', display: 'Monad Mainnet', short: '⬢ Monad', definedSlug: 'monad' }
];

export const TOKEN_CATEGORIES: TokenCategory[] = [
  'All',
  'Meme Coins',
  'Stablecoins',
  'DeFi Tokens',
  'Governance Tokens',
  'RWA Tokens',
  'Infrastructure & Tools',
  'Other'
];
