// services/protocolService.ts
import { Protocol } from '../types';

const BLOCKVISION_API_KEY = '36RJSlyM5vIL2R1kKugyMU1NZeT';
const BLOCKVISION_BASE_URL = 'https://api.blockvision.org/v2/monad';

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

export const fetchMonadProtocols = async (): Promise<Protocol[]> => {
  // Example address known to interact with multiple protocols
  const exampleAddress = '0xDC7C03CCEE6B098eE22b5d522ebBd78De6aFA7B7';

  try {
    const response = await callBlockVisionAPI('/account/defiPortfolio', { address: exampleAddress });
    if (response.code !== 0) {
        console.error("BlockVision API Error (Account DeFi):", response.reason);
        return [];
    }

    const protocolDataList = response.result || [];
    const protocols: Protocol[] = [];

    for (const protoData of protocolDataList) {
        let tvlEstimate = 0;

        if (protoData.items) {
            for (const item of protoData.items) {
                if (item.type === 'liquidity_pool' && item.data) {
                    if (item.data.balance0) tvlEstimate += parseFloat(item.data.balance0) || 0;
                    if (item.data.balance1) tvlEstimate += parseFloat(item.data.balance1) || 0;
                }
                if (item.type === 'deposits' && Array.isArray(item.data)) {
                    for (const deposit of item.data) {
                        tvlEstimate += parseFloat(deposit.balance) || 0;
                    }
                }
                if (item.type === 'debts' && Array.isArray(item.data)) {
                     for (const debt of item.data) {
                        tvlEstimate += parseFloat(debt.balance) || 0;
                    }
                }
            }
        }

        const nameLower = protoData.name.toLowerCase();
        let category = 'Other';
        if (nameLower.includes('dex') || nameLower.includes('swap')) category = 'Dex';
        if (nameLower.includes('lend') || nameLower.includes('borrow') || nameLower.includes('compound') || nameLower.includes('aave')) category = 'Lending';
        if (nameLower.includes('yield') || nameLower.includes('farm') || nameLower.includes('curve') || nameLower.includes('balancer')) category = 'Yield';

        protocols.push({
            id: protoData.name.toLowerCase().replace(/\s+/g, '-'),
            name: protoData.name,
            logo: protoData.logo,
            website: protoData.website,
            tvl: tvlEstimate,
            tvlChange24h: undefined,
            volume24h: undefined,
            volumeChange24h: undefined,
            fees24h: undefined,
            category: category,
            activity: '24h',
            dominance: 0,
            chainId: 'monad',
        });
    }

    const totalTvl = protocols.reduce((sum, p) => sum + p.tvl, 0);

    return protocols.map(p => ({
        ...p,
        dominance: totalTvl > 0 ? (p.tvl / totalTvl) * 100 : 0
    }));

  } catch (error) {
    console.error("Failed to fetch Monad protocols via BlockVision:", error);
    return [];
  }
};
