// services/categoryClassifier.ts
import { TokenCategory } from '../types';

/**
 * Lightweight category classifier tuned for chain-level filters.
 */

// Category keyword mappings
const CATEGORY_KEYWORDS = {
  Stablecoins: {
    symbols: ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD', 'FRAX', 'LUSD', 'SUSD', 'MIM', 'FEI', 'ALUSD', 'DOLA', 'GUSD', 'USDJ', 'USDK', 'USTC', 'USDN'],
    names: ['TETHER', 'USD COIN', 'BINANCE USD', 'DAI', 'TRUE USD', 'PAX DOLLAR', 'STABLECOIN', 'DOLLAR', 'STABLE', 'FIAT']
  },
  Memes: {
    symbols: [
      'DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'WOJAK', 'ELON',
      'SAMO', 'BABYDOGE', 'SPONGE', 'TURBO', 'MEW', 'POPCAT', 'MOG', 'BRETT',
      'WEN', 'PENGU', 'TRUMP', 'PONKE', 'DEGEN', 'FARTCOIN', 'GOAT', 'PORK',
      'NEET', 'BAN', 'PENGUIN', 'BOME', 'FROG', 'TROLL'
    ],
    names: [
      'MEME', 'DOG', 'CAT', 'FROG', 'INU', 'SHIBA', 'DOGE', 'PEPE', 'COMMUNITY',
      'FUN', 'JOKE', 'PARODY', 'MASCOT', 'PENGU', 'BONK', 'POPCAT', 'WIF'
    ]
  }
};

const WRAPPED_SYMBOLS = [
  'WETH', 'WBTC', 'WBNB', 'WSOL', 'WMATIC', 'WAVAX', 'WFTM', 'WADA', 'WDOT',
  'WTRX', 'WLINK', 'WATOM', 'WNEAR', 'WALGO', 'WXTZ', 'WEOS', 'WUSDC', 'WUSDT',
  'WDAI', 'WSTETH', 'STETH', 'RETH', 'CBETH'
];
const WRAPPED_PATTERNS = ['WRAPPED', 'STAKED', 'LIQUID', 'RESTAKED', 'ATOKEN'];

/**
 * Check if a token is a wrapped/staked version
 */
const isWrappedToken = (symbol: string, name: string): boolean => {
  const s = symbol.toUpperCase();
  const n = name.toUpperCase();
  
  if (WRAPPED_SYMBOLS.includes(s)) {
    return true;
  }

  if (WRAPPED_PATTERNS.some(pattern => n.includes(pattern))) {
    return true;
  }
  
  return false;
};

/**
 * Main classification function
 */
export const classifyToken = (symbol: string, name: string, description?: string): TokenCategory => {
  const s = symbol.toUpperCase().trim();
  const n = name.toUpperCase().trim();
  const d = (description || '').toUpperCase().trim();
  
  const combinedText = `${s} ${n} ${d}`;
  
  if (matchesCategory(s, n, d, 'Stablecoins')) {
    return 'Stablecoins';
  }
  
  if (isWrappedToken(s, n)) {
    return 'Wrapped';
  }
  
  if (matchesCategory(s, n, d, 'Memes')) {
    return 'Memes';
  }
  
  return 'Other';
};

/**
 * Helper function to check if token matches a specific category
 */
const matchesCategory = (symbol: string, name: string, description: string, category: Exclude<TokenCategory, 'All' | 'Other' | 'Wrapped'>): boolean => {
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords) return false;
  
  if (keywords.symbols.some(keyword => 
    symbol === keyword || 
    symbol.includes(keyword) ||
    keyword.includes(symbol)
  )) {
    return true;
  }
  
  if (keywords.names.some(keyword => 
    name.includes(keyword) || 
    description.includes(keyword)
  )) {
    return true;
  }
  
  return false;
};

/**
 * Get category color for visualization
 */
export const getCategoryColor = (category: TokenCategory): string => {
  const colors: Record<TokenCategory, string> = {
    'All': '#64748b',
    'Memes': '#f59e0b',
    'Wrapped': '#6366f1',
    'Stablecoins': '#10b981',
    'Other': '#94a3b8'
  };
  
  return colors[category] || colors['Other'];
};

/**
 * Get category emoji icon
 */
export const getCategoryEmoji = (category: TokenCategory): string => {
  const emojis: Record<TokenCategory, string> = {
    'All': '🌐',
    'Memes': '🐕',
    'Wrapped': '🎁',
    'Stablecoins': '💵',
    'Other': '📦'
  };
  
  return emojis[category] || emojis['Other'];
};
