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
 * The score combines market cap, volume, and 24h change, while penalizing low activity or potential honeypots.
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

  // --- Scoring Components ---
  // 1. Market Cap: Logarithmic scale to handle wide ranges, weighted heavily
  const normalizedMarketCap = Math.log(marketCap + 1) * 0.4;

  // 2. Volume: Logarithmic scale, weighted significantly
  const normalizedVolume = Math.log(volume24 + 1) * 0.3;

  // 3. Price Change: Absolute value for magnitude, positive for momentum, negative for volatility penalty
  const changeMagnitude = Math.abs(change24) * 0.2; // Weight for magnitude
  const momentumBonus = change24 > 0 ? change24 * 0.1 : change24 * 0.05; // Bonus for positive, penalty for negative

  // 4. Honeypot/Activity Penalty: Check volume-to-market-cap ratio
  const volumeToMarketCapRatio = volume24 / marketCap;
  const activityPenalty = volumeToMarketCapRatio < 0.001 ? -50 : 0; // Severe penalty for very low activity relative to size
  // Optional: Mild penalty for low absolute volume even if ratio is okay
  const lowVolumePenalty = volume24 < 100 ? -10 : 0;

  // --- Final Score Calculation ---
  const score = normalizedMarketCap + normalizedVolume + changeMagnitude + momentumBonus + activityPenalty + lowVolumePenalty;

  // Ensure score is not negative due to penalties
  return Math.max(score, 0);
};

/**
 * Fetches live token data for the Monad network.
 * Applies strict filtering to exclude junk tokens, stablecoins, and potential honeypots.
 * Uses a composite score for ranking based on market cap, volume, price change, and activity.
 */
export const fetchMonadTokens = async (): Promise<Token[]> => {
  // Query for Monad (assuming network ID 143) with liquidity filter
  const query = `
    query MonadTokens {
      filterTokens(
        filters: {
          network: [143]
          liquidity: { gt: 1000 } // Filter for some minimum liquidity
        }
        limit: 200 // Fetch more initially to allow for filtering
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

    const tokens: Token[] = await Promise.all(items
      .filter((item: any) => {
        const t = item.token;
        if (!t || !t.symbol || !t.name) return false;

        const s = t.symbol.toUpperCase();
        const n = t.name.toUpperCase();

        // --- Filtering Criteria ---
        // 1. Exclude junk keywords (including the unwanted tokens you specified)
        const junkKeywords = ['FAUCET', 'TEST', 'MOCK', 'EXAMPLE', 'DEMO', 'NFT', 'MUBOND', 'SHMON', 'AZND', 'LOAZND'];
        if (junkKeywords.some(keyword => n.includes(keyword) || s.includes(keyword))) {
          return false;
        }

        // 2. Exclude stablecoins (if desired, uncomment the next line)
        // if (isStableCoin(t.symbol, t.name)) return false;

        // 3. Filter out tokens with very low volume (indicates low activity)
        if (parseFloat(item.volume24 || '0') < 10) {
          return false;
        }

        // 4. Filter out tokens with extremely low market cap
        if (parseFloat(item.marketCap || '0') < 100) {
          return false;
        }

        // 5. Potentially filter out tokens with 0% change and very low volume (dormant)
        const change24Num = parseFloat(item.change24 || '0') * 100;
        if (change24Num === 0 && parseFloat(item.volume24 || '0') < 50) {
             return false;
        }

        return true;
      })
      .map(async (item: any) => {
        const t = item.token;
        const info = t.info || {};

        const price = parseFloat(item.priceUSD || '0');
        const change24h = parseFloat(item.change24 || '0') * 100; // Codex gives fraction, convert to %
        let marketCap = parseFloat(item.marketCap || '0');
        const volume24h = parseFloat(item.volume24 || '0');

        // Fallback for market cap calculation if it's zero (though filtering should catch most)
        if (marketCap === 0 && price > 0 && volume24h > 0) {
          marketCap = volume24h * 10; // Example fallback logic
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

        // Calculate the composite score for ranking
        const score = calculateTokenScore(marketCap, volume24h, change24h);

        return {
          id: t.address,
          symbol: t.symbol,
          name: t.name,
          price: price,
          change24h: change24h,
          marketCap: marketCap,
          volume24h: volume24h,
          category: guessCategory(t.symbol, t.name),
          dominance: 0, // Will be calculated later based on filtered/scored list
          imageUrl: imageUrl,
          backupImageUrl: codexImage,
          pairUrl: `https://www.defined.fi/monad/${t.address}`,
          chainId: 'monad',
          isStable: isStable,
          score: score // Add score for sorting
        };
      }));

    // Sort tokens by the calculated score in descending order
    tokens.sort((a, b) => b.score - a.score);

    // Calculate total market cap for dominance calculation based on the final, ranked list
    const totalMcap = tokens.reduce((sum, t) => sum + t.marketCap, 0);

    // Calculate dominance for each token
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
 * Fetches simulated token holder data.
 * This is a placeholder function. In a real implementation, you would query
 * a blockchain explorer API or an indexer for actual on-chain holder data.
 * The current simulation is not accurate.
 */
export const fetchTokenHolders = async (tokenAddress: string): Promise<Holder[]> => {
  // --- SIMULATION LOGIC (PLACEHOLDER) ---
  // In reality, this should query an API like BlockVision, Etherscan, or a custom indexer.
  // The Codex API might not provide detailed holder lists directly.
  // Example using a hypothetical API:
  // const response = await fetch(`https://api.blockchainexplorer.com/holders/${tokenAddress}`);
  // const data = await response.json();
  // return data.holders.map(holder => ({ ... }));
  // -------------------------------

  console.warn("Using simulated holder data for", tokenAddress);
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const holders: Holder[] = [];
  const numHolders = 50 + Math.floor(Math.random() * 50); // Simulate 50-100 holders

  let totalSupplySim = 0;
  // First pass: generate balances and calculate total supply
  for (let i = 0; i < numHolders; i++) {
    const balance = Math.random() * 1000000; // Random balance up to 1M
    totalSupplySim += balance;
    holders.push({
      address: `0x${Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      balance: balance,
      percentage: 0, // Placeholder, will calculate later
      isContract: Math.random() > 0.7, // 30% chance it's a contract
    });
  }

  // Second pass: calculate percentage based on simulated total supply
  return holders.map(holder => ({
    ...holder,
    percentage: (holder.balance / totalSupplySim) * 100
  }));
};
