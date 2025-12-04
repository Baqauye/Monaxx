// components/NadFunTreemap.tsx (Revised for React compatibility and correct data flow)
import React, { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Token, Mood } from '../types';
import TokenTile from './TokenTile';
import { fetchRecentNadFunTokens, startListeningForNewTokens } from '../services/nadfunService';

interface NadFunTreemapProps {
  mood: Mood;
  onTileClick: (token: Token) => void;
  selectedId?: string | null;
}

const NadFunTreemap: React.FC<NadFunTreemapProps> = ({ mood, onTileClick, selectedId }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 }); // Default size

  // Simulate getting dimensions from parent (App.tsx passes width/height to Treemap)
  // For now, we'll assume a fixed size or get it from a context/prop if passed differently
  // Let's assume App.tsx passes dimensions as props or this component calculates its own
  useEffect(() => {
    const handleResize = () => {
      // If this component has its own container, calculate its size
      // Otherwise, rely on props from parent
      const container = document.querySelector('#nadfun-treemap-container'); // Example ID
      if (container) {
          setDimensions({
              width: container.clientWidth,
              height: container.clientHeight,
          });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch initial tokens and start listening
  useEffect(() => {
    let isCancelled = false;
    let stopListening: (() => void) | null = null;

    const loadInitialTokens = async () => {
      setLoading(true);
      try {
        const initialTokens = await fetchRecentNadFunTokens(50); // Fetch last 50
        if (!isCancelled) {
          setTokens(initialTokens);
        }
      } catch (error) {
        console.error("Error loading initial Nad.fun tokens:", error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    const handleNewToken = (newToken: Token) => {
        setTokens(prevTokens => {
            // Check if token already exists to avoid duplicates
            if (prevTokens.some(t => t.id === newToken.id)) {
                console.warn(`Duplicate token detected: ${newToken.id}, skipping.`);
                return prevTokens; // Return previous state if duplicate
            }
            // Add new token to the beginning of the list and keep only the latest 50
            const updatedTokens = [newToken, ...prevTokens];
            return updatedTokens.slice(0, 50); // Keep only the first 50 (newest)
        });
    };

    loadInitialTokens();

    // Start listening for new tokens
    stopListening = startListeningForNewTokens(handleNewToken);

    return () => {
      isCancelled = true;
      if (stopListening) {
        stopListening();
      }
    };
  }, []);

  // Update treemap layout when tokens or dimensions change using useMemo
  const treemapNodes = useMemo(() => {
    if (tokens.length === 0 || dimensions.width <= 0 || dimensions.height <= 0) {
        console.log("TreemapNodes: No tokens or dimensions, returning empty array.");
        return [];
    }

    console.log(`TreemapNodes: Calculating layout for ${tokens.length} tokens.`);

    const hierarchyData = {
      name: 'NadFunTokens',
      children: tokens
    };

    const rootNode = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.marketCap || 1) // Use marketCap for size, default to 1 if 0 to avoid errors
      .sort((a, b) => (b.value || 0) - (a.value || 0)); // Sort by value descending

    const treemapLayout = d3.treemap()
      .size([dimensions.width, dimensions.height])
      .paddingInner(mood === 'Playful' ? 4 : 1)
      .paddingOuter(mood === 'Playful' ? 4 : 0)
      .round(true);

    treemapLayout(rootNode as any);
    const leaves = rootNode.leaves();
    console.log(`TreemapNodes: Calculated ${leaves.length} leaves.`);
    return leaves;
  }, [tokens, dimensions, mood]); // Add dependencies

  if (loading && tokens.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${mood === 'Playful' ? 'border-indigo-500' : 'border-purple-500'}`}></div>
        <div className="mt-4 opacity-60 font-mono">Scanning Nad.fun...</div>
      </div>
    );
  }

  if (tokens.length === 0) {
     return (
      <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
        <div className="text-6xl mb-4">🔍</div>
        <div className="text-xl font-bold">No Nad.fun Tokens Found</div>
        <div>Live creations will appear here</div>
      </div>
    );
  }

  console.log(`NadFunTreemap: Rendering ${treemapNodes.length} nodes.`);

  return (
    <div id="nadfun-treemap-container" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {treemapNodes.map((node: any) => {
        const token = node.data; // The actual token object
        if (!token) {
            console.warn("Treemap node data is null or undefined:", node);
            return null; // Skip rendering this node if data is invalid
        }
        return (
          <div
            key={token.id} // Use token.id as key
            style={{
              position: 'absolute',
              left: node.x0,
              top: node.y0,
              width: node.x1 - node.x0,
              height: node.y1 - node.y0,
              transition: 'all 0.5s ease-out' // Smooth transitions
            }}
          >
            <TokenTile
              token={token}
              width={node.x1 - node.x0}
              height={node.y1 - node.y0}
              mood={mood}
              onClick={onTileClick}
              dimmed={hoveredId !== null && hoveredId !== token.id && token.id !== selectedId}
              onHover={(isHovering) => setHoveredId(isHovering ? token.id : null)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default NadFunTreemap;
