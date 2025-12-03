import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { Token, Mood } from '../types';
import TokenTile from './TokenTile';

interface TreemapProps {
  data: Token[];
  width: number;
  height: number;
  mood: Mood;
  onTileClick: (token: Token) => void;
}

const Treemap: React.FC<TreemapProps> = ({ data, width, height, mood, onTileClick }) => {
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

  if (!root) return <div>No Data</div>;

  return (
    <div style={{ width, height, position: 'relative' }}>
      {root.leaves().map((leaf: any) => (
        <div
          key={leaf.data.id}
          style={{
            position: 'absolute',
            left: leaf.x0,
            top: leaf.y0,
            width: leaf.x1 - leaf.x0,
            height: leaf.y1 - leaf.y0,
          }}
        >
          <TokenTile
            token={leaf.data}
            width={leaf.x1 - leaf.x0}
            height={leaf.y1 - leaf.y0}
            mood={mood}
            onClick={onTileClick}
          />
        </div>
      ))}
    </div>
  );
};

export default Treemap;
