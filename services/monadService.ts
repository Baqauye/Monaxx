// services/monadService.ts
import { Token } from '../types';
import blockvision from '@api/blockvision';

// BlockVision API Key
const BLOCKVISION_API_KEY = '36RJSlyM5vIL2R1kKugyMU1NZeT';

// Initialize BlockVision client
const blockvisionClient = blockvision.initialize({
    apiKey: BLOCKVISION_API_KEY,
    // Assuming mainnet, adjust if needed
    // The API handles network selection via the key, so no specific network config needed here for the client instance
});

const isStableCoin = (symbol: string, name: string): boolean => {
  const s = (symbol|| '').toUpperCase();
  const n = (name|| '').toUpperCase();
  const stableCoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD','FRAX', 'LUSD', 'SUSD', 'MIM', 'FEI', 'ALUSD', 'DOLA','USD', 'TETHER', 'STBL'];
  return stableCoins.some(stable =>s.includes(stable)|| n.includes(stable));
};

const guessCategory = (symbol: string, name: string): string => {
  const s = (symbol|| '').toUpperCase();
  const n = (name|| '').toUpperCase();

  if (isStableCoin(s, n)) return 'Stable';
  if (s.includes('WMON') || n.includes('WRAPPED')) return 'Wrapped';
  if (s.includes('ST') || n.includes('STAKED')) return 'Staked';
  if (n.includes('AI') || n.includes('GPT') || s.includes('AI')) return 'AI';
  if (n.includes('SWAP') || n.includes('DEX') || n.includes('FINANCE') || n.includes('PROTOCOL') || n.includes('YIELD')) return 'DeFi';
  // Check for common meme coin indicators
  if (n.includes('PEPE') || n.includes('SHIB') || n.includes('DOGE') || n.includes('FLOKI') || n.includes('BONK') || n.includes('WIF')) return 'Meme';
  // Default to Meme if no specific category is found
  return 'Meme';
};

export const fetchMonadTokens = async (): Promise<Token[]> => {
  // For now, let's fetch a list of common tokens or use a placeholder if BlockVision doesn't have a direct 'all tokens' endpoint.
  // We'll use the Token Detail endpoint for known tokens or try the Account Tokens endpoint for a specific address if available.
  // A more robust solution might involve indexing or a token list.
  // For demonstration, let's try fetching details for a few known tokens or use the account tokens endpoint with a common address.
  // Let's try the Retrieve Account Tokens endpoint for a common address that holds many tokens.
  // Example address: 0x7B2728c04aD436153285702e969e6EfAc3a97777 (from the BlockVision docs)
  // This might not give *all* tokens on the chain, but a representative sample.

  const commonAddress = '0x7B2728c04aD436153285702e969e6EfAc3a97777'; // Example from docs, replace with a more suitable one if needed
  try {
    const response = await blockvisionClient.get_monadaccounttokens({ address: commonAddress });
    if (response.code !== 0) {
        console.error("BlockVision API Error (Account Tokens):", response.reason);
        return [];
    }

    const tokenList = response.result?.data || [];

    const tokens: Token[] = await Promise.all(tokenList.map(async (tokenData: any) => {
        const contractAddress = tokenData.contractAddress;
        try {
            // Fetch detailed market data for each token found in the account
            const marketResponse = await blockvisionClient.get_monadtokenmarketdata({ token: contractAddress });
            const detailResponse = await blockvisionClient.retrieveTokenDetail({ address: contractAddress });

            let marketData = {};
            let detailData = {};
            if (marketResponse.code === 0 && marketResponse.result) {
                 marketData = marketResponse.result;
            } else {
                console.warn(`Market data not available for ${contractAddress}:`, marketResponse.reason);
            }

            if (detailResponse.code === 0 && detailResponse.result) {
                 detailData = detailResponse.result;
            } else {
                console.warn(`Detail data not available for ${contractAddress}:`, detailResponse.reason);
            }

            const price = parseFloat(marketData.priceInUsd || '0');
            const marketCap = parseFloat(marketData.marketCap || '0');
            const volume24h = parseFloat(marketData.volume24H || '0');
            const fdv = parseFloat(marketData.fdvInUsd || '0');
            const liquidity = parseFloat(marketData.liquidityInUsd || '0');
            const change24h = parseFloat(marketData.market?.hour24?.priceChange || '0'); // Using 24h change from market object

            const name = detailData.name || tokenData.name || 'Unknown';
            const symbol = detailData.symbol || tokenData.symbol || 'UNKNOWN';
            const imageUrl = detailData.logo || tokenData.logo || undefined;
            const totalSupply = detailData.totalSupply || undefined;
            const holders = detailData.holders || undefined;

            return {
                id: contractAddress,
                name: name,
                symbol: symbol,
                price: price,
                change24h: change24h,
                marketCap: marketCap,
                volume24h: volume24h,
                category: guessCategory(symbol, name),
                dominance: 0, // Will be calculated later
                fdv: fdv,
                liquidity: liquidity,
                holders: holders,
                totalSupply: totalSupply,
                imageUrl: imageUrl,
                backupImageUrl: undefined,
                pairUrl: `https://monad.explorer.com/token/${contractAddress}`, // Placeholder link
                chainId: 'monad',
                isStable: isStableCoin(symbol, name),
            };
        } catch (innerError) {
            console.error(`Error fetching details for token ${contractAddress}:`, innerError);
            // Return a minimal token object or skip
            return {
                id: contractAddress,
                name: tokenData.name || 'Unknown',
                symbol: tokenData.symbol || 'UNKNOWN',
                price: 0,
                change24h: 0,
                marketCap: 0,
                volume24h: 0,
                category: 'Unknown',
                dominance: 0,
                imageUrl: tokenData.logo || undefined,
                backupImageUrl: undefined,
                pairUrl: `https://monad.explorer.com/token/${contractAddress}`,
                chainId: 'monad',
                isStable: false,
            };
        }
    }));

    // Filter out tokens with zero market cap or other critical data missing if necessary
    const validTokens = tokens.filter(t => t.marketCap > 0); // Adjust filter as needed

    // Calculate total market cap for dominance
    const totalMcap = validTokens.reduce((sum, t) => sum + t.marketCap, 0);

    return validTokens.map(t => ({
        ...t,
        dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0
    }));

  } catch (error) {
    console.error("Failed to fetch Monad tokens via BlockVision:", error);
    return [];
  }
};

export const fetchTokenHolders = async (tokenAddress: string): Promise<Holder[]> => {
  try {
    const response = await blockvisionClient.retrieveTokenHolders({ contractAddress: tokenAddress, limit: 100 }); // Fetch top 100 holders
    if (response.code !== 0) {
        console.error("BlockVision API Error (Token Holders):", response.reason);
        return [];
    }

    const holdersData = response.result?.data || [];

    return holdersData.map((holderData: any) => ({
        address: holderData.holder,
        balance: parseFloat(holderData.amount) || 0, // Assuming amount is a string number
        percentage: parseFloat(holderData.percentage) || 0,
        isContract: holderData.isContract,
        // Note: BlockVision API doesn't seem to provide 'label' or 'connections' directly in the holders endpoint
        // These would need to be fetched separately or mapped from an external source if available
        // label: holderData.label || undefined,
        // connections: holderData.connections || [],
    }));
  } catch (error) {
    console.error("Failed to fetch token holders via BlockVision:", error);
    return [];
  }
};
