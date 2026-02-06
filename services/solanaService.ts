import { Token } from '../types';
import { classifyToken } from './categoryClassifier';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const SOLANA_CATEGORY = 'solana-ecosystem';
const PLATFORM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SOLANA_PLATFORM_CACHE_KEY = 'cg_solana_platform_ids_v1';

let cachedSolanaPlatformIds: Set<string> | null = null;
let cachedPlatformsAt = 0;

const loadCachedSolanaPlatformIds = (): Set<string> | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SOLANA_PLATFORM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ids: string[]; cachedAt: number };
    if (!parsed?.ids?.length || !parsed.cachedAt) return null;
    if (Date.now() - parsed.cachedAt > PLATFORM_CACHE_TTL_MS) return null;
    cachedPlatformsAt = parsed.cachedAt;
    return new Set(parsed.ids);
  } catch (error) {
    console.warn('Failed to parse cached Solana platform IDs:', error);
    return null;
  }
};

const persistSolanaPlatformIds = (ids: Set<string>) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const payload = JSON.stringify({
      ids: Array.from(ids),
      cachedAt: Date.now(),
    });
    window.localStorage.setItem(SOLANA_PLATFORM_CACHE_KEY, payload);
  } catch (error) {
    console.warn('Failed to persist Solana platform IDs:', error);
  }
};

const fetchSolanaPlatformIds = async (): Promise<Set<string>> => {
  if (cachedSolanaPlatformIds && Date.now() - cachedPlatformsAt < PLATFORM_CACHE_TTL_MS) {
    return cachedSolanaPlatformIds;
  }

  const localCache = loadCachedSolanaPlatformIds();
  if (localCache) {
    cachedSolanaPlatformIds = localCache;
    return localCache;
  }

  const url = `${COINGECKO_BASE_URL}/coins/list?include_platform=true`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`CoinGecko platform list error: ${response.statusText}`);
  }

  const items = await response.json();
  const solanaIds = new Set<string>();

  for (const item of items) {
    if (item?.platforms?.solana) {
      solanaIds.add(item.id);
    }
  }

  cachedSolanaPlatformIds = solanaIds;
  cachedPlatformsAt = Date.now();
  persistSolanaPlatformIds(solanaIds);
  return solanaIds;
};

const calculateTokenScore = (marketCap: number, volume24: number, change24: number): number => {
  if (marketCap <= 0 || volume24 <= 0) {
    return 0;
  }

  const normalizedMarketCap = Math.log(marketCap + 1);
  const normalizedVolume = Math.log(volume24 + 1);
  const baseScore = (normalizedMarketCap * 0.6) + (normalizedVolume * 0.3);
  const momentumBonus = change24 > 0 ? change24 * 0.1 : change24 * 0.05;

  return baseScore + momentumBonus;
};

export const fetchSolanaTokens = async (): Promise<Token[]> => {
  try {
    const url = new URL(`${COINGECKO_BASE_URL}/coins/markets`);
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('category', SOLANA_CATEGORY);
    url.searchParams.set('order', 'market_cap_desc');
    url.searchParams.set('per_page', '250');
    url.searchParams.set('page', '1');
    url.searchParams.set('sparkline', 'false');
    url.searchParams.set('price_change_percentage', '24h');

    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API Error: ${response.statusText}`);
    }

    const items = await response.json();
    let solanaIds: Set<string> | null = null;

    try {
      solanaIds = await fetchSolanaPlatformIds();
    } catch (error) {
      console.warn('Failed to load CoinGecko platform list.', error);
    }

    if (!solanaIds) {
      console.warn('No verified Solana platform list available. Refusing to return unverified tokens.');
      return [];
    }

    const tokens: Token[] = items
      .filter((item: any) => {
        if (!item?.symbol || !item?.name) return false;
        if (!item.market_cap || item.market_cap <= 0) return false;
        if (!item.total_volume || item.total_volume <= 0) return false;
        if (!solanaIds.has(item.id) && item.id !== 'solana') return false;
        return true;
      })
      .map((item: any) => {
        const price = Number(item.current_price || 0);
        const change = Number(item.price_change_percentage_24h || 0);
        const marketCap = Number(item.market_cap || 0);
        const volume = Number(item.total_volume || 0);
        const category = classifyToken(item.symbol, item.name);
        const isStable = category === 'Stablecoins';
        const score = calculateTokenScore(marketCap, volume, change);

        return {
          id: item.id,
          symbol: item.symbol.toUpperCase(),
          name: item.name,
          price: price,
          change24h: change,
          marketCap: marketCap,
          volume24h: volume,
          category: category,
          dominance: 0,
          imageUrl: item.image,
          backupImageUrl: item.image,
          pairUrl: `https://www.coingecko.com/en/coins/${item.id}`,
          chainId: 'solana',
          isStable: isStable,
          score: score,
        };
      });

    tokens.sort((a, b) => b.score - a.score);

    const totalMcap = tokens.reduce((sum, t) => sum + t.marketCap, 0);

    return tokens.map(t => ({
      ...t,
      dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0,
    }));
  } catch (error) {
    console.error('Failed to fetch Solana tokens:', error);
    return [];
  }
};
