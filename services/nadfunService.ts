// services/nadfunService.ts
import { NadFunToken } from '../types';
import { ethers } from 'ethers'; // Make sure ethers is installed: npm install ethers

// --- Configuration ---
// Nad.fun Contract Addresses (using Mainnet as per your document)
const BONDING_CURVE_ROUTER_ADDRESS = '0x6F6B8F1a20703309951a5127c45B49b1CD981A22';
// ABI snippets for the BondingCurveRouter (just the CurveCreate event)
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

// RPC URL for Monad Mainnet
const MONAD_RPC_URL = 'https://rpc1.monad.xyz '; // Or another reliable one from your list

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;
let eventListenersSet = false;

// Initialize provider and contract
const initializeProviderAndContract = (): { provider: ethers.JsonRpcProvider, contract: ethers.Contract } => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
  }
  if (!contract) {
    contract = new ethers.Contract(BONDING_CURVE_ROUTER_ADDRESS, BONDING_CURVE_ROUTER_ABI, provider);
  }
  return { provider, contract };
};

/**
 * Starts listening for new Nad.fun token creations.
 * @param onNewToken Callback function called when a new token is detected.
 * @returns Function to stop listening.
 */
export const startListeningForNewTokens = (onNewToken: (token: NadFunToken) => void): (() => void) => {
  const { contract } = initializeProviderAndContract();

  if (eventListenersSet) {
    console.warn("Event listeners for Nad.fun tokens are already set. Skipping duplicate setup.");
    // Return a dummy stop function if already set, or implement a way to manage multiple listeners
    return () => {};
  }

  const listener = async (creator: string, tokenAddress: string, pool: string, name: string, symbol: string, tokenURI: string, vMonReserve: bigint, vTokenReserve: bigint, targetAmount: bigint) => {
    console.log(`New Nad.fun token created: ${name} (${symbol}) at ${tokenAddress}`);
    const newToken: NadFunToken = {
      id: tokenAddress,
      name: name,
      symbol: symbol,
      tokenURI: tokenURI,
      creator: creator,
      pool: pool,
      virtualMonReserve: Number(vMonReserve),
      virtualTokenReserve: Number(vTokenReserve),
      targetTokenAmount: Number(targetAmount),
      timestamp: Date.now(), // Approximate timestamp when detected by our listener
      imageUrl: '', // Will attempt to fetch from tokenURI
      // These will be populated later as the token trades
      price: 0,
      change24h: 0,
      marketCap: 0,
      volume24h: 0,
      category: 'NadFun', // Specific category for Nad.fun tokens
      dominance: 0,
      isStable: false,
      score: 0 // Score will be calculated upon receiving trading data updates
    };

    // Attempt to fetch image URL from tokenURI if possible (often it's a JSON file)
    if (tokenURI && tokenURI.startsWith('http')) {
        try {
            const metadataResponse = await fetch(tokenURI);
            if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                if (metadata.image) {
                    newToken.imageUrl = metadata.image.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/ ');
                }
            }
        } catch (error) {
             console.warn(`Could not fetch metadata for ${tokenAddress} from ${tokenURI}`, error);
             // Fallback to a standard Nad.fun icon if metadata fails
             // newToken.imageUrl = 'https://your-domain.com/path-to-nadfun-icon.png ';
        }
    }

    onNewToken(newToken);
  };

  // Attach the listener to the contract
  contract.on('CurveCreate', listener);
  eventListenersSet = true;

  console.log("Started listening for new Nad.fun tokens...");
  // Return the function to remove the listener
  return () => {
    if (contract) {
      contract.off('CurveCreate', listener);
      console.log("Stopped listening for new Nad.fun tokens.");
      eventListenersSet = false; // Reset flag
    }
  };
};

/**
 * Fetches recent Nad.fun token creations using logs (can be used for initial load or backup).
 * This might require paginated calls depending on the number of logs.
 */
export const fetchRecentNadFunTokens = async (limit: number = 50): Promise<NadFunToken[]> => {
  const { provider } = initializeProviderAndContract();
  const iface = new ethers.Interface(BONDING_CURVE_ROUTER_ABI);
  const filter = iface.encodeFilterTopics('CurveCreate', []);

  try {
    // Get logs from the last few thousand blocks as an example
    // You might need a more sophisticated strategy for a large number of events
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 10000); // Adjust range as needed

    const logs = await provider.getLogs({
      address: BONDING_CURVE_ROUTER_ADDRESS,
      topics: filter,
      fromBlock: fromBlock,
      toBlock: 'latest',
    });

    const tokens: NadFunToken[] = [];
    for (const log of logs.slice(-limit)) { // Take the last 'limit' logs
      const parsedLog = iface.parseLog(log);
      if (parsedLog) {
        const args = parsedLog.args;
        const token: NadFunToken = {
          id: args.token,
          name: args.name,
          symbol: args.symbol,
          tokenURI: args.tokenURI,
          creator: args.creator,
          pool: args.pool,
          virtualMonReserve: Number(args.virtualMonReserve),
          virtualTokenReserve: Number(args.virtualTokenReserve),
          targetTokenAmount: Number(args.targetTokenAmount),
          timestamp: Date.now(), // Approximate for logs fetched now
          imageUrl: '',
          price: 0,
          change24h: 0,
          marketCap: 0,
          volume24h: 0,
          category: 'NadFun',
          dominance: 0,
          isStable: false,
          score: 0
        };
         if (token.tokenURI && token.tokenURI.startsWith('http')) {
            try {
                const metadataResponse = await fetch(token.tokenURI);
                if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    if (metadata.image) {
                        token.imageUrl = metadata.image.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/ ');
                    }
                }
            } catch (error) {
                 console.warn(`Could not fetch metadata for ${token.id} from ${token.tokenURI}`, error);
            }
        }
        tokens.push(token);
      }
    }
    // Sort by timestamp descending (newest first)
    tokens.sort((a, b) => b.timestamp - a.timestamp);
    return tokens;
  } catch (error) {
    console.error("Failed to fetch recent Nad.fun token logs:", error);
    return [];
  }
};
