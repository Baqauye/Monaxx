// components/NadFunTimeline.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { NadFunToken, Mood } from '../types';
import { startListeningForNewTokens, fetchRecentNadFunTokens } from '../services/nadfunService';
import { formatCompactNumber } from '../utils';

interface NadFunTimelineProps {
  mood: Mood;
}

const NadFunTimeline: React.FC<NadFunTimelineProps> = ({ mood }) => {
  const [tokens, setTokens] = useState<NadFunToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stopListening, setStopListening] = useState<(() => void) | null>(null);

  const handleNewToken = useCallback((newToken: NadFunToken) => {
    setTokens(prevTokens => [newToken, ...prevTokens.slice(0, 49)]); // Keep only the latest 50
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadInitialTokens = async () => {
      setIsLoading(true);
      try {
        const recentTokens = await fetchRecentNadFunTokens(50); // Fetch last 50
        if (!isCancelled) {
          setTokens(recentTokens);
        }
      } catch (error) {
        console.error("Error loading initial Nad.fun tokens:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadInitialTokens();

    // Start listening for new tokens
    const stopFn = startListeningForNewTokens(handleNewToken);
    setStopListening(stopFn);

    // Cleanup function
    return () => {
      isCancelled = true;
      if (stopFn) {
        stopFn();
      }
    };
  }, [handleNewToken]);

  const containerClass = mood === 'Playful'
    ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100'
    : 'bg-slate-900/80 border border-slate-700';

  const headerClass = mood === 'Playful'
    ? 'text-slate-800 font-display'
    : 'text-slate-100 font-mono';

  const tokenItemClass = mood === 'Playful'
    ? 'bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-indigo-100'
    : 'bg-slate-800/60 rounded-none p-4 border border-slate-700 hover:bg-slate-800 transition-colors';

  const symbolClass = mood === 'Playful'
    ? 'font-bold text-indigo-600'
    : 'font-mono text-purple-400';

  const nameClass = mood === 'Playful'
    ? 'text-slate-600'
    : 'text-slate-300';

  if (isLoading && tokens.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${mood === 'Playful' ? 'border-indigo-500' : 'border-purple-500'}`}></div>
        <div className="mt-4 opacity-60 font-mono">Listening for New Creations...</div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full overflow-y-auto p-4 ${containerClass} rounded-2xl`}>
      <h2 className={`text-xl font-bold mb-4 ${headerClass}`}>Nad.fun Live Token Creation</h2>
      {tokens.length === 0 ? (
        <p className="opacity-50">No recent token creations detected.</p>
      ) : (
        <ul className="space-y-3">
          {tokens.map((token) => (
            <li key={token.id} className={tokenItemClass}>
              <div className="flex items-start gap-3">
                {token.imageUrl ? (
                  <img
                    src={token.imageUrl}
                    alt={token.name}
                    className={`w-12 h-12 object-cover rounded-lg ${mood === 'Playful' ? 'shadow-sm' : 'border border-slate-600'}`}
                    onError={(e) => {
                         e.currentTarget.onerror = null; // Prevent infinite loop if fallback also fails
                         e.currentTarget.src = 'https://placehold.co/48x48?text=? '; // Fallback image
                     }}
                  />
                ) : (
                   <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                       <span className="text-xs text-gray-500 dark:text-slate-400">?</span>
                   </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={symbolClass}>{token.symbol}</span>
                    <span className={`text-xs opacity-60 ${mood === 'Professional' ? 'font-mono' : ''}`}>
                      {new Date(token.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className={`truncate font-medium ${nameClass}`}>{token.name}</h3>
                  <p className="text-xs opacity-50 mt-1 truncate">by {token.creator.substring(0, 6)}...{token.creator.substring(token.creator.length - 4)}</p>
                  {/* Optional: Show initial bonding curve parameters */}
                  {/* <p className="text-xs opacity-40 mt-1">
                    Target: {formatCompactNumber(token.targetTokenAmount)} {token.symbol}
                  </p> */}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 text-xs opacity-40 flex justify-end">
         {stopListening ? '🟢 Live' : '🔴 Offline'}
      </div>
    </div>
  );
};

export default NadFunTimeline;
