import React, { useMemo, useState } from 'react';
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

  const root = useMemo(() => {
    if (data.length === 0) return null;

    // Create a hierarchy for D3
    const hierarchyData = {
      name: 'Market',
      children: data
    };

    const rootNode = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.marketCap) // Size based on Market Cap
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemapLayout = d3.treemap()
      .size([width, height])
      .paddingInner(mood === 'Playful' ? 4 : 1)
      .paddingOuter(mood === 'Playful' ? 4 : 0)
      .round(true);

    treemapLayout(rootNode as any);
    return rootNode;
  }, [data, width, height, mood]);

  // Calculate zoom transform
  const transformStyle = useMemo(() => {
    if (!selectedId || !root) return { transform: 'translate(0px, 0px) scale(1)' };

    // Find the selected leaf node
    const selectedNode = root.leaves().find((n: any) => n.data.id === selectedId);
    
    // If not found in current view (e.g. filtered out), don't zoom
    if (!selectedNode) return { transform: 'translate(0px, 0px) scale(1)' };

    // Calculate center of the selected node
    const x = (selectedNode.x0 + selectedNode.x1) / 2;
    const y = (selectedNode.y0 + selectedNode.y1) / 2;
    
    // Zoom scale - 3x is usually a good balance
    const scale = 3; 
    
    // Calculate translation to bring the node center to the screen center
    const translateX = width / 2 - x * scale;
    const translateY = height / 2 - y * scale;

    return {
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`
    };

  }, [selectedId, root, width, height]);


  if (!root) return <div>No Data</div>;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transition: 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform',
          ...transformStyle
        }}
      >
        {root.leaves().map((leaf: any) => (
          <div
            key={leaf.data.id}
            style={{
              position: 'absolute',
              left: leaf.x0,
              top: leaf.y0,
              width: leaf.x1 - leaf.x0,
              height: leaf.y1 - leaf.y0,
              transition: 'all 0.5s ease-out'
            }}
          >
            <TokenTile
              token={leaf.data}
              width={leaf.x1 - leaf.x0}
              height={leaf.y1 - leaf.y0}
              mood={mood}
              onClick={onTileClick}
              dimmed={hoveredId !== null && hoveredId !== leaf.data.id && leaf.data.id !== selectedId}
              onHover={(isHovering) => setHoveredId(isHovering ? leaf.data.id : null)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Treemap;