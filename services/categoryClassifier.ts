// services/categoryClassifier.ts
import { TokenCategory } from '../types';

/**
 * Comprehensive token category classifier based on symbol, name, and metadata
 */

// Category keyword mappings
const CATEGORY_KEYWORDS = {
  'Stablecoins': {
    symbols: ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD', 'FRAX', 'LUSD', 'SUSD', 'MIM', 'FEI', 'ALUSD', 'DOLA', 'GUSD', 'USDJ', 'USDK', 'USTC', 'USDN'],
    names: ['TETHER', 'USD COIN', 'BINANCE USD', 'DAI', 'TRUE USD', 'PAX DOLLAR', 'STABLECOIN', 'DOLLAR', 'STABLE', 'FIAT']
  },
  'AI Tokens': {
    symbols: ['AI', 'AGI', 'AGIX', 'FET', 'OCEAN', 'NMR', 'GRT', 'RNDR', 'ARKM', 'TAO', 'PAAL'],
    names: ['ARTIFICIAL', 'INTELLIGENCE', 'NEURAL', 'MACHINE LEARNING', 'GPT', 'AGENT', 'CHATBOT', 'BRAIN', 'COGNITIVE', 'AUTONOMOUS', 'ROBOT', 'AI AGENT']
  },
  'DeFi Tokens': {
    symbols: ['UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'CRV', 'BAL', 'YFI', 'SUSHI', 'CAKE', 'LINK', 'LDO', 'GMX', 'DYDX', 'PERP'],
    names: ['SWAP', 'DEX', 'EXCHANGE', 'FINANCE', 'PROTOCOL', 'DEFI', 'LENDING', 'BORROW', 'LIQUIDITY', 'YIELD', 'FARM', 'VAULT', 'POOL', 'PERPETUAL', 'DERIVATIVE', 'SYNTHETIC', 'MONEY MARKET']
  },
  'Governance Tokens': {
    symbols: ['GOV', 'DAO', 'VOTE', 'COMP', 'MKR', 'UNI', 'AAVE'],
    names: ['GOVERNANCE', 'DAO', 'VOTING', 'PROPOSAL', 'COUNCIL', 'COMMUNITY', 'DECENTRALIZED AUTONOMOUS']
  },
  'Utility Tokens': {
    symbols: ['BNB', 'FTM', 'MATIC', 'AVAX', 'ATOM', 'DOT', 'ADA', 'SOL', 'NEAR', 'ALGO', 'HBAR', 'XTZ', 'EOS', 'TRX'],
    names: ['UTILITY', 'PLATFORM', 'ECOSYSTEM', 'NETWORK', 'SERVICE', 'ACCESS', 'FEE', 'GAS']
  },
  'GameFi Tokens': {
    symbols: ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA', 'ILV', 'SLP', 'TLM', 'ALICE', 'GHST', 'JEWEL', 'MAGIC'],
    names: ['GAME', 'GAMING', 'PLAY', 'METAVERSE', 'VIRTUAL', 'NFT GAME', 'GAMEFI', 'ESPORT', 'QUEST', 'ADVENTURE', 'BATTLE', 'LAND', 'AVATAR', 'CHARACTER']
  },
  'RWA Tokens': {
    symbols: ['RWA', 'PAXG', 'XAUT', 'MPL', 'CFG', 'ONDO', 'TRU', 'CPOOL'],
    names: ['REAL WORLD ASSET', 'RWA', 'GOLD', 'SILVER', 'COMMODITY', 'TREASURY', 'BOND', 'REAL ESTATE', 'PROPERTY', 'ASSET BACKED', 'TOKENIZED ASSET', 'SECURITIES']
  },
  'Infrastructure & Tools': {
    symbols: ['LINK', 'GRT', 'API3', 'BAND', 'TRB', 'ANKR', 'POKT', 'NKN', 'STORJ', 'FIL', 'AR', 'RNDR'],
    names: ['ORACLE', 'DATA', 'INFRASTRUCTURE', 'NODE', 'VALIDATOR', 'STORAGE', 'CLOUD', 'COMPUTE', 'API', 'INDEXER', 'QUERY', 'MIDDLEWARE', 'LAYER', 'BRIDGE', 'INTEROPERABILITY', 'CROSS-CHAIN']
  },
  'Privacy Tokens': {
    symbols: ['XMR', 'ZEC', 'DASH', 'SCRT', 'BEAM', 'GRIN', 'FIRO', 'ARRR', 'ZEN', 'PIVX'],
    names: ['PRIVACY', 'PRIVATE', 'ANONYMOUS', 'CONFIDENTIAL', 'ZERO KNOWLEDGE', 'ZK', 'STEALTH', 'MONERO', 'ZCASH', 'SECRET']
  },
  'Meme Coins': {
    symbols: ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'WOJAK', 'ELON', 'SAMO', 'BABYDOGE', 'SPONGE', 'TURBO', 'MEW', 'POPCAT', 'MOG', 'BRETT', 'WEN'],
    names: ['MEME', 'DOG', 'CAT', 'FROG', 'INU', 'SHIBA', 'DOGE', 'PEPE', 'COMMUNITY', 'FUN', 'JOKE', 'PARODY', 'MASCOT']
  }
};

// Wrapped/Staked token prefixes (these should inherit category from base token)
const DERIVATIVE_PREFIXES = ['W', 'ST', 'EZ', 'R', 'A', 'C', 'Y', 'S', 'L', 'SH', 'MU', 'LO'];
const DERIVATIVE_PATTERNS = ['WRAPPED', 'STAKED', 'LIQUID', 'RECEIPT', 'VAULT', 'CERTIFICATE', 'RESTAKED', 'ATOKEN'];

/**
 * Check if a token is a derivative/wrapped version
 */
const isDerivativeToken = (symbol: string, name: string): boolean => {
  const s = symbol.toUpperCase();
  const n = name.toUpperCase();
  
  if (DERIVATIVE_PATTERNS.some(pattern => n.includes(pattern))) {
    return true;
  }
  
  if (DERIVATIVE_PREFIXES.some(prefix => s.startsWith(prefix) && s.length > prefix.length + 2)) {
    return true;
  }
  
  return false;
};

/**
 * Extract base token from derivative token
 */
const getBaseToken = (symbol: string): string => {
  const s = symbol.toUpperCase();
  
  for (const prefix of DERIVATIVE_PREFIXES) {
    if (s.startsWith(prefix) && s.length > prefix.length + 2) {
      return s.substring(prefix.length);
    }
  }
  
  return s;
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
  
  if (matchesCategory(s, n, d, 'Privacy Tokens')) {
    return 'Privacy Tokens';
  }
  
  if (matchesCategory(s, n, d, 'AI Tokens')) {
    return 'AI Tokens';
  }
  
  if (matchesCategory(s, n, d, 'GameFi Tokens')) {
    return 'GameFi Tokens';
  }
  
  if (matchesCategory(s, n, d, 'RWA Tokens')) {
    return 'RWA Tokens';
  }
  
  if (matchesCategory(s, n, d, 'DeFi Tokens')) {
    return 'DeFi Tokens';
  }
  
  if (matchesCategory(s, n, d, 'Governance Tokens')) {
    return 'Governance Tokens';
  }
  
  if (matchesCategory(s, n, d, 'Infrastructure & Tools')) {
    return 'Infrastructure & Tools';
  }
  
  if (matchesCategory(s, n, d, 'Utility Tokens')) {
    return 'Utility Tokens';
  }
  
  if (matchesCategory(s, n, d, 'Meme Coins')) {
    return 'Meme Coins';
  }
  
  if (isDerivativeToken(s, n)) {
    const baseToken = getBaseToken(s);
    const baseCategory = classifyToken(baseToken, baseToken);
    if (baseCategory !== 'Other') {
      return baseCategory;
    }
  }
  
  return 'Other';
};

/**
 * Helper function to check if token matches a specific category
 */
const matchesCategory = (symbol: string, name: string, description: string, category: Exclude<TokenCategory, 'All' | 'Other'>): boolean => {
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
    'Meme Coins': '#f59e0b',
    'AI Tokens': '#8b5cf6',
    'Stablecoins': '#10b981',
    'DeFi Tokens': '#3b82f6',
    'Governance Tokens': '#ec4899',
    'Utility Tokens': '#06b6d4',
    'GameFi Tokens': '#f97316',
    'RWA Tokens': '#84cc16',
    'Infrastructure & Tools': '#6366f1',
    'Privacy Tokens': '#14b8a6',
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
    'Meme Coins': '🐕',
    'AI Tokens': '🤖',
    'Stablecoins': '💵',
    'DeFi Tokens': '🏦',
    'Governance Tokens': '🗳️',
    'Utility Tokens': '🔧',
    'GameFi Tokens': '🎮',
    'RWA Tokens': '🏠',
    'Infrastructure & Tools': '⚙️',
    'Privacy Tokens': '🔒',
    'Other': '📦'
  };
  
  return emojis[category] || emojis['Other'];
};
