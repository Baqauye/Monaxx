import { Token } from './types';

// Palette for Playful Mood (Pastels)
export const PLAYFUL_COLORS = {
  up: ['#86efac', '#4ade80', '#22c55e'], // Greens
  down: ['#fda4af', '#fb7185', '#f43f5e'], // Reds
  neutral: '#e2e8f0',
  text: '#1e293b',
  background: '#f0f9ff',
  cardBg: '#ffffff',
};

// Palette for Professional Mood (Dark, Neon)
export const PROFESSIONAL_COLORS = {
  up: ['#059669', '#10b981', '#34d399'],
  down: ['#9f1239', '#e11d48', '#fb7185'],
  neutral: '#334155',
  text: '#f1f5f9',
  background: '#020617',
  cardBg: '#0f172a',
};

// Monad Ecosystem Fallback Data
export const MOCK_TOKENS_INIT: Token[] = [
  { id: 'mon', symbol: 'MON', name: 'Monad', price: 12.50, change24h: 5.4, marketCap: 2000000000, volume24h: 50000000, category: 'Wrapped', dominance: 50, chainId: 'monad' },
  { id: 'chog', symbol: 'CHOG', name: 'Chog', price: 0.45, change24h: 15.2, marketCap: 150000000, volume24h: 12000000, category: 'Meme', dominance: 15, chainId: 'monad' },
  { id: 'molandak', symbol: 'MOLANDAK', name: 'Molandak', price: 0.08, change24h: -2.4, marketCap: 80000000, volume24h: 5000000, category: 'Meme', dominance: 8, chainId: 'monad' },
  { id: 'moyaki', symbol: 'MOYAKI', name: 'Moyaki', price: 0.002, change24h: 25.5, marketCap: 45000000, volume24h: 8000000, category: 'Meme', dominance: 5, chainId: 'monad' },
  { id: 'popcat', symbol: 'POPCAT', name: 'Popcat (Monad)', price: 0.85, change24h: 8.5, marketCap: 60000000, volume24h: 3000000, category: 'Meme', dominance: 6, chainId: 'monad' },
  { id: 'wif', symbol: 'WIF', name: 'dogwifhat (Monad)', price: 2.10, change24h: -5.6, marketCap: 40000000, volume24h: 2000000, category: 'Meme', dominance: 4, chainId: 'monad' },
  { id: 'mdex', symbol: 'MDEX', name: 'Monad Dex', price: 3.40, change24h: -1.2, marketCap: 25000000, volume24h: 1500000, category: 'DeFi', dominance: 2.5, chainId: 'monad' },
  { id: 'stmon', symbol: 'stMON', name: 'Staked Monad', price: 12.80, change24h: 5.6, marketCap: 20000000, volume24h: 1000000, category: 'Staked', dominance: 2, chainId: 'monad' },
  { id: 'yakk', symbol: 'YAKK', name: 'Yakk', price: 0.004, change24h: 45.3, marketCap: 15000000, volume24h: 4000000, category: 'Meme', dominance: 1.5, chainId: 'monad' },
  { id: 'intern', symbol: 'INTERN', name: 'Monad Intern', price: 0.0005, change24h: -8.4, marketCap: 10000000, volume24h: 500000, category: 'Meme', dominance: 1, chainId: 'monad' },
];