// services/tokenService.ts
import { Token } from '../types';

const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

const isStableCoin = (symbol: string, name: string): boolean => {
  const s = (symbol || '').toUpperCase();
  const n = (name || '').toUpperCase();
  const stableCoins = [
    'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD',
    'FRAX', 'LUSD', 'SUSD', 'MIM', 'FEI', 'ALUSD', 'DOLA', 'USD', 'TETHER'
  ];
  return stableCoins.some(stable => s.includes(stable) || n.includes(stable));
};

const isUnwantedToken = (symbol: string, name: string): boolean => {
  const s = (symbol || '').toUpperCase();
  const n = (name || '').toUpperCase();
  const unwantedSymbols = ['MUBOND', 'SHMON', 'AZND', 'LOAZND', 'MUBON', 'LOAZ'];
  if (unwantedSymbols.includes(s)) return true;
  if (n.includes('SWAP') || n.includes('DEX') || n.includes('FINANCE') ||
      n.includes('PROTOCOL') || n.includes('YIELD') || n.includes('PERP') ||
      n.includes('DAO')) {
    return false; // still allow DeFi, but categorize correctly
  }
  return false;
};

const guessCategory = (symbol: string, name: string): string => {
  const s = (symbol || '').toUpperCase();
  const n = (name || '').toUpperCase();
  if (isStableCoin(symbol, name)) return 'Stablecoin';
  if (n.includes('MEME') || s.includes('PEPE') || s.includes('WIF') || s.includes('BONK')) return 'Meme';
  if (n.includes('SWAP') || n.includes('DEX') || n.includes('FINANCE') ||
      n.includes('PROTOCOL') || n.includes('YIELD') || n.includes('PERP') ||
      n.includes('DAO')) return 'DeFi';
  return 'Meme'; // fallback for unknown = assume meme (for trending bias)
};

const fetchTokenImage = async (tokenAddress: string, networkId: number): Promise<string | null> => {
  // Dexscreener supports: sol, eth, bsc, base, monad, etc.
  const networkSlug = {
    1: 'ethereum',
    56: 'bsc',
    8453: 'base',
    101: 'solana',
    143: 'monad',
    530: 'hyperevm',
  }[networkId] || 'ethereum';

  const dexscreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/${networkSlug}/${tokenAddress}.png`;
  try {
    const resp = await fetch(dexscreenerUrl, { method: 'HEAD' });
    if (resp.ok) return dexscreenerUrl;
  } catch (e) {
    console.warn(`DexScreener image fail for ${tokenAddress}`, e);
  }

  // Fallback: Codex already gives image URLs — prioritize those
  return null;
};

const calculateScore = (price: number, change24: number, volume24: number, marketCap: number): number => {
  let baseScore = Math.log10(marketCap + 1) * 2;
  const momentumBonus = Math.max(-5, Math.min(10, change24 * 0.5));
  const volumeToMarketCapRatio = volume24 / (marketCap || 1);
  const honeypotPenalty = volumeToMarketCapRatio < 0.01 ? -10 : 0;
  return baseScore + momentumBonus + honeypotPenalty;
};

export const fetchTokensForNetwork = async (networkId: number): Promise<Token[]> => {
  // Fetch top ~100 tokens by trendingScore24, liquidity > $1k
  const query = `
    query TokensByNetwork($networkId: Int!) {
      filterTokens(
        filters: {
          network: [$networkId],
          liquidity: { gt: 1000 }
        },
        limit: 100,
        rankings: {
          attribute: trendingScore24,
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
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CODEX_API_KEY,
      },
      body: JSON.stringify({
        query,
        variables: { networkId },
      }),
    });

    const json = await res.json();
    if (json.errors) {
      console.error('Codex API Error:', json.errors);
      return [];
    }

    const items = json.data?.filterTokens?.results || [];

    const tokens: Token[] = await Promise.all(
      items
        .filter((item: any) => {
          const t = item.token;
          if (!t || !t.address || !t.symbol) return false;
          if (isUnwantedToken(t.symbol, t.name)) return false;
          return true;
        })
        .map(async (item: any) => {
          const t = item.token;
          const info = item.token.info || {};
          const price = parseFloat(item.priceUSD || '0');
          const change = (parseFloat(item.change24 || '0') || 0) * 100;
          let mcap = parseFloat(item.marketCap || '0');
          const volume = parseFloat(item.volume24 || '0');

          if (mcap === 0 && price > 0 && volume > 0) {
            // Approximate: assume FDV ~ 10x volume (common for early tokens)
            mcap = volume * 10;
          }

          const isStable = isStableCoin(t.symbol, t.name);
          const codexImage = info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl;
          const imageUrl = codexImage || (await fetchTokenImage(t.address, networkId)) || undefined;

          const chainName = {
            1: 'eth',
            56: 'bsc',
            8453: 'base',
            101: 'sol',
            143: 'monad',
            530: 'hyperevm',
          }[networkId] || 'unknown';

          return {
            id: `${t.address}:${networkId}`,
            symbol: t.symbol,
            name: t.name,
            price,
            change24h: change,
            marketCap: mcap,
            volume24h: volume,
            category: guessCategory(t.symbol, t.name),
            dominance: 0,
            imageUrl,
            backupImageUrl: codexImage,
            pairUrl: `https://www.defined.fi/${chainName}/${t.address}`,
            chainId: chainName,
            networkId,
            isStable,
            score: calculateScore(price, change, volume, mcap),
          };
        })
    );

    tokens.sort((a, b) => (b.score || 0) - (a.score || 0));
    return tokens;
  } catch (err) {
    console.error(`Failed to fetch tokens for network ${networkId}:`, err);
    return [];
  }
};
