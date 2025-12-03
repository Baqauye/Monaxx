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
            const n = t.name?.toUpperCase();

            // 1. Explicitly ALLOW wMON (Wrapped Monad)
            if (s === 'WMON') return true;

            // 2. Filter out specific Excluded Symbols (Stables, LSTs, Wrapped Majors)
            const EXCLUDED_SYMBOLS = new Set([
                'USDC', 'USDT', 'DAI', 'USDE', 'FDUSD', 'FRAX', 'AUSD', 'MUSD', // Stablecoins
                'WETH', 'WBTC', 'WBNB', 'SOL', // Wrapped Majors
                'WSTETH', 'SHMONAD', 'STMON', 'EZETH', 'WEETH', 'STONE', 'RSETH', 'METH' // LSTs & Derivatives
            ]);

            if (EXCLUDED_SYMBOLS.has(s)) return false;

            // 3. Filter out based on Name Patterns
            const EXCLUDED_PATTERNS = [
                'USD COIN', 'TETHER', 'DAI STABLECOIN', 
                'WRAPPED ETHER', 'WRAPPED BITCOIN', 
                'STAKED MONAD', 'LIQUID STAKED', 'SHARDED MONAD'
            ];

            if (EXCLUDED_PATTERNS.some(pattern => n.includes(pattern))) return false;

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
                imageUrl: info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl,
                pairUrl: `https://www.defined.fi/monad/${t.address}`,
                chainId: 'monad'
            };
        });
    
    // Sort by Market Cap descending
    tokens.sort((a, b) => b.marketCap - a.marketCap);

    const topTokens = tokens.slice(0, 60);

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
   const s = symbol.toLowerCase();
   const n = name.toLowerCase();
   
   if (s === 'wmon' || s === 'mon' || n.includes('monad')) return 'Layer 1';
   if (n.includes('swap') || n.includes('dex') || n.includes('finance') || n.includes('yield') || n.includes('perp')) return 'DeFi';
   if (n.includes('game') || n.includes('play') || n.includes('quest')) return 'Gaming';
   if (n.includes('ai') || n.includes('gpt') || n.includes('intel') || n.includes('agent')) return 'AI';
   
   // Default to Meme for ecosystem tokens that don't fit other strict categories
   // This ensures the "Meme" default view is populated with the vibrant ecosystem tokens
   return 'Meme'; 
}