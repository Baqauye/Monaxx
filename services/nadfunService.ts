// services/nadfunService.ts
import { Token } from '../types'; // Use the existing Token interface
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
const MONAD_RPC_URL = 'https://rpc1.monad.xyz'; // Or another reliable one from your list

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;
let eventListenersSet = false; // Flag to prevent duplicate listeners

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
export const startListeningForNewTokens = (onNewToken: (token: Token) => void): (() => void) => {
  const { contract } = initializeProviderAndContract();

  if (eventListenersSet) {
    console.warn("Event listeners for Nad.fun tokens are already set. Skipping duplicate setup.");
    // Return a dummy stop function if already set, or implement a way to manage multiple listeners
    return () => {};
  }

  const listener = async (creator: string, tokenAddress: string, pool: string, name: string, symbol: string, tokenURI: string, vMonReserve: bigint, vTokenReserve: bigint, targetAmount: bigint) => {
    console.log(`New Nad.fun token created: ${name} (${symbol}) at ${tokenAddress}`);
    // Create a minimal Token object based on the event data
    // Prices, volume, market cap are initially unknown or zero
    const newToken: Token = {
      id: tokenAddress,
      name: name,
      symbol: symbol,
      price: 0, // Initial price is unknown
      change24h: 0, // No change yet
      marketCap: 0, // No market cap initially
      volume24h: 0, // No volume initially
      category: 'NadFun', // Specific category for Nad.fun tokens
      dominance: 0, // Will be calculated later
      imageUrl: '', // Will attempt to fetch from tokenURI
      backupImageUrl: undefined,
      pairUrl: `https://nad.fun/token/${tokenAddress}`, // Example link
      chainId: 'monad', // Assuming Monad
      isStable: false, // Nad.fun tokens are not stablecoins
    };

    // Attempt to fetch image URL from tokenURI if possible (often it's a JSON file)
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
             // Fallback to a standard Nad.fun icon if metadata fails
             // newToken.imageUrl = 'https://your-domain.com/path-to-nadfun-icon.png';
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
export const fetchRecentNadFunTokens = async (limit: number = 50): Promise<Token[]> => {
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

    const tokens: Token[] = [];
    for (const log of logs.slice(-limit)) { // Take the last 'limit' logs
      const parsedLog = iface.parseLog(log);
      if (parsedLog) {
        const args = parsedLog.args;
        const token: Token = {
          id: args.token,
          name: args.name,
          symbol: args.symbol,
          price: 0,
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
        tokens.push(token);
      }
    }
    // Sort by a hypothetical timestamp or block number descending (newest first)
    // For now, logs are already recent based on the query, so we can return as is.
    // A more complex sort might be needed if integrating live updates.
    return tokens;
  } catch (error) {
    console.error("Failed to fetch recent Nad.fun token logs:", error);
    return [];
  }
};
