// services/monadService.ts
import { Token, Holder } from '../types'; // Assuming Holder type is defined here too

// --- API Configuration ---
const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8'; // Your Codex key
const CODEX_GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

const BLOCKVISION_API_KEY = '36RJSlyM5vIL2R1kKugyMU1NZeT'; // Your BlockVision key
const BLOCKVISION_BASE_URL = 'https://api.blockvision.org/v2/monad';

// --- Helper Functions ---

// Helper to call BlockVision API
const callBlockVisionAPI = async (endpoint: string, params: Record<string, any>) => {
  const url = new URL(`${BLOCKVISION_BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const response = await fetch(url.toString(), {
    headers: {
      'x-api-key': BLOCKVISION_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`BlockVision API Error: ${response.statusText}`);
  }

  return response.json();
};

// Helper to call Codex GraphQL API
const callCodexAPI = async (query: string) => {
  const response = await fetch(CODEX_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': CODEX_API_KEY
    },
    body: JSON.stringify({ query })
  });

  const result = await response.json();
  if (result.errors) {
    console.error("Codex API Errors:", result.errors);
    throw new Error("Codex API Error");
  }
  return result;
};

// Determine category based on symbol/name
const guessCategory = (symbol: string, name: string): string => {
  const s = (symbol || '').toUpperCase();
  const n = (name || '').toUpperCase();

  // Check for stablecoins first
  if (isStableCoin(s, n)) {
    return 'Stable';
  }

  if (s === 'WMON' || s === 'WETH' || s === 'WBTC' || n.includes('WRAPPED')) {
    return 'Wrapped';
  }
  if (s.startsWith('ST') || s.startsWith('EZ') || n.includes('STAKED') || n.includes('LIQUID')) {
    return 'Staked';
  }
  if (n.includes(' AI') || n.includes('GPT') || s.includes('AI') || n.includes('INTELLIGENCE') || n.includes('AGENT')) {
    return 'AI';
  }
  if (
    n.includes('SWAP') || n.includes('DEX') || n.includes('FINANCE') ||
    n.includes('PROTOCOL') || n.includes('YIELD') || n.includes('PERP') ||
    n.includes('DAO')
  ) {
    return 'DeFi';
  }
  // Check for common meme coin indicators
  if (n.includes('PEPE') || n.includes('SHIB') || n.includes('DOGE') || n.includes('FLOKI') || n.includes('BONK') || n.includes('WIF')) return 'Meme';

  return 'Meme'; // Default
};

// Check if token is a stablecoin
const isStableCoin = (symbol: string, name: string): boolean => {
  const s = (symbol || '').toUpperCase();
  const n = (name || '').toUpperCase();

  const stableCoins = [
    'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD',
    'FRAX', 'LUSD', 'SUSD', 'MIM', 'FEI', 'ALUSD', 'DOLA',
    'USD', 'TETHER', 'STABLECOIN'
  ];

  return stableCoins.some(stable =>
    s.includes(stable) || n.includes(stable)
  );
};

// Fetch token image from Dexscreener or Defined.fi
const fetchTokenImage = async (tokenAddress: string): Promise<string | null> => {
  // Try Dexscreener first
  const dexscreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/monad/${tokenAddress}.png`;
  try {
    const response = await fetch(dexscreenerUrl, { method: 'HEAD' });
    if (response.ok) {
      return dexscreenerUrl;
    }
  } catch (error) {
    console.warn(`Failed to fetch image from Dexscreener for ${tokenAddress}:`, error);
  }

  // Try Defined.fi as fallback (example, might need specific endpoint)
  // const definedUrl = `https://www.defined.fi/image/monad/${tokenAddress}.png`;
  // try {
  //   const response = await fetch(definedUrl, { method: 'HEAD' });
  //   if (response.ok) {
  //     return definedUrl;
  //   }
  // } catch (error) {
  //   console.warn(`Failed to fetch image from Defined.fi for ${tokenAddress}:`, error);
  // }

  // Try Codex image if available (from initial fetch)
  // This will be handled in the main fetch function by passing the Codex image as backup

  return null; // If all fail
};

// Calculate a composite score for ranking
const calculateTokenScore = (marketCap: number, volume24: number, change24: number, liquidity: number): number => {
  if (marketCap <= 0 || volume24 <= 0) return 0;

  // Logarithmic scaling to handle wide ranges
  const logMarketCap = Math.log(marketCap + 1);
  const logVolume = Math.log(volume24 + 1);
  const logLiquidity = Math.log(liquidity + 1);

  // Weighted combination
  // Market Cap: 40%, Volume: 30%, Change: 20%, Liquidity: 10%
  const score = (logMarketCap * 0.4) + (logVolume * 0.3) + (Math.abs(change24) * 0.2) + (logLiquidity * 0.1);

  // Bonus for positive momentum
  if (change24 > 0) {
    return score * 1.1;
  }
  return score;
};

// --- Main Service Functions ---

/**
 * Fetches live token data from Codex, enriches it with BlockVision details,
 * fetches images, and calculates a ranking score.
 */
export const fetchMonadTokens = async (): Promise<Token[]> => {
  // Codex query for Monad (assumes network ID 143)
  const query = `
    query MonadTokens {
      filterTokens(
        filters: {
          network: [143]
          liquidity: { gt: 1000 } // Filter for some liquidity
        }
        limit: 200 // Fetch more initially
        rankings: {
          attribute: trendingScore24 // Or marketCap, volume24
          direction: DESC
        }
      ) {
        results {
          priceUSD
          change24
          volume24
          marketCap
          liquidity # Codex provides liquidity
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
    const codexResult = await callCodexAPI(query);
    const items = codexResult.data?.filterTokens?.results || [];

    // Filter out obvious junk from Codex results - REMOVED 'NFT' CRITERIA
    const filteredItems = items.filter((item: any) => {
      const t = item.token;
      if (!t || !t.symbol || !t.name) return false;

      const s = t.symbol.toUpperCase();
      const n = t.name.toUpperCase();

      const junkKeywords = ['FAUCET', 'TEST', 'MOCK', 'EXAMPLE', 'DEMO']; // 'NFT' removed from this list
      if (junkKeywords.some(keyword => n.includes(keyword) || s.includes(keyword))) {
        return false;
      }

      // Filter out tokens with very low volume or market cap
      if (parseFloat(item.volume24 || '0') < 10 || parseFloat(item.marketCap || '0') < 100) {
        return false;
      }

      return true;
    });

    // Process each token: fetch BlockVision details, image, calculate score
    const tokens: Token[] = await Promise.all(filteredItems.map(async (item: any) => {
      const t = item.token;
      const info = t.info || {};

      const price = parseFloat(item.priceUSD || '0');
      const change24h = parseFloat(item.change24 || '0') * 100; // Codex gives fraction, convert to %
      const marketCap = parseFloat(item.marketCap || '0');
      const volume24h = parseFloat(item.volume24 || '0');
      const liquidity = parseFloat(item.liquidity || '0'); // Use Codex liquidity

      // Fetch details from BlockVision API
      let bvName = t.name;
      let bvSymbol = t.symbol;
      let bvLogo = '';
      let bvDecimals = 18; // Default
      let bvTotalSupply = '';

      try {
        const bvDetailResponse = await callBlockVisionAPI('/token/detail', { address: t.address });
        if (bvDetailResponse.code === 0 && bvDetailResponse.result) {
          const bvDetail = bvDetailResponse.result;
          bvName = bvDetail.name || bvName;
          bvSymbol = bvDetail.symbol || bvSymbol;
          bvLogo = bvDetail.logo || '';
          bvDecimals = bvDetail.decimals || bvDecimals;
          bvTotalSupply = bvDetail.totalSupply || bvTotalSupply;
        }
      } catch (bvDetailError) {
        console.warn(`Could not fetch BlockVision details for ${t.address}:`, bvDetailError);
        // Fallback to Codex data
      }

      // Fetch image
      let imageUrl = bvLogo || info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl; // Prefer BlockVision, fallback to Codex
      if (!imageUrl) {
          try {
              const fetchedImage = await fetchTokenImage(t.address);
              if (fetchedImage) {
                  imageUrl = fetchedImage;
              }
          } catch (imgError) {
              console.warn(`Could not fetch image for ${t.address}:`, imgError);
          }
      }

      const category = guessCategory(bvSymbol, bvName);
      const isStable = isStableCoin(bvSymbol, bvName);

      // Calculate score
      const score = calculateTokenScore(marketCap, volume24h, change24h, liquidity);

      return {
        id: t.address,
        name: bvName,
        symbol: bvSymbol,
        price: price,
        change24h: change24h,
        marketCap: marketCap,
        volume24h: volume24h,
        category: category,
        dominance: 0, // Calculated later
        imageUrl: imageUrl,
        backupImageUrl: info.imageLargeUrl, // Keep Codex as backup
        pairUrl: `https://www.defined.fi/monad/${t.address}`, // Defined.fi link
        chainId: 'monad',
        isStable: isStable,
        score: score, // For ranking
        // Add BlockVision specific fields if needed
        decimals: bvDecimals,
        totalSupply: bvTotalSupply,
        liquidity: liquidity, // From Codex
      };
    }));

    // Sort by calculated score
    tokens.sort((a, b) => b.score - a.score);

    // Calculate dominance
    const totalMcap = tokens.reduce((sum, t) => sum + t.marketCap, 0);
    return tokens.map(t => ({
      ...t,
      dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0
    }));

  } catch (error) {
    console.error("Failed to fetch Monad tokens:", error);
    return [];
  }
};

/**
 * Fetches token holders using BlockVision API.
 */
export const fetchTokenHolders = async (tokenAddress: string): Promise<Holder[]> => {
  try {
    const response = await callBlockVisionAPI('/token/holders', { contractAddress: tokenAddress, limit: 100 });
    if (response.code !== 0) {
        console.error("BlockVision API Error (Token Holders):", response.reason);
        return [];
    }

    const holdersData = response.result?.data || [];

    return holdersData.map((holderData: any) => ({
        address: holderData.holder,
        balance: parseFloat(holderData.amount) || 0,
        percentage: parseFloat(holderData.percentage) || 0,
        isContract: holderData.isContract,
        // label and connections not available directly from this endpoint
    }));
  } catch (error) {
    console.error("Failed to fetch token holders via BlockVision:", error);
    return [];
  }
};
