import { Token } from '../types';
import { classifyToken } from './categoryClassifier';

const runtimeApiKey = (globalThis as { __MONAX_CODEX_API_KEY__?: string }).__MONAX_CODEX_API_KEY__;
const CODEX_API_KEY: string = runtimeApiKey || '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

interface CodexTokenInfo {
  imageLargeUrl?: string;
  imageSmallUrl?: string;
  imageThumbUrl?: string;
}

interface CodexTokenData {
  address?: string;
  name?: string;
  symbol?: string;
  info?: CodexTokenInfo;
}

interface CodexResultItem {
  priceUSD?: string | number;
  change24?: string | number;
  volume24?: string | number;
  marketCap?: string | number;
  token?: CodexTokenData;
}

interface CodexGraphResponse {
  data?: {
    filterTokens?: {
      results?: CodexResultItem[];
    };
  };
  errors?: unknown[];
}

/**
 * Why: Codex payloads can contain null/strings/NaN values, so we normalize aggressively
 * to avoid rendering invalid prices and to keep Vercel builds/runtime deterministic.
 */
const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

/**
 * Why: filtering invalid token rows early prevents downstream UI/layout conflicts and
 * ensures only actionable market data reaches the treemap.
 */
const isValidTokenRow = (item: CodexResultItem): boolean => {
  const token = item.token;
  if (!token?.address || !token?.symbol || !token?.name) {
    return false;
  }

  const volume24 = toFiniteNumber(item.volume24);
  const marketCap = toFiniteNumber(item.marketCap);

  return volume24 > 10 && marketCap >= 100;
};

/**
 * Why: keep ranking stable and resistant to outliers while prioritizing liquid assets.
 */
const calculateTokenScore = (marketCap: number, volume24h: number, change24h: number): number => {
  const normalizedMarketCap = Math.log(marketCap + 1);
  const normalizedVolume = Math.log(volume24h + 1);
  const baseScore = (normalizedMarketCap * 0.65) + (normalizedVolume * 0.3);
  const momentumAdjustment = change24h > 0 ? change24h * 0.08 : change24h * 0.04;
  return baseScore + momentumAdjustment;
};

/**
 * Why: converts a raw row into UI-ready token data while preserving existing logo fallback behavior.
 */
const mapCodexRowToToken = (item: CodexResultItem, networkId: number): Token => {
  const token = item.token as Required<CodexResultItem>['token'];
  const info = token.info || {};

  const price = toFiniteNumber(item.priceUSD);
  const change24h = toFiniteNumber(item.change24) * 100;
  const volume24h = toFiniteNumber(item.volume24);
  const marketCapRaw = toFiniteNumber(item.marketCap);
  const marketCap = marketCapRaw > 0 ? marketCapRaw : volume24h * 10;

  const imageUrl = info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl;
  const category = classifyToken(token.symbol, token.name);

  return {
    id: token.address,
    symbol: token.symbol,
    name: token.name,
    price,
    change24h,
    marketCap,
    volume24h,
    category,
    dominance: 0,
    imageUrl,
    backupImageUrl: imageUrl,
    pairUrl: `https://www.defined.fi/${getChainSlug(networkId)}/${token.address}`,
    chainId: getChainSlug(networkId),
    isStable: category === 'Stablecoins',
    score: calculateTokenScore(marketCap, volume24h, change24h),
  };
};

/**
 * Generic token fetcher for any supported network.
 */
const fetchTokensForChain = async (networkId: number): Promise<Token[]> => {
  const query = `
    query NetworkTokens {
      filterTokens(
        filters: {
          network: [${networkId}]
          liquidity: { gt: 4000 }
        }
        limit: 200
        rankings: {
          attribute: trendingScore24
          direction: DESC
        }
      ) {
        results {
          priceUSD
          change24
          volume24
          marketCap
          token {
            address
            name
            symbol
            info {
              imageLargeUrl
              imageSmallUrl
              imageThumbUrl
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: CODEX_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error(`Codex request failed (${response.status}) for network ${networkId}`);
      return [];
    }

    const result = (await response.json()) as CodexGraphResponse;
    if (result.errors) {
      console.error(`Codex API errors for network ${networkId}:`, result.errors);
      return [];
    }

    const items = result.data?.filterTokens?.results || [];
    const dedupedByAddress = new Map<string, Token>();

    for (const item of items) {
      if (!isValidTokenRow(item)) {
        continue;
      }

      const mapped = mapCodexRowToToken(item, networkId);
      const existing = dedupedByAddress.get(mapped.id);
      if (!existing || (mapped.score || 0) > (existing.score || 0)) {
        dedupedByAddress.set(mapped.id, mapped);
      }
    }

    const tokens = Array.from(dedupedByAddress.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
    const totalMcap = tokens.reduce((sum, t) => sum + t.marketCap, 0);

    return tokens.map((token) => ({
      ...token,
      dominance: totalMcap > 0 ? (token.marketCap / totalMcap) * 100 : 0,
    }));
  } catch (error) {
    console.error(`Failed to fetch tokens for network ${networkId}:`, error);
    return [];
  }
};

/**
 * Get chain slug for URL construction.
 */
const getChainSlug = (networkId: number): string => {
  const slugs: Record<number, string> = {
    1: 'eth',
    56: 'bsc',
    8453: 'base',
  };
  return slugs[networkId] || 'eth';
};

/**
 * Why: single normalized fetch path keeps all chains consistent and easier to validate.
 */
export const fetchTokensForNetwork = async (networkId: number): Promise<Token[]> => fetchTokensForChain(networkId);
