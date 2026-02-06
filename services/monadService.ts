// services/monadService.ts
import { Token, Holder } from '../types';
import { classifyToken } from './categoryClassifier';

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
 * Checks if a token should be filtered out based on unwanted patterns.
 */
const isUnwantedToken = (symbol: string, name: string): boolean => {
  const s = (symbol || '').toUpperCase();
  const n = (name || '').toUpperCase();

  // Specific unwanted tokens
  const unwantedSymbols = [
    'MUBOND', 'SHMON', 'AZND', 'LOAZND', 'MUBON', 'LOAZ'
  ];

  // Check if symbol matches any unwanted tokens
  if (unwantedSymbols.some(unwanted => s === unwanted || s.includes(unwanted))) {
    return true;
  }

  // Filter tokens with common unwanted prefixes
  const unwantedPrefixes = ['MU', 'LO', 'SH', 'ST', 'EZ'];
  const unwantedSuffixes = ['BOND', 'AZND'];

  // Check for unwanted prefix + suffix combinations
  for (const prefix of unwantedPrefixes) {
    for (const suffix of unwantedSuffixes) {
      if (s === prefix + suffix) {
        return true;
      }
    }
  }

  // Filter tokens with patterns like "liquid", "staked", "wrapped" derivatives
  const unwantedPatterns = [
    'LIQUID', 'STAKED', 'WRAPPED', 'RECEIPT', 'VAULT', 'CERTIFICATE'
  ];

  if (unwantedPatterns.some(pattern => n.includes(pattern) && (s.startsWith('MU') || s.startsWith('LO') || s.startsWith('SH')))) {
    return true;
  }

  return false;
};

const guessCategory = (symbol: string, name: string): string => classifyToken(symbol, name);

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
 * Fetches live token data for the Monad network.
 * Applies strict filtering to exclude junk tokens and uses a composite score for ranking.
 */
export const fetchMonadTokens = async (): Promise<Token[]> => {
  // Query for Monad main-net (143) with liquidity filter
  const query = `
    query MonadTokens {
      filterTokens(
        filters: {
          network: [143]
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

        // FILTER OUT UNWANTED TOKENS (muBOND, shMON, AZND, loAZND, etc.)
        if (isUnwantedToken(t.symbol, t.name)) {
          console.log(`Filtered out unwanted token: ${t.symbol} (${t.name})`);
          return false;
        }

        // STRICT FILTERING: Exclude tokens with junk keywords
        const junkKeywords = ['FAUCET', 'TEST', 'MOCK', 'EXAMPLE', 'DEMO', 'NFT'];
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
        const change = parseFloat(item.change24 || '0');
        const mcap = parseFloat(item.marketCap || '0');
        const volume = parseFloat(item.volume24 || '0');

        const category = guessCategory(t.symbol, t.name);
        const isStable = category === 'Stablecoins';
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
        const score = calculateTokenScore(mcap, volume, change);

        return {
          id: t.address,
          symbol: t.symbol,
          name: t.name,
          price: price,
          change24h: change,
          marketCap: mcap,
          volume24h: volume,
          category: category,
          dominance: 0, // Will be calculated later
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

    // Calculate total market cap for dominance calculation
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
