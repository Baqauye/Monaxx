import { TokenCategory } from './types';

const STABLE = ['usdt', 'usdc', 'dai', 'usde', 'fdusd', 'busd', 'tusd', 'usdd', 'pyusd'];

/**
 * Categorizes a token from CoinGecko text fields when explicit tags are unavailable.
 */
export const classifyToken = (name: string, symbol: string): TokenCategory => {
  const text = `${name} ${symbol}`.toLowerCase();
  if (STABLE.includes(symbol.toLowerCase()) || text.includes('stable')) return 'Stablecoins';
  if (text.includes('meme') || text.includes('inu') || text.includes('pepe') || text.includes('doge')) return 'Meme Coins';
  if (text.includes('dao') || text.includes('governance') || text.includes('vote')) return 'Governance Tokens';
  if (text.includes('swap') || text.includes('dex') || text.includes('lending') || text.includes('defi')) return 'DeFi Tokens';
  if (text.includes('real world asset') || text.includes('rwa') || text.includes('treasury') || text.includes('bond')) return 'RWA Tokens';
  if (text.includes('oracle') || text.includes('layer') || text.includes('infra') || text.includes('bridge') || text.includes('tool')) return 'Infrastructure & Tools';
  return 'Other';
};
