// components/NadFunTreemap.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
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
                return prevTokens; // Return previous state if duplicate
            }
            // Add new token to the beginning of the list and keep only the latest 50
            return [newToken, ...prevTokens.slice(0, 49)];
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

  // Update treemap layout when tokens or dimensions change
  useEffect(() => {
    if (tokens.length === 0 || dimensions.width <= 0 || dimensions.height <= 0 || !containerRef.current) return;

    const container = d3.select(containerRef.current);
    container.selectAll("*").remove(); // Clear previous SVG

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

    // Create SVG
    const svg = container.append("svg")
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .style("font", "10px sans-serif");

    // Create cells (rectangles) for each token
    const cell = svg.selectAll("g")
      .data(rootNode.leaves())
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

    // For each cell, append a div that will host the TokenTile component
    cell.each(function(d: any) {
      const cellElement = d3.select(this);
      const tileContainer = cellElement.append("foreignObject")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", d.x1 - d.x0)
        .attr("height", d.y1 - d.y0);

      const div = tileContainer.append("xhtml:div")
        .style("width", "100%")
        .style("height", "100%");

      // Render TokenTile into the div using React
      const token = d.data; // The actual token object from the hierarchy
      const tileElement = (
        <TokenTile
          token={token}
          width={d.x1 - d.x0}
          height={d.y1 - d.y0}
          mood={mood}
          onClick={onTileClick}
          dimmed={hoveredId !== null && hoveredId !== token.id && token.id !== selectedId}
          onHover={(isHovering) => setHoveredId(isHovering ? token.id : null)}
        />
      );
      ReactDOM.createRoot(div.node()!).render(tileElement);
    });

  }, [tokens, dimensions, mood, onTileClick, selectedId, hoveredId]); // Add dependencies

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

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
};

export default NadFunTreemap;
