// components/ProtocolTreemap.tsx
import React, { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Protocol, Mood } from '../types';
import { fetchMonadProtocols } from '../services/protocolService';
import { formatCompactNumber } from '../utils';

interface ProtocolTreemapProps {
  mood: Mood;
  onTileClick: (protocol: Protocol) => void;
  selectedId?: string | null;
}

const ProtocolTreemap: React.FC<ProtocolTreemapProps> = ({ mood, onTileClick, selectedId }) => {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('#protocol-treemap-container');
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

  useEffect(() => {
    const loadProtocols = async () => {
      setLoading(true);
      try {
        const fetchedProtocols = await fetchMonadProtocols();
        setProtocols(fetchedProtocols);
      } catch (error) {
        console.error("Error loading protocols:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProtocols();
  }, []);

  // Calculate treemap layout
  const treemapNodes = useMemo(() => {
    if (protocols.length === 0 || dimensions.width <= 0 || dimensions.height <= 0) return [];

    const hierarchyData = {
      name: 'Protocols',
      children: protocols
    };

    const rootNode = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.tvl || 1) // Use TVL for size
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3.treemap()
      .size([dimensions.width, dimensions.height])
      .paddingInner(mood === 'Playful' ? 4 : 1)
      .paddingOuter(mood === 'Playful' ? 4 : 0)
      .round(true);

    treemapLayout(rootNode as any);
    return rootNode.leaves();
  }, [protocols, dimensions, mood]);

  if (loading && protocols.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${mood === 'Playful' ? 'border-indigo-500' : 'border-purple-500'}`}></div>
        <div className="mt-4 opacity-60 font-mono">Scanning Protocols...</div>
      </div>
    );
  }

  if (protocols.length === 0) {
     return (
      <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
        <div className="text-6xl mb-4">🔍</div>
        <div className="text-xl font-bold">No Protocols Found</div>
        <div>DeFi activity will appear here</div>
      </div>
    );
  }

  // Simplified tile component for Protocol
  const ProtocolTile = ({ protocol, width, height, onClick, dimmed, onHover }: { protocol: Protocol, width: number, height: number, onClick: (p: Protocol) => void, dimmed: boolean, onHover: (hovering: boolean) => void }) => {
    const containerStyle = {
      width: `${width}px`,
      height: `${height}px`,
      opacity: dimmed ? 0.3 : 1,
      transition: 'opacity 0.2s ease',
      padding: mood === 'Playful' ? '4px' : '2px',
      boxSizing: 'border-box' as const,
    };

    const cardStyle = {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: mood === 'Playful' ? '8px' : '4px',
      borderRadius: mood === 'Playful' ? '16px' : '2px',
      background: mood === 'Playful' ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)' : 'rgba(30, 41, 59, 0.6)',
      border: mood === 'Playful' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
      backdropFilter: mood === 'Playful' ? 'blur(10px)' : 'blur(4px)',
      cursor: 'pointer',
      overflow: 'hidden',
    };

    const symbolStyle = {
      fontSize: mood === 'Playful' ? '1.2em' : '0.9em',
      fontWeight: 'bold' as const,
      color: mood === 'Playful' ? '#334155' : '#cbd5e1',
      textShadow: mood === 'Playful' ? '0 1px 2px rgba(255,255,255,0.5)' : 'none',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
    };

    const nameStyle = {
      fontSize: mood === 'Playful' ? '0.9em' : '0.75em',
      color: mood === 'Playful' ? '#64748b' : '#94a3b8',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      marginTop: '2px',
    };

    const statsStyle = {
      fontSize: mood === 'Playful' ? '0.75em' : '0.65em',
      color: mood === 'Playful' ? '#94a3b8' : '#64748b',
      marginTop: 'auto',
    };

    const imgStyle = {
      width: mood === 'Playful' ? '24px' : '20px',
      height: mood === 'Playful' ? '24px' : '20px',
      borderRadius: '50%',
      objectFit: 'cover' as const,
      alignSelf: 'flex-end',
      marginBottom: mood === 'Playful' ? '4px' : '2px',
    };

    return (
      <div
        style={containerStyle}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={() => onClick(protocol)}
      >
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {protocol.logo && (
              <img
                src={protocol.logo}
                alt={protocol.name}
                style={imgStyle}
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div style={{ flex: 1, marginLeft: protocol.logo ? '6px' : '0' }}>
              <div style={symbolStyle}>{protocol.name}</div>
              <div style={nameStyle}>{protocol.category}</div>
            </div>
          </div>
          <div style={statsStyle}>
            TVL: ${formatCompactNumber(protocol.tvl)}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div id="protocol-treemap-container" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {treemapNodes.map((node: any) => {
        const protocol = node.data;
        if (!protocol) return null;
        return (
          <div
            key={protocol.id}
            style={{
              position: 'absolute',
              left: node.x0,
              top: node.y0,
              width: node.x1 - node.x0,
              height: node.y1 - node.y0,
              transition: 'all 0.5s ease-out'
            }}
          >
            <ProtocolTile
              protocol={protocol}
              width={node.x1 - node.x0}
              height={node.y1 - node.y0}
              onClick={onTileClick}
              dimmed={hoveredId !== null && hoveredId !== protocol.id && protocol.id !== selectedId}
              onHover={(isHovering) => setHoveredId(isHovering ? protocol.id : null)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ProtocolTreemap;
