// services/protocolService.ts
import { Protocol } from '../types';
import blockvision from '@api/blockvision';

const BLOCKVISION_API_KEY = '36RJSlyM5vIL2R1kKugyMU1NZeT';
const blockvisionClient = blockvision.initialize({ apiKey: BLOCKVISION_API_KEY });

export const fetchMonadProtocols = async (): Promise<Protocol[]> => {
  // Example address known to interact with multiple protocols (like a DeFi user or a multi-protocol vault)
  const exampleAddress = '0xDC7C03CCEE6B098eE22b5d522ebBd78De6aFA7B7'; // From BlockVision docs example

  try {
    const response = await blockvisionClient.get_monadaccountdefiPortfolio({ address: exampleAddress });
    if (response.code !== 0) {
        console.error("BlockVision API Error (Account DeFi):", response.reason);
        return [];
    }

    const protocolDataList = response.result || [];
    const protocols: Protocol[] = [];

    for (const protoData of protocolDataList) {
        // Calculate a simple metric for ranking/sizing, e.g., total value in deposits and debts
        let tvlEstimate = 0;
        let volume24hEstimate = 0; // Placeholder, BlockVision API doesn't directly give protocol volume like this

        if (protoData.items) {
            for (const item of protoData.items) {
                if (item.type === 'liquidity_pool' && item.data) {
                    // Sum balances for LP tokens if available
                    if (item.data.balance0) tvlEstimate += parseFloat(item.data.balance0) || 0;
                    if (item.data.balance1) tvlEstimate += parseFloat(item.data.balance1) || 0;
                }
                if (item.type === 'deposits' && Array.isArray(item.data)) {
                    for (const deposit of item.data) {
                        // Estimate value based on balance if price is available elsewhere, here we just sum balances
                        // A real implementation would multiply balance by token price
                        tvlEstimate += parseFloat(deposit.balance) || 0;
                    }
                }
                if (item.type === 'debts' && Array.isArray(item.data)) {
                     for (const debt of item.data) {
                        tvlEstimate += parseFloat(debt.balance) || 0; // Debt also contributes to protocol activity/size
                    }
                }
                // Add more types if needed (lending, borrowing, etc.)
            }
        }

        // Simplified category guessing based on name
        const nameLower = protoData.name.toLowerCase();
        let category = 'Other';
        if (nameLower.includes('dex') || nameLower.includes('swap')) category = 'Dex';
        if (nameLower.includes('lend') || nameLower.includes('borrow') || nameLower.includes('compound') || nameLower.includes('aave')) category = 'Lending';
        if (nameLower.includes('yield') || nameLower.includes('farm') || nameLower.includes('curve') || nameLower.includes('balancer')) category = 'Yield';

        protocols.push({
            id: protoData.name.toLowerCase().replace(/\s+/g, '-'), // Generate a simple ID
            name: protoData.name,
            logo: protoData.logo,
            website: protoData.website,
            tvl: tvlEstimate, // Placeholder calculation
            tvlChange24h: undefined, // Not available directly from this endpoint easily
            volume24h: volume24hEstimate, // Placeholder
            volumeChange24h: undefined, // Not available
            fees24h: undefined, // Not available
            category: category,
            activity: '24h', // Default activity indicator, could be based on latest interaction or data freshness
            dominance: 0, // Will calculate later
            chainId: 'monad',
        });
    }

    // Calculate total TVL for dominance
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
