// services/tokenService.ts
import { Token } from '../types';
import { fetchMonadTokens } from './monadService';
import { classifyToken } from './categoryClassifier';

const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

/**
 * Generic token fetcher for any supported network
 */
const fetchTokensForChain = async (networkId: number): Promise<Token[]> => {
  const query = `
    query NetworkTokens {
      filterTokens(
        filters: {
          network: [${networkId}]
          liquidity: { gt: 1000 }
        }
        limit: 50
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
        'Authorization': CODEX_API_KEY
      },
      body: JSON.stringify({ query })
    });

    const result = await response.json();

    if (result.errors) {
      console.error(`Codex API Errors for network ${networkId}:`, result.errors);
      return [];
    }

    const items = result.data?.filterTokens?.results || [];

    const tokens: Token[] = items
      .filter((item: any) => {
        const t = item.token;
        if (!t || !t.symbol || !t.name) return false;
        if (item.volume24 <= 10) return false;
        if (item.marketCap < 100) return false;
        return true;
      })
      .map((item: any) => {
        const t = item.token;
        const info = t.info || {};

        const price = parseFloat(item.priceUSD || '0');
        const change = parseFloat(item.change24 || '0') * 100;
        let mcap = parseFloat(item.marketCap || '0');
        const volume = parseFloat(item.volume24 || '0');

        if (mcap === 0 && price > 0) {
          mcap = volume * 10;
        }

        const category = classifyToken(t.symbol, t.name);
        const isStable = category === 'Stablecoins';

        const imageUrl = info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl;

        const normalizedMarketCap = Math.log(mcap + 1);
        const normalizedVolume = Math.log(volume + 1);
        const baseScore = (normalizedMarketCap * 0.6) + (normalizedVolume * 0.3);
        const momentumBonus = change > 0 ? change * 0.1 : change * 0.05;
        const score = baseScore + momentumBonus;

        return {
          id: t.address,
          symbol: t.symbol,
          name: t.name,
          price: price,
          change24h: change,
          marketCap: mcap,
          volume24h: volume,
          category: category,
          dominance: 0,
          imageUrl: imageUrl,
          backupImageUrl: imageUrl,
          pairUrl: `https://www.defined.fi/${getChainSlug(networkId)}/${t.address}`,
          chainId: getChainSlug(networkId),
          isStable: isStable,
          score: score
        };
      });

    tokens.sort((a, b) => b.score - a.score);

    const totalMcap = tokens.reduce((sum, t) => sum + t.marketCap, 0);

    return tokens.map(t => ({
      ...t,
      dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0
    }));
  } catch (error) {
    console.error(`Failed to fetch tokens for network ${networkId}:`, error);
    return [];
  }
};

/**
 * Get chain slug for URL construction
 */
const getChainSlug = (networkId: number): string => {
  const slugs: Record<number, string> = {
    1: 'eth',
    56: 'bsc',
    8453: 'base',
    101: 'solana',
    143: 'monad',
    530: 'sonic'
  };
  return slugs[networkId] || 'eth';
};

/**
 * Main export: Fetch tokens for any supported network
 */
export const fetchTokensForNetwork = async (networkId: number): Promise<Token[]> => {
  // Use specialized Monad service if available, otherwise use generic
  if (networkId === 143) {
    return fetchMonadTokens();
  }
  
  return fetchTokensForChain(networkId);
};
