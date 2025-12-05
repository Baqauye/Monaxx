// services/nadfunService.ts
import { Token } from '../types';
import { ethers } from 'ethers';
import blockvision from '@api/blockvision';

// --- Configuration ---
const BONDING_CURVE_ROUTER_ADDRESS = '0x6F6B8F1a20703309951a5127c45B49b1CD981A22';
const LENS_ADDRESS = '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea'; // Use Lens for queries
const BONDING_CURVE_ROUTER_ABI = [
  {
    "type": "event",
    "name": "CurveCreate",
    "inputs": [
      { "name": "creator", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "token", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "pool", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "name", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "symbol", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "tokenURI", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "virtualMonReserve", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "virtualTokenReserve", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "targetTokenAmount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
];
// ABI for Lens (simplified for getAmountOut)
const LENS_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_token", "type": "address" },
      { "internalType": "uint256", "name": "_amountIn", "type": "uint256" },
      { "internalType": "bool", "name": "_isBuy", "type": "bool" }
    ],
    "name": "getAmountOut",
    "outputs": [
      { "internalType": "address", "name": "router", "type": "address" },
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const MONAD_RPC_URL = 'https://rpc1.monad.xyz';
const BLOCKVISION_API_KEY = '36RJSlyM5vIL2R1kKugyMU1NZeT';

const blockvisionClient = blockvision.initialize({ apiKey: BLOCKVISION_API_KEY });

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;
let lensContract: ethers.Contract | null = null;
let eventListenersSet = false;

const initializeProviderAndContract = () => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
  }
  if (!contract) {
    contract = new ethers.Contract(BONDING_CURVE_ROUTER_ADDRESS, BONDING_CURVE_ROUTER_ABI, provider);
  }
  if (!lensContract) {
      lensContract = new ethers.Contract(LENS_ADDRESS, LENS_ABI, provider);
  }
  return { provider, contract, lensContract };
};

// Function to estimate price using Lens contract
const estimatePriceFromLens = async (tokenAddress: string): Promise<number> => {
    try {
        const { lensContract } = initializeProviderAndContract();
        // Query Lens for the amount of MON received for 1 token (selling 1 token)
        // This gives us the inverse price (MON per token). We need MON per token, so we use 1 MON as input.
        const amountIn = ethers.parseEther("1"); // 1 MON
        const isBuy = true; // We want to know how many tokens we get for 1 MON (buying)
        const [router, amountOut] = await lensContract.getAmountOut(tokenAddress, amountIn, isBuy);
        const pricePerToken = Number(amountOut) / 1e18; // Assuming MON has 18 decimals
        console.log(`Estimated price for ${tokenAddress} using Lens: ${pricePerToken} MON`);
        return pricePerToken;
    } catch (err) {
        console.warn(`Could not estimate price for ${tokenAddress} using Lens:`, err);
        return 0; // Return 0 if estimation fails
    }
};

export const startListeningForNewTokens = (onNewToken: (token: Token) => void): (() => void) => {
  const { contract } = initializeProviderAndContract();

  if (eventListenersSet) {
    console.warn("Event listeners for Nad.fun tokens are already set. Skipping duplicate setup.");
    return () => {};
  }

  const listener = async (creator: string, tokenAddress: string, pool: string, name: string, symbol: string, tokenURI: string, vMonReserve: bigint, vTokenReserve: bigint, targetAmount: bigint) => {
    console.log(`New Nad.fun token created: ${name} (${symbol}) at ${tokenAddress}`);

    // Estimate initial price using Lens
    const estimatedMonPrice = await estimatePriceFromLens(tokenAddress);

    // Create a minimal Token object based on the event data and estimated price
    const newToken: Token = {
      id: tokenAddress,
      name: name,
      symbol: symbol,
      price: estimatedMonPrice, // Use estimated price initially
      change24h: 0,
      marketCap: 0, // Needs trading volume to calculate accurately
      volume24h: 0,
      category: 'NadFun',
      dominance: 0,
      imageUrl: '', // Attempt to fetch from tokenURI
      backupImageUrl: undefined,
      pairUrl: `https://nad.fun/token/${tokenAddress}`,
      chainId: 'monad',
      isStable: false,
    };

    if (tokenURI && tokenURI.startsWith('http')) {
        try {
            const metadataResponse = await fetch(tokenURI);
            if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                if (metadata.image) {
                    newToken.imageUrl = metadata.image.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/');
                }
            }
        } catch (error) {
             console.warn(`Could not fetch metadata for ${tokenAddress} from ${tokenURI}`, error);
        }
    }

    // Fetch market data from BlockVision API for more accurate info if available
    try {
        const marketResponse = await blockvisionClient.get_monadtokenmarketdata({ token: tokenAddress });
        if (marketResponse.code === 0 && marketResponse.result) {
             const marketData = marketResponse.result;
             newToken.price = parseFloat(marketData.priceInUsd || newToken.price.toString());
             newToken.change24h = parseFloat(marketData.market?.hour24?.priceChange || '0');
             newToken.marketCap = parseFloat(marketData.marketCap || '0');
             newToken.volume24h = parseFloat(marketData.volume24H || '0');
             newToken.fdv = parseFloat(marketData.fdvInUsd || '0');
             newToken.liquidity = parseFloat(marketData.liquidityInUsd || '0');
        }
    } catch (bvError) {
         console.warn(`Could not fetch BlockVision data for new token ${tokenAddress}:`, bvError);
         // Keep the estimated data or default values
    }

    // Fetch token details from BlockVision API
    try {
        const detailResponse = await blockvisionClient.retrieveTokenDetail({ address: tokenAddress });
        if (detailResponse.code === 0 && detailResponse.result) {
             const detailData = detailResponse.result;
             // Update name/symbol if they differ (BlockVision might have canonical names)
             newToken.name = detailData.name || newToken.name;
             newToken.symbol = detailData.symbol || newToken.symbol;
             newToken.imageUrl = detailData.logo || newToken.imageUrl;
             newToken.holders = detailData.holders || newToken.holders;
             newToken.totalSupply = detailData.totalSupply || newToken.totalSupply;
        }
    } catch (bvDetailError) {
         console.warn(`Could not fetch BlockVision details for new token ${tokenAddress}:`, bvDetailError);
         // Keep the initial data
    }

    onNewToken(newToken);
  };

  contract.on('CurveCreate', listener);
  eventListenersSet = true;

  console.log("Started listening for new Nad.fun tokens...");
  return () => {
    if (contract) {
      contract.off('CurveCreate', listener);
      console.log("Stopped listening for new Nad.fun tokens.");
      eventListenersSet = false;
    }
  };
};

export const fetchRecentNadFunTokens = async (limit: number = 50): Promise<Token[]> => {
  const { provider } = initializeProviderAndContract();
  const iface = new ethers.Interface(BONDING_CURVE_ROUTER_ABI);
  const filter = iface.encodeFilterTopics('CurveCreate', []);

  try {
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 10000);

    const logs = await provider.getLogs({
      address: BONDING_CURVE_ROUTER_ADDRESS,
      topics: filter,
      fromBlock: fromBlock,
      toBlock: 'latest',
    });

    const tokens: Token[] = [];
    for (const log of logs.slice(-limit)) {
      const parsedLog = iface.parseLog(log);
      if (parsedLog) {
        const args = parsedLog.args;
        // Create initial token object
        const token: Token = {
          id: args.token,
          name: args.name,
          symbol: args.symbol,
          price: 0, // Will fetch from API
          change24h: 0,
          marketCap: 0,
          volume24h: 0,
          category: 'NadFun',
          dominance: 0,
          imageUrl: '',
          backupImageUrl: undefined,
          pairUrl: `https://nad.fun/token/${args.token}`,
          chainId: 'monad',
          isStable: false,
        };

        if (args.tokenURI && args.tokenURI.startsWith('http')) {
            try {
                const metadataResponse = await fetch(args.tokenURI);
                if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    if (metadata.image) {
                        token.imageUrl = metadata.image.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/');
                    }
                }
            } catch (error) {
                 console.warn(`Could not fetch metadata for ${token.id} from ${args.tokenURI}`, error);
            }
        }

        // Fetch market and detail data from BlockVision
        try {
            const marketResponse = await blockvisionClient.get_monadtokenmarketdata({ token: token.id });
            if (marketResponse.code === 0 && marketResponse.result) {
                 const marketData = marketResponse.result;
                 token.price = parseFloat(marketData.priceInUsd || '0');
                 token.change24h = parseFloat(marketData.market?.hour24?.priceChange || '0');
                 token.marketCap = parseFloat(marketData.marketCap || '0');
                 token.volume24h = parseFloat(marketData.volume24H || '0');
                 token.fdv = parseFloat(marketData.fdvInUsd || '0');
                 token.liquidity = parseFloat(marketData.liquidityInUsd || '0');
            }
        } catch (bvError) {
             console.warn(`Could not fetch BlockVision market data for ${token.id}:`, bvError);
        }

        try {
            const detailResponse = await blockvisionClient.retrieveTokenDetail({ address: token.id });
            if (detailResponse.code === 0 && detailResponse.result) {
                 const detailData = detailResponse.result;
                 token.name = detailData.name || token.name;
                 token.symbol = detailData.symbol || token.symbol;
                 token.imageUrl = detailData.logo || token.imageUrl;
                 token.holders = detailData.holders || token.holders;
                 token.totalSupply = detailData.totalSupply || token.totalSupply;
            }
        } catch (bvDetailError) {
             console.warn(`Could not fetch BlockVision detail data for ${token.id}:`, bvDetailError);
        }

        tokens.push(token);
      }
    }
    return tokens;
  } catch (error) {
    console.error("Failed to fetch recent Nad.fun token logs:", error);
    return [];
  }
};
