import { Token } from '../types';

const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

export const fetchMonadTokens = async (): Promise<Token[]> => {
  // Query specifically for Monad (Chain ID 143)
  const query = `
    query MonadTokens {
      filterTokens(
        filters: {
          network: [143]
          liquidity: { gt: 5000 }
        }
        limit: 100
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

    const tokens: Token[] = items
        .filter((item: any) => {
            const t = item.token;
            const s = t.symbol?.toUpperCase();
            
            // Exclude specific Stablecoins only
            const EXCLUDED_SYMBOLS = new Set([
                'USDC', 'USDT', 'DAI', 'USDE', 'FDUSD', 'FRAX', 'AUSD', 'MUSD', 'LUSD'
            ]);

            if (EXCLUDED_SYMBOLS.has(s)) return false;

            return true;
        })
        .map((item: any) => {
            const t = item.token;
            const info = t.info || {};
            
            // Parse strings to numbers, safe defaults
            const price = parseFloat(item.priceUSD || '0');
            const change = parseFloat(item.change24 || '0') * 100;
            const mcap = parseFloat(item.marketCap || '0');
            const volume = parseFloat(item.volume24 || '0');

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
                // Codex/Defined.fi images
                imageUrl: info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl,
                pairUrl: `https://www.defined.fi/monad/${t.address}`,
                chainId: 'monad'
            };
        });
    
    // Sort by Market Cap descending
    tokens.sort((a, b) => b.marketCap - a.marketCap);

    const topTokens = tokens.slice(0, 80);

    const totalMcap = topTokens.reduce((sum, t) => sum + t.marketCap, 0);
    return topTokens.map(t => ({
        ...t,
        dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0
    }));

  } catch (error) {
    console.error("Failed to fetch Monad tokens from Codex:", error);
    return [];
  }
};

const guessCategory = (symbol: string, name: string): string => {
   const s = symbol.toUpperCase();
   const n = name.toUpperCase();
   
   // 1. Wrapped Tokens
   if (
       (s.startsWith('W') && (n.includes('WRAPPED') || s === 'WMON' || s === 'WETH' || s === 'WBTC')) &&
       s !== 'WIF' && s !== 'WEN' // Exclude common memes that start with W
    ) {
       return 'Wrapped';
   }

   // 2. Staked / LSTs
   if (s.startsWith('ST') || s.startsWith('EZ') || n.includes('STAKED') || n.includes('LIQUID')) {
       return 'Staked';
   }

   // 3. AI Tokens
   if (n.includes(' AI') || n.includes('GPT') || s.includes('AI') || n.includes('INTELLIGENCE') || n.includes('AGENT')) {
       return 'AI';
   }

   // 4. DeFi
   if (
       n.includes('SWAP') || n.includes('DEX') || n.includes('FINANCE') || 
       n.includes('PROTOCOL') || n.includes('YIELD') || n.includes('PERP') || 
       n.includes('DAO') || n.includes('EXCHANGE')
    ) {
       return 'DeFi';
   }
   
   // 5. Default to Meme
   return 'Meme'; 
}