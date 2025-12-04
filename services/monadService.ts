// services/monadService.ts
import { Token, Holder } from '../types';

const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

/**
 * Checks if a token is a stablecoin based on its symbol or name.
 */
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

/**
 * Guesses the category of a token based on its symbol or name.
 */
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

  return 'Meme';
};

/**
 * Fetches a token's image from multiple sources, prioritizing Dexscreener.
 */
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
    // Continue to next source
  }

  // Try CoinGecko as fallback
  const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/monad/contract/${tokenAddress}`;
  try {
    const response = await fetch(coingeckoUrl);
    if (response.ok) {
      const data = await response.json();
      return data.image?.large || data.image?.small || data.image?.thumb || null;
    }
  } catch (error) {
    console.warn(`Failed to fetch image from CoinGecko for ${tokenAddress}:`, error);
    // Continue to next source
  }

  // If all else fails, return null
  return null;
};

/**
 * Calculates a composite score for a token to determine its ranking.
 * The score combines market cap, volume, and 24h change, while penalizing low activity.
 * @param marketCap - The token's market cap.
 * @param volume24 - The token's 24-hour trading volume.
 * @param change24 - The token's 24-hour price change percentage.
 * @returns A normalized score for ranking.
 */
const calculateTokenScore = (marketCap: number, volume24: number, change24: number): number => {
  // Avoid division by zero and handle edge cases
  if (marketCap <= 0 || volume24 <= 0) {
    return 0;
  }

  // Normalize values to prevent any single metric from dominating
  const normalizedMarketCap = Math.log(marketCap + 1); // Logarithmic scale for market cap
  const normalizedVolume = Math.log(volume24 + 1);     // Logarithmic scale for volume

  // Calculate a base score using weighted average
  const baseScore = (normalizedMarketCap * 0.6) + (normalizedVolume * 0.3);

  // Add bonus for positive momentum (change24 > 0) and penalize negative momentum
  const momentumBonus = change24 > 0 ? change24 * 0.1 : change24 * 0.05;

  // Apply a small penalty for very low volume relative to market cap (potential honeypot indicator)
  const volumeToMarketCapRatio = volume24 / marketCap;
  const honeypotPenalty = volumeToMarketCapRatio < 0.01 ? -10 : 0;

  // Final score
  return baseScore + momentumBonus + honeypotPenalty;
};

/**
 * Implements the proposed ranking formula with all specified filters.
 * This function calculates a weighted score for each token and applies strict quality filters.
 */
const calculateAdvancedTokenScore = (
  marketCap: number,
  volume24: number,
  change24: number,
  bidAskSpread: number,
  maxMarketCap: number
): number => {
  // Ensure all inputs are valid numbers
  if (isNaN(marketCap) || isNaN(volume24) || isNaN(change24) || isNaN(bidAskSpread)) {
    return 0;
  }

  // --- Normalization Components ---
  // Market Cap Normalized: MC_normalized = min(MarketCap / MaxMarketCap, 1) * 100
  const mcNormalized = Math.min(marketCap / maxMarketCap, 1) * 100;

  // Volume Normalized: Vol_normalized = min(24hVolume / $1,000,000, 1) * 100
  const volNormalized = Math.min(volume24 / 1_000_000, 1) * 100;

  // Ratio Normalized: Ratio_normalized = min((Volume / MarketCap) / 0.1, 1) * 100
  const ratioNormalized = marketCap > 0 ? Math.min((volume24 / marketCap) / 0.1, 1) * 100 : 0;

  // Depth Normalized: Depth_normalized = max(0, 100 - (Bid-AskSpread * 10,000))
  const depthNormalized = Math.max(0, 100 - (bidAskSpread * 10000));

  // Momentum (24h Change): Momentum_24h = ((Current Price - 24h Low) / (24h High - 24h Low)) * 100
  // Note: We approximate this using the 24h change percentage, assuming it's derived from these values.
  // For simplicity, we'll use the absolute value of the 24h change, bounded between 0 and 100.
  let momentum24h = Math.abs(change24);
  if (momentum24h > 100) momentum24h = 100; // Bounded to 0-100

  // --- Weighted Score Calculation ---
  // Score = (0.35 × MC_normalized) + (0.25 × Vol_normalized) + (0.15 × Ratio_normalized) + (0.15 × Depth_normalized) + (0.10 × Momentum_24h)
  const score = (
    (0.35 * mcNormalized) +
    (0.25 * volNormalized) +
    (0.15 * ratioNormalized) +
    (0.15 * depthNormalized) +
    (0.10 * momentum24h)
  );

  return score;
};

/**
 * Applies essential filters to exclude bad tokens.
 * Returns true if the token should be included, false if it should be filtered out.
 */
const shouldIncludeToken = (
  verifiedSupply: boolean,
  exchangeListings: number,
  volume24: number,
  marketCap: number,
  bidAskSpread: number,
  priceVolatility: number,
  topHoldersConcentration: number,
  isStable: boolean
): boolean => {
  // Honeypot Detection Criteria:
  // - Exchange listings < 2
  if (exchangeListings < 2) {
    return false;
  }
  // - Volume / Market Cap ratio < 0.00001
  if (marketCap > 0 && (volume24 / marketCap) < 0.00001) {
    return false;
  }
  // - Bid-ask spread > 5%
  if (bidAskSpread > 0.05) {
    return false;
  }
  // - No trading activity for 24+ hours (assumed if volume is 0)
  if (volume24 <= 0) {
    return false;
  }
  // - Price manipulation flagged by 50x deviation filter (not directly available, so we skip for now)

  // Stablecoin Exclusion:
  // - 24h price volatility < 0.1%
  if (isStable || priceVolatility < 0.001) {
    return false;
  }
  // - Price always pegged within ±1% of target value (assumed if it's a stablecoin)

  // Low-Quality Token Filters:
  // - Verified supply = No
  if (!verifiedSupply) {
    return false;
  }
  // - Z-score outside acceptable range (not directly available, so we skip for now)
  // - Token holder concentration (top 10 holders > 80% of supply)
  if (topHoldersConcentration > 0.8) {
    return false;
  }

  return true;
};

/**
 * Fetches live token data for the Monad network.
 * Applies strict filtering to exclude junk tokens and uses a composite score for ranking.
 */
export const fetchMonadTokens = async (): Promise<Token[]> => {
  // Query for Monad Testnet (143) with liquidity filter
  const query = `
    query MonadTokens {
      filterTokens(
        filters: {
          network: [143]
          liquidity: { gt: 1000 }
        }
        limit: 150
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
      console.error("Codex API Errors:", result.errors);
      return [];
    }

    const items = result.data?.filterTokens?.results || [];

    // Extract all market caps to find the maximum for normalization
    const marketCaps = items.map((item: any) => parseFloat(item.marketCap || '0')).filter(mc => mc > 0);
    const maxMarketCap = Math.max(...marketCaps, 1); // Avoid division by zero

    const tokens: Token[] = await Promise.all(items
      .filter((item: any) => {
        const t = item.token;
        if (!t || !t.symbol || !t.name) return false;

        const s = t.symbol.toUpperCase();
        const n = t.name.toUpperCase();

        // STRICT FILTERING: Exclude tokens with junk keywords
        const junkKeywords = ['FAUCET', 'TEST', 'MOCK', 'EXAMPLE', 'DEMO'];
        if (junkKeywords.some(keyword => n.includes(keyword) || s.includes(keyword))) {
          return false;
        }

        // Filter out tokens with zero or near-zero 24h volume (inactive/honeypot)
        if (item.volume24 <= 10) {
          return false;
        }

        // Filter out tokens with extremely low market cap (less than $100)
        if (item.marketCap < 100) {
          return false;
        }

        return true;
      })
      .map(async (item: any) => {
        const t = item.token;
        const info = t.info || {};

        const price = parseFloat(item.priceUSD || '0');
        const change = parseFloat(item.change24 || '0') * 100;
        let mcap = parseFloat(item.marketCap || '0');
        const volume = parseFloat(item.volume24 || '0');

        // Fallback for market cap calculation if it's zero
        if (mcap === 0 && price > 0) {
          mcap = volume * 10;
        }

        const isStable = isStableCoin(t.symbol, t.name);
        const codexImage = info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl;

        // Fetch token image
        let imageUrl = codexImage;
        try {
          const fetchedImage = await fetchTokenImage(t.address);
          if (fetchedImage) {
            imageUrl = fetchedImage;
          }
        } catch (error) {
          console.warn(`Error fetching image for token ${t.address}:`, error);
          // Fallback to existing image
        }

        // Calculate the advanced composite score for ranking
        // Note: We don't have bid-ask spread or price volatility from the current API.
        // As a placeholder, we'll use 0 for bid-ask spread and 0 for price volatility.
        // In a real implementation, you would need to get this data from another source.
        const bidAskSpread = 0; // Placeholder
        const priceVolatility = 0; // Placeholder
        const topHoldersConcentration = 0; // Placeholder
        const exchangeListings = 1; // Placeholder
        const verifiedSupply = true; // Placeholder

        // Apply filters
        if (!shouldIncludeToken(
          verifiedSupply,
          exchangeListings,
          volume,
          mcap,
          bidAskSpread,
          priceVolatility,
          topHoldersConcentration,
          isStable
        )) {
          return null; // Filter out this token
        }

        const score = calculateAdvancedTokenScore(mcap, volume, change, bidAskSpread, maxMarketCap);

        return {
          id: t.address,
          symbol: t.symbol,
          name: t.name,
          price: price,
          change24h: change,
          marketCap: mcap,
          volume24h: volume,
          category: guessCategory(t.symbol, t.name),
          dominance: 0, // Will be calculated later
          imageUrl: imageUrl,
          backupImageUrl: codexImage,
          pairUrl: `https://www.defined.fi/monad/${t.address}`,
          chainId: 'monad',
          isStable: isStable,
          score: score // Add score for sorting
        };
      }));

    // Remove null tokens (filtered out)
    const validTokens = tokens.filter(token => token !== null) as Token[];

    // Sort tokens by the calculated score in descending order
    validTokens.sort((a, b) => b.score - a.score);

    // Calculate total market cap for dominance calculation
    const totalMcap = validTokens.reduce((sum, t) => sum + t.marketCap, 0);

    // Calculate dominance for each token
    return validTokens.map(t => ({
      ...t,
      dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0
    }));
  } catch (error) {
    console.error("Failed to fetch Monad tokens:", error);
    return [];
  }
};

/**
 * Fetches real token holder data from the Codex API.
 * Replaces the simulated data with actual on-chain data.
 */
export const fetchTokenHolders = async (tokenAddress: string): Promise<Holder[]> => {
  // Query for token holders from Codex API
  const query = `
    query TokenHolders($address: String!) {
      tokenHolders(
        token: $address
        network: 143
        limit: 100
        sortBy: "balance"
        sortDirection: "DESC"
      ) {
        results {
          address
          balance
          percentage
          isContract
          label
          connections {
            address
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
      body: JSON.stringify({
        query,
        variables: { address: tokenAddress }
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error("Codex API Errors (Token Holders):", result.errors);
      return [];
    }

    const holdersData = result.data?.tokenHolders?.results || [];

    // Map the API response to our Holder interface
    const holders: Holder[] = holdersData.map((holder: any) => ({
      address: holder.address,
      balance: parseFloat(holder.balance || '0'),
      percentage: parseFloat(holder.percentage || '0'),
      isContract: holder.isContract,
      label: holder.label || undefined,
      connections: holder.connections?.map((conn: any) => conn.address) || []
    }));

    return holders;
  } catch (error) {
    console.error("Failed to fetch token holders for address:", tokenAddress, error);
    // Return an empty array if there's an error
    return [];
  }
};
