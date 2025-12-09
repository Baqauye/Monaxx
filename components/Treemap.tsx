// components/Treemap.tsx
import React, { useMemo, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { Token, Mood } from '../types';
import TokenTile from './TokenTile';

interface TreemapProps {
  data: Token[];
  width: number;
  height: number;
  mood: Mood;
  selectedId?: string | null;
  onTileClick: (token: Token) => void;
}

const Treemap: React.FC<TreemapProps> = ({ data, width, height, mood, selectedId, onTileClick }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [treemapNodes, setTreemapNodes] = useState<any[]>([]); // Store layout data

  // Calculate treemap layout when data or dimensions change
  useEffect(() => {
    if (data.length === 0 || width <= 0 || height <= 0) {
      setTreemapNodes([]);
      return;
    }

    const hierarchyData = {
      name: 'Market',
      children: data,
    };

    const rootNode = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.marketCap) // Use marketCap for size
      .sort((a, b) => (b.value || 0) - (a.value || 0)); // Sort by value descending

    const treemapLayout = d3.treemap()
      .size([width, height])
      .paddingInner(mood === 'Playful' ? 4 : 1) // Inner padding
      .paddingOuter(mood === 'Playful' ? 4 : 0) // Outer padding
      .round(true); // Round coordinates for pixel alignment

    treemapLayout(rootNode);

    // Extract leaf nodes (the actual tokens) with their calculated positions
    setTreemapNodes(rootNode.leaves());
  }, [data, width, height, mood]); // Re-run when data, width, height, or mood changes

  if (treemapNodes.length === 0) {
    return <div>No data to display</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {treemapNodes.map((node: any) => {
        const token = node.data; // The actual token object from the hierarchy
        if (!token) return null; // Skip if data is invalid

        return (
          <div
            key={token.id}
            style={{
              position: 'absolute',
              left: node.x0, // Calculated x position from D3 layout
              top: node.y0, // Calculated y position from D3 layout
              width: node.x1 - node.x0, // Calculated width from D3 layout
              height: node.y1 - node.y0, // Calculated height from D3 layout
              transition: 'all 0.5s ease-out', // Smooth transitions on layout changes
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

export default Treemap;
