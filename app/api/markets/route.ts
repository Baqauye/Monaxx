import { NextRequest, NextResponse } from 'next/server';
import { classifyToken } from '@/lib/classify';
import { CHAINS } from '@/lib/config';
import { ChainKey, TokenMarket } from '@/lib/types';

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
}

/**
 * Proxies CoinGecko market data and normalizes it for frontend rendering.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const chain = (request.nextUrl.searchParams.get('chain') ?? 'ethereum') as ChainKey;
  const chainConfig = CHAINS.find((item) => item.key === chain) ?? CHAINS[0];
  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: '100',
    page: '1',
    sparkline: 'false'
  });

  if (chainConfig.coingeckoCategory) {
    params.set('category', chainConfig.coingeckoCategory);
  }

  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Unable to load live market data.' }, { status: 502 });
    }

    const payload = (await response.json()) as CoinGeckoMarket[];
    const tokens: TokenMarket[] = payload
      .filter((token) => token.market_cap > 0)
      .map((token) => ({
        ...token,
        contract_address: token.id,
        category: classifyToken(token.name, token.symbol)
      }));

    return NextResponse.json({ tokens, chain: chainConfig });
  } catch {
    return NextResponse.json({ error: 'Network error while requesting CoinGecko.' }, { status: 500 });
  }
}
