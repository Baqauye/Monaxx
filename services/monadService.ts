import { Token } from '../types';

const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

export const fetchMonadTokens = async (): Promise<Token[]> => {
  // Query specifically for Monad (Chain ID 143 / Testnet)
  // Liquidity > $1000 to filter out complete garbage/spam
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

    const tokens: Token[] = items
        .filter((item: any) => {
            const t = item.token;
            if (!t || !t.symbol || !t.name) return false;

            const s = t.symbol.toUpperCase();
            const n = t.name.toUpperCase();
            
            // STRICT FILTERING: Remove typical spam/test tokens
            const junkKeywords = ['FAUCET', 'TEST', 'MOCK', 'EXAMPLE', 'TETHER', 'USDC']; 
            if (junkKeywords.some(keyword => n.includes(keyword) || s.includes(keyword))) {
                // Allow major stablecoins if they are legit wrappers, but block generic 'Test Tether'
                if (s === 'USDC' || s === 'USDT') return true; 
                return false;
            }

            return true;
        })
        .map((item: any) => {
            const t = item.token;
            const info = t.info || {};
            
            // Parse strings to numbers with safe fallbacks
            const price = parseFloat(item.priceUSD || '0');
            const change = parseFloat(item.change24 || '0') * 100;
            let mcap = parseFloat(item.marketCap || '0');
            const volume = parseFloat(item.volume24 || '0');
            
            // Fallback for mcap if missing (often missing on testnet)
            if (mcap === 0 && price > 0) {
               mcap = volume * 10; // Crude estimation for visualization if mcap is missing
            }

            // Image Strategy:
            // 1. DexScreener is often most up to date for meme coins.
            // 2. Codex images (from the 'info' object) are the backup.
            const dexscreenerImage = `https://dd.dexscreener.com/ds-data/tokens/monad/${t.address}.png`;
            const codexImage = info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl;

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
                imageUrl: dexscreenerImage,
                backupImageUrl: codexImage,
                pairUrl: `https://www.defined.fi/monad/${t.address}`,
                chainId: 'monad'
            };
        });
    
    // Sort by Market Cap descending
    tokens.sort((a, b) => b.marketCap - a.marketCap);

    // Calculate dominance
    const totalMcap = tokens.reduce((sum, t) => sum + t.marketCap, 0);
    return tokens.map(t => ({
        ...t,
        dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0
    }));

  } catch (error) {
    console.error("Failed to fetch Monad tokens from Codex:", error);
    return [];
  }
};

const guessCategory = (symbol: string, name: string): string => {
   const s = (symbol || '').toUpperCase();
   const n = (name || '').toUpperCase();
   
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
   
   // Default bucket for everything else on this chain
   return 'Meme'; 
}