// components/HolderMap.tsx (Updated to use BlockVision data)
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Holder, Mood } from '../types';
import { fetchTokenHolders } from '../services/monadService'; // Use the updated service

interface HolderMapProps {
  tokenAddress: string;
  width: number;
  height: number;
  mood: Mood;
}

const HolderMap: React.FC<HolderMapProps> = ({ tokenAddress, width, height, mood }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!tokenAddress || !svgRef.current) return;

    const loadAndRender = async () => {
      try {
        const data = await fetchTokenHolders(tokenAddress);
        if (!data.length) {
            console.log("No holder data found for", tokenAddress);
            return;
        }

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render

        // --- D3 Force Simulation for Bubble Map ---
        // Use percentage for radius calculation
        const maxPercentage = d3.max(data, d => d.percentage) || 1;
        const minRadius = 5;
        const maxRadius = width < 600 ? 30 : 50; // Adjust for mobile
        const radiusScale = d3.scaleSqrt()
            .domain([0, maxPercentage])
            .range([minRadius, maxRadius]);

        const nodes = data.map(d => ({
            ...d,
            x: width / 2 + (Math.random() - 0.5) * 50,
            y: height / 2 + (Math.random() - 0.5) * 50,
            r: radiusScale(d.percentage)
        }));

        const simulation = d3.forceSimulation(nodes as any)
            .force("charge", d3.forceManyBody().strength(-50)) // Repulsion
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius((d: any) => d.r + 2).strength(0.8))
            .force("x", d3.forceX(width / 2).strength(0.05))
            .force("y", d3.forceY(height / 2).strength(0.05));

        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(d3.drag<any, any>()
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

        const colorScale = d3.scaleOrdinal(
          mood === 'Playful'
            ? ['#f472b6', '#c084fc', '#818cf8', '#22d3ee', '#34d399']
            : ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
        );

        node.append("circle")
            .attr("r", (d: any) => d.r)
            .attr("fill", (d: any) => d.isContract ? (mood === 'Playful' ? '#fbbf24' : '#f59e0b') : colorScale(d.address))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.5)
            .style("filter", mood === 'Professional' ? "drop-shadow(0 0 4px rgba(255,255,255,0.2))" : "none");

        node.filter((d: any) => d.r > 20) // Only label large nodes
            .append("text")
            .text((d: any) => `${d.percentage.toFixed(2)}%`)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", "white")
            .attr("font-size", (d: any) => Math.min(d.r * 0.4, 12))
            .attr("font-weight", "bold")
            .attr("pointer-events", "none");

        node.append("title")
            .text((d: any) => `${d.address}\nBalance: ${d.balance}\nPercentage: ${d.percentage.toFixed(4)}%`);

        simulation.on("tick", () => {
            node
                .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

      } catch (error) {
        console.error("Error rendering HolderMap:", error);
      }
    };

    loadAndRender();

    return () => {
        // Cleanup simulation if needed, though D3 handles most of it
        // const simulation = ... (if stored)
        // simulation?.stop();
    };
  }, [tokenAddress, width, height, mood]);

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
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs p-2 rounded backdrop-blur-md">
        Top Holders (BlockVision API)
      </div>
    </div>
  );
};

export default HolderMap;
