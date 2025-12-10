// services/monadService.ts (FULL REWRITE OF CATEGORY LOGIC)

import { Token, Holder, TokenCategory } from '../types';

const CODEX_API_KEY = '6a28836dea12a4050f2e0256b585eef55f75aeb8';
const GRAPHQL_ENDPOINT = 'https://graph.codex.io/graphql';

// ================
// 🔍 CATEGORY MATCHERS
// ================

// Helper: Test if any keyword appears as a *whole word* in text (case-insensitive)
const wordMatch = (text: string, keywords: string[]): boolean => {
  const lower = text.toLowerCase();
  return keywords.some(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(lower);
  });
};

// Helper: Try to extract tags from token.info (Codex may provide)
const extractTags = (info: any): string[] => {
  // Codex returns tags? Let's check common structures
  if (Array.isArray(info?.tags)) return info.tags.map(t => String(t).toLowerCase());
  if (typeof info?.category === 'string') return [info.category.toLowerCase()];
  if (info?.categories && Array.isArray(info.categories)) return info.categories.map(c => String(c).toLowerCase());
  return [];
};

// 🔑 Stablecoin matcher (strict)
const isStablecoin = (symbol: string, name: string): boolean => {
  const s = symbol.toUpperCase();
  const n = name.toUpperCase();
  return (
    wordMatch(s + ' ' + n, [
      'USD', 'EUR', 'JPY', 'GBP', 'CAD', 'AUD',
      'TETHER', 'DAI', 'BUSD', 'USDT', 'USDC', 'FRAX', 'LUSD',
      'STABLE', 'STABLECOIN', 'PARITY', 'PEG'
    ]) ||
    s.startsWith('USD') || s.startsWith('EUR') ||
    n.includes('STABLE') ||
    s.endsWith('USD') || s.endsWith('EUR')
  );
};

// 🔑 AI Tokens
const isAiToken = (symbol: string, name: string, tags: string[]): boolean =>
  wordMatch(symbol + ' ' + name, ['AI', 'GPT', 'ML', 'AGENT', 'INTELLIGENCE', 'NEURAL', 'LLM']) ||
  tags.some(t => /ai|machine.?learning|neural|llm|agent/i.test(t));

// 🔑 DeFi Tokens (protocols)
const isDefiToken = (symbol: string, name: string, tags: string[]): boolean =>
  wordMatch(name, ['SWAP', 'DEX', 'POOL', 'YIELD', 'FARM', 'LENDING', 'PERP', 'BANK', 'INSURANCE', 'LIQUIDITY', 'VAULT']) ||
  tags.some(t => /defi|dex|yield|lending|perp|farm|protocol/i.test(t));

// 🔑 Governance Tokens
const isGovernanceToken = (symbol: string, name: string, tags: string[]): boolean =>
  wordMatch(name, ['GOV', 'GOVERNANCE', 'DAO', 'VOTE', 'PROPOSAL']) ||
  tags.some(t => /governance|dao|vote/i.test(t));

// 🔑 Utility Tokens
// (broad fallback — often overlaps; prioritize others first)
const isUtilityToken = (symbol: string, name: string, tags: string[]): boolean =>
  wordMatch(name, ['UTILITY', 'ACCESS', 'SERVICE', 'PLATFORM', 'FEE', 'GAS']) ||
  tags.some(t => /utility|access|service|fee/i.test(t));

// 🔑 GameFi Tokens
const isGameFiToken = (symbol: string, name: string, tags: string[]): boolean =>
  wordMatch(name, ['GAME', 'PLAY', 'NFT', 'METAVERSE', 'QUEST', 'LEVEL', 'GUILD', 'ITEM']) ||
  tags.some(t => /game|play.*to.*earn|metaverse|nft|p2e/i.test(t));

// 🔑 RWA Tokens (Real World Assets)
const isRwaToken = (symbol: string, name: string, tags: string[]): boolean =>
  wordMatch(name, ['RWA', 'REAL', 'WORLD', 'ASSET', 'PROPERTY', 'BOND', 'LOAN', 'TREASURY', 'SECURITY']) ||
  tags.some(t => /rwa|real.?world|property|bond|security|treasury/i.test(t));

// 🔑 Infrastructure & Tools
const isInfrastructureToken = (symbol: string, name: string, tags: string[]): boolean =>
  wordMatch(name, [
    'INFRA', 'INFRASTRUCTURE', 'INDEXER', 'RPC', 'NODE',
    'CHAIN', 'LAYER', 'SDK', 'TOOL', 'ORACLE', 'MIDDLEWARE',
    'INDEX', 'API', 'QUERY', 'SUBGRAPH'
  ]) ||
  tags.some(t => /infra|indexer|rpc|node|oracle|sdk|middleware|layer/i.test(t));

// 🔑 Privacy Tokens
const isPrivacyToken = (symbol: string, name: string, tags: string[]): boolean =>
  wordMatch(name, ['PRIVACY', 'PRIVATE', 'ZK', 'ZKP', 'SHIELD', 'CLOAK', 'ANON', 'MIXER']) ||
  tags.some(t => /privacy|private|zk|zero.?knowledge|anon|mixer/i.test(t));

// 🔁 Final Category Classifier — ordered by priority
const classifyToken = (symbol: string, name: string, info: any): TokenCategory => {
  const tags = extractTags(info);

  // 1. Stablecoins (highest priority)
  if (isStablecoin(symbol, name)) return 'Stablecoins';

  // 2. AI Tokens
  if (isAiToken(symbol, name, tags)) return 'AI Tokens';

  // 3. DeFi Tokens
  if (isDefiToken(symbol, name, tags)) return 'DeFi Tokens';

  // 4. Governance Tokens
  if (isGovernanceToken(symbol, name, tags)) return 'Governance Tokens';

  // 5. GameFi
  if (isGameFiToken(symbol, name, tags)) return 'GameFi Tokens';

  // 6. RWA
  if (isRwaToken(symbol, name, tags)) return 'RWA Tokens';

  // 7. Infrastructure
  if (isInfrastructureToken(symbol, name, tags)) return 'Infrastructure & Tools';

  // 8. Privacy
  if (isPrivacyToken(symbol, name, tags)) return 'Privacy Tokens';

  // 9. Utility (broad — keep before Meme fallback)
  if (isUtilityToken(symbol, name, tags)) return 'Utility Tokens';

  // 10. Default: speculative → Meme Coins
  return 'Meme Coins';
};

// ================
// ❌ UNWANTED TOKEN FILTER (now tag/metadata-aware)
// ================

const isUnwantedToken = (symbol: string, name: string, info: any): boolean => {
  const s = symbol.toUpperCase();
  const n = name.toUpperCase();

  // Junk/placeholder/test tokens (case-insensitive whole-word match)
  if (wordMatch(n, ['TEST', 'FAUCET', 'MOCK', 'DEMO', 'EXAMPLE', 'JUNK', 'DUMMY'])) {
    return true;
  }

  // Very low activity (already filtered in fetch, but double-check)
  // → Handled elsewhere in liquidity/volume filter

  // Avoid "Wrapped" duplicates unless explicitly important (e.g., WETH handled manually later)
  // → We’ll keep W* tokens but classify them properly (e.g., WETH = Infrastructure or DeFi)

  return false;
};

// ================
// 🖼️ Token Image (unchanged)
// ================

const fetchTokenImage = async (tokenAddress: string): Promise<string | null> => {
  const dexscreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/monad/${tokenAddress}.png`;
  try {
    const response = await fetch(dexscreenerUrl, { method: 'HEAD' });
    if (response.ok) return dexscreenerUrl;
  } catch (e) {
    // ignore
  }
  try {
    const coingeckoUrl = `https://api.coingecko.com/api/v3/coins/monad/contract/${tokenAddress}`;
    const res = await fetch(coingeckoUrl);
    if (res.ok) {
      const data = await res.json();
      return data.image?.large || data.image?.small || data.image?.thumb || null;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

// ================
// 📊 Scoring (unchanged)
// ================

const calculateTokenScore = (marketCap: number, volume24: number, change24: number): number => {
  if (marketCap <= 0 || volume24 <= 0) return 0;
  const nMC = Math.log(marketCap + 1);
  const nVol = Math.log(volume24 + 1);
  const base = nMC * 0.6 + nVol * 0.3;
  const momentum = change24 > 0 ? change24 * 0.1 : change24 * 0.05;
  const ratioPenalty = volume24 / marketCap < 0.01 ? -10 : 0;
  return base + momentum + ratioPenalty;
};

// ================
// 🌐 Main Fetcher
// ================

export const fetchMonadTokens = async (): Promise<Token[]> => {
  const query = `
    query MonadTokens {
      filterTokens(
        filters: {
          network: [143]
          liquidity: { gt: 1000 }
        }
        limit: 100  // ← increase to get more for category coverage
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
              tags
              category
              categories
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CODEX_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const result = await res.json();
    if (result.errors) {
      console.error('Codex API errors:', result.errors);
      return [];
    }

    const items = result.data?.filterTokens?.results || [];

    const tokens: Token[] = await Promise.all(
      items
        .filter((item: any) => {
          const t = item.token;
          if (!t || !t.symbol || !t.name) return false;

          if (isUnwantedToken(t.symbol, t.name, t.info)) {
            console.log(`Filtered: ${t.symbol} — unwanted`);
            return false;
          }

          const vol = parseFloat(item.volume24 || '0');
          const mcap = parseFloat(item.marketCap || '0');
          if (vol < 10 || mcap < 100) return false;

          return true;
        })
        .map(async (item: any) => {
          const t = item.token;
          const info = t.info || {};
          const price = parseFloat(item.priceUSD || '0');
          const change = parseFloat(item.change24 || '0') * 100;
          let mcap = parseFloat(item.marketCap || '0');
          const vol = parseFloat(item.volume24 || '0');

          if (mcap === 0 && price > 0) {
            mcap = vol * 10;
          }

          const category = classifyToken(t.symbol, t.name, info);

          // Special case: Wrapped ETH/BTC often = Infrastructure or DeFi
          if (/(^WETH$|^WBTC$|^WMON$)/i.test(t.symbol)) {
            category = 'Infrastructure & Tools'; // or 'DeFi Tokens' if in a DEX context
          }

          let imageUrl = info.imageLargeUrl || info.imageSmallUrl || info.imageThumbUrl;
          try {
            const fetched = await fetchTokenImage(t.address);
            if (fetched) imageUrl = fetched;
          } catch (e) {
            console.warn(`Image fail for ${t.address}`);
          }

          const score = calculateTokenScore(mcap, vol, change);

          return {
            id: t.address,
            symbol: t.symbol,
            name: t.name,
            price,
            change24h: change,
            marketCap: mcap,
            volume24h: vol,
            category,
            dominance: 0,
            imageUrl,
            backupImageUrl: info.imageLargeUrl || info.imageSmallUrl,
            pairUrl: `https://www.defined.fi/monad/${t.address}`,
            chainId: 'monad',
            isStable: category === 'Stablecoins',
            score,
          };
        })
    );

    tokens.sort((a, b) => b.score - a.score);
    const totalMcap = tokens.reduce((s, t) => s + t.marketCap, 0);
    return tokens.map(t => ({
      ...t,
      dominance: totalMcap > 0 ? (t.marketCap / totalMcap) * 100 : 0,
    }));
  } catch (e) {
    console.error('Fetch failed:', e);
    return [];
  }
};

// 🔄 Holder fetcher unchanged (placeholder)
export const fetchTokenHolders = async (_: string): Promise<Holder[]> => {
  await new Promise(r => setTimeout(r, 1500));
  // ... (same as before)
  return [];
};
