import { Token, Holder } from '../types';

const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

const isStableCoin = (symbol: string, name: string): boolean => {
  const s = (symbol || '').toUpperCase();
  const n = (name || '').toUpperCase();
  
  const stableCoins = [
    'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD', 
    'FRAX', 'LUSD', 'SUSD', 'MIM', 'FEI', 'ALUSD', 'DOLA',
    'USD', 'TETHER'
  ];
  
  return stableCoins.some(stable => 
    s.includes(stable) || n.includes(stable)
  );
};

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

// Function to fetch token image from multiple sources
const fetchTokenImage = async (tokenAddress: string): Promise<string | null> => {
  // Try Dexscreener first
  const dexscreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/monad/${tokenAddress}.png`;
  
  try {
    const response = await fetch(dexscreenerUrl, { method: 'HEAD' });
    if (response.ok) {
      return dexscreenerUrl;
    }
  } catch (error) {
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
    // Continue to next source
  }
  
  return null;
};

export const fetchMonadTokens = async (): Promise<Token[]> => {
  // Query for Monad Testnet (143)
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

    const tokens: Token[] = await Promise.all(items
        .filter((item: any) => {
            const t = item.token;
            if (!t || !t.symbol || !t.name) return false;

            const s = t.symbol.toUpperCase();
            const n = t.name.toUpperCase();
            
            // STRICT FILTERING
            const junkKeywords = ['FAUCET', 'TEST', 'MOCK', 'EXAMPLE']; 
            if (junkKeywords.some(keyword => n.includes(keyword) || s.includes(keyword))) {
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
            
            if (mcap === 0 && price > 0) {
               mcap = volume * 10; 
            }

            const isStable = isStableCoin(t.symbol, t.name);
            const codexImage = info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl;

            // Try to fetch token image
            let imageUrl = codexImage;
            try {
              const fetchedImage = await fetchTokenImage(t.address);
              if (fetchedImage) {
                imageUrl = fetchedImage;
              }
            } catch (error) {
              // Fallback to existing image
            }

            return {
                id: t.address,
                symbol: t.symbol,
                name: t.name,
                price: price,
                change24h: change,
                marketCap: mcap,
                volume24h: volume,
                category: guessCategory(t.symbol, t.name),
                dominance: 0,
                imageUrl: imageUrl,
                backupImageUrl: codexImage,
                pairUrl: `https://www.defined.fi/monad/${t.address}`,
                chainId: 'monad',
                isStable: isStable
            };
        }));
    
    tokens.sort((a, b) => b.marketCap - a.marketCap);

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

export const fetchTokenHolders = async (tokenAddress: string): Promise<Holder[]> => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const holders: Holder[] = [];
    const totalSupply = 1_000_000_000;
    let remainingSupply = totalSupply;

    // 1. LP
    holders.push({
        address: tokenAddress,
        balance: totalSupply * 0.15,
        percentage: 15,
        isContract: true,
        label: "Liquidity Pool"
    });
    remainingSupply -= totalSupply * 0.15;

    // 2. Whales
    const whaleCount = 5;
    for (let i = 0; i < whaleCount; i++) {
        const percent = (Math.random() * 5) + 2; 
        const amount = totalSupply * (percent / 100);
        holders.push({
            address: `0x${Math.random().toString(16).slice(2, 42)}`,
            balance: amount,
            percentage: percent,
            isContract: Math.random() > 0.8,
            label: i === 0 ? "Deployer" : i === 1 ? "Vesting" : undefined,
            connections: [tokenAddress] 
        });
        remainingSupply -= amount;
    }

    // 3. Medium
    const mediumCount = 20;
    for (let i = 0; i < mediumCount; i++) {
        const percent = (Math.random() * 0.8) + 0.1; 
        const amount = totalSupply * (percent / 100);
        const parent = holders[Math.floor(Math.random() * 5)].address; 
        holders.push({
            address: `0x${Math.random().toString(16).slice(2, 42)}`,
            balance: amount,
            percentage: percent,
            isContract: false,
            connections: Math.random() > 0.7 ? [parent] : []
        });
        remainingSupply -= amount;
    }

    // 4. Dust
    const smallCount = 75;
    for (let i = 0; i < smallCount; i++) {
        const amount = (remainingSupply / smallCount) * (Math.random() * 1.5); 
        holders.push({
            address: `0x${Math.random().toString(16).slice(2, 42)}`,
            balance: amount,
            percentage: (amount / totalSupply) * 100,
            isContract: false
        });
    }

    return holders;
};
