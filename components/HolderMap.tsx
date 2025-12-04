import React, { useEffect, useRef, useState } from ‘react’;
import * as d3 from ‘d3’;
import { Holder, Mood } from ‘../types’;
import { fetchTokenHolders } from ‘../services/monadService’;

interface HolderMapProps {
tokenAddress: string;
width: number;
height: number;
mood: Mood;
}

interface SimulationNode extends d3.SimulationNodeDatum {
address: string;
balance: number;
percentage: number;
isContract: boolean;
label?: string;
connections?: string[];
r: number;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
source: SimulationNode;
target: SimulationNode;
}

const HolderMap: React.FC<HolderMapProps> = ({ tokenAddress, width, height, mood }) => {
const svgRef = useRef<SVGSVGElement>(null);
const [data, setData] = useState<Holder[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
if (!tokenAddress) return;

```
const loadData = async () => {
  setLoading(true);
  setError(null);
  setData([]);
  
  try {
    const holders = await fetchTokenHolders(tokenAddress);
    setData(holders);
  } catch (err) {
    setError("Failed to load holder data.");
    console.error(err);
  } finally {
    setLoading(false);
  }
};

loadData();
```

}, [tokenAddress]);

useEffect(() => {
if (!data.length || !svgRef.current) return;

```
const svg = d3.select(svgRef.current);
svg.selectAll("*").remove(); 

const colorScale = d3.scaleOrdinal(
  mood === 'Playful' 
    ? ['#f472b6', '#c084fc', '#818cf8', '#22d3ee', '#34d399'] 
    : ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
);

const nodes: SimulationNode[] = data.map(d => ({
  ...d,
  r: Math.max(Math.sqrt(d.percentage) * (width < 600 ? 15 : 25), 4),
  x: width / 2 + (Math.random() - 0.5) * 50,
  y: height / 2 + (Math.random() - 0.5) * 50
}));

const links: SimulationLink[] = [];
nodes.forEach((source) => {
    if (source.connections) {
        source.connections.forEach((targetId: string) => {
            const target = nodes.find((n) => n.address === targetId);
            if (target) {
                links.push({ source, target });
            }
        });
    }
});

const simulation = d3.forceSimulation<SimulationNode>(nodes)
  .force("charge", d3.forceManyBody<SimulationNode>().strength(-20))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide<SimulationNode>().radius((d) => d.r + 2).strength(0.7))
  .force("link", d3.forceLink<SimulationNode, SimulationLink>(links).distance(100).strength(0.2))
  .force("x", d3.forceX<SimulationNode>(width / 2).strength(0.05))
  .force("y", d3.forceY<SimulationNode>(height / 2).strength(0.05));

const link = svg.append("g")
    .attr("stroke", mood === 'Playful' ? "#cbd5e1" : "#334155")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", 1);

const node = svg.append("g")
  .selectAll<SVGGElement, SimulationNode>("g")
  .data(nodes)
  .join("g")
  .call(d3.drag<SVGGElement, SimulationNode>()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    })
  );

node.append("circle")
  .attr("r", (d) => d.r)
  .attr("fill", (d) => d.isContract ? (mood === 'Playful' ? '#fbbf24' : '#f59e0b') : colorScale(d.address))
  .attr("stroke", "#fff")
  .attr("stroke-width", 1.5)
  .attr("stroke-opacity", 0.5)
  .style("filter", mood === 'Professional' ? "drop-shadow(0 0 4px rgba(255,255,255,0.2))" : "none");

node.filter((d) => d.r > 20 || d.label)
  .append("text")
  .text((d) => d.label || `${d.percentage.toFixed(1)}%`)
  .attr("text-anchor", "middle")
  .attr("dy", "0.35em")
  .attr("fill", "white")
  .attr("font-size", (d) => Math.min(d.r * 0.8, 12))
  .attr("font-weight", "bold")
  .attr("pointer-events", "none");

node.append("title")
  .text((d) => `${d.label ? d.label + '\n' : ''}${d.address}\nBalance: ${d.balance.toLocaleString()} (${d.percentage.toFixed(2)}%)`);

simulation.on("tick", () => {
  link
    .attr("x1", (d) => (d.source as SimulationNode).x || 0)
    .attr("y1", (d) => (d.source as SimulationNode).y || 0)
    .attr("x2", (d) => (d.target as SimulationNode).x || 0)
    .attr("y2", (d) => (d.target as SimulationNode).y || 0);

  node
    .attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
});

return () => {
  simulation.stop();
};
```

}, [data, width, height, mood]);

if (loading) {
return (
<div className="w-full h-full flex flex-col items-center justify-center">
<div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${mood === 'Playful' ? 'border-indigo-500' : 'border-purple-500'}`}></div>
<div className="mt-4 opacity-60 font-mono">Scanning Ledger…</div>
</div>
);
}

if (error) {
return (
<div className="w-full h-full flex items-center justify-center text-red-500 font-bold">
{error}
</div>
);
}

if (!tokenAddress) {
return (
<div className="w-full h-full flex flex-col items-center justify-center opacity-50">
<div className="text-6xl mb-4">🔍</div>
<div className="text-xl font-bold">Enter a Contract Address</div>
<div>Visualize holder distribution instantly</div>
</div>
);
}

return (
<div className="w-full h-full overflow-hidden relative">
<svg
ref={svgRef}
width={width}
height={height}
viewBox={`0 0 ${width} ${height}`}
className=“w-full h-full cursor-grab active:cursor-grabbing”
/>
<div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs p-2 rounded backdrop-blur-md">
Top 100 Holders (Simulated)
</div>
</div>
);
};

export default HolderMap;