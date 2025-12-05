// services/monadService.ts
import { Token } from '../types';

// BlockVision API Key
const BLOCKVISION_API_KEY = '36RJSlyM5vIL2R1kKugyMU1NZeT';
const BLOCKVISION_BASE_URL = 'https://api.blockvision.org/v2/monad';

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
  if (n.includes('PEPE') || n.includes('SHIB') || n.includes('DOGE') || n.includes('FLOKI') || n.includes('BONK') || n.includes('WIF')) return 'Meme';
  return 'Meme';
};

// Helper function to call BlockVision API
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

export const fetchMonadTokens = async (): Promise<Token[]> => {
  const commonAddress = '0x7B2728c04aD436153285702e969e6EfAc3a97777'; // Example from docs
  try {
    // 1. Fetch tokens held by the common address
    const accountTokensResponse = await callBlockVisionAPI('/account/tokens', { address: commonAddress });
    if (accountTokensResponse.code !== 0) {
        console.error("BlockVision API Error (Account Tokens):", accountTokensResponse.reason);
        return [];
    }

    const tokenList = accountTokensResponse.result?.data || [];

    // 2. Fetch market data and details for each token
    const tokens: Token[] = await Promise.all(tokenList.map(async (tokenData: any) => {
        const contractAddress = tokenData.contractAddress;
        try {
            // Fetch market data
            let marketData = { priceInUsd: '0', marketCap: '0', volume24H: '0', fdvInUsd: '0', liquidityInUsd: '0', market: { hour24: { priceChange: '0' } } };
            try {
                const marketResponse = await callBlockVisionAPI('/token/market/data', { token: contractAddress });
                if (marketResponse.code === 0 && marketResponse.result) {
                     marketData = marketResponse.result;
                } else {
                    console.warn(`Market data not available for ${contractAddress}:`, marketResponse.reason);
                }
            } catch (bvMarketError) {
                 console.warn(`Could not fetch market data for ${contractAddress}:`, bvMarketError);
            }

            // Fetch token details
            let detailData = { name: '', symbol: '', logo: '', totalSupply: '', holders: 0 };
            try {
                const detailResponse = await callBlockVisionAPI('/token/detail', { address: contractAddress });
                if (detailResponse.code === 0 && detailResponse.result) {
                     detailData = detailResponse.result;
                } else {
                    console.warn(`Detail data not available for ${contractAddress}:`, detailResponse.reason);
                }
            } catch (bvDetailError) {
                 console.warn(`Could not fetch detail data for ${contractAddress}:`, bvDetailError);
            }

            const price = parseFloat(marketData.priceInUsd || '0');
            const marketCap = parseFloat(marketData.marketCap || '0');
            const volume24h = parseFloat(marketData.volume24H || '0');
            const fdv = parseFloat(marketData.fdvInUsd || '0');
            const liquidity = parseFloat(marketData.liquidityInUsd || '0');
            const change24h = parseFloat(marketData.market?.hour24?.priceChange || '0');

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
                dominance: 0,
                fdv: fdv,
                liquidity: liquidity,
                holders: holders,
                totalSupply: totalSupply,
                imageUrl: imageUrl,
                backupImageUrl: undefined,
                pairUrl: `https://monad.explorer.com/token/${contractAddress}`,
                chainId: 'monad',
                isStable: isStableCoin(symbol, name),
            };
        } catch (innerError) {
            console.error(`Error fetching details for token ${contractAddress}:`, innerError);
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

    const validTokens = tokens.filter(t => t.marketCap > 0);

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
