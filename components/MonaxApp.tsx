'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, Treemap } from 'recharts';
import { CHAINS, TOKEN_CATEGORIES } from '@/lib/config';
import { ChainOption, TokenCategory, TokenMarket } from '@/lib/types';

interface ApiResponse {
  tokens: TokenMarket[];
}

interface TreemapNode {
  name: string;
  size: number;
  token: TokenMarket;
}

const getTileColor = (change: number | null): string => {
  if (change === null) return '#1f2937';
  const intensity = Math.min(Math.abs(change), 20);
  if (change >= 0) return intensity > 8 ? '#166534' : '#22c55e';
  return intensity > 8 ? '#991b1b' : '#ef4444';
};

const formatCompact = (value: number): string =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);

const formatPrice = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value >= 1 ? 2 : 6 }).format(value);

const CustomNode = ({ x, y, width, height, payload }: { x: number; y: number; width: number; height: number; payload: TreemapNode }): JSX.Element => {
  const canShowAll = width > 120 && height > 90;
  const canShowPrice = width > 80 && height > 60;
  const symbolSize = Math.max(10, Math.min(24, width * 0.15));
  const detailSize = Math.max(9, Math.min(16, width * 0.08));

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={getTileColor(payload.token.price_change_percentage_24h)} stroke="#0b1120" strokeWidth={1} />
      <text x={x + 6} y={y + 18} fontSize={symbolSize} fontWeight={700} fill="#ffffff">
        {payload.token.symbol.toUpperCase()}
      </text>
      {canShowPrice && (
        <text x={x + 6} y={y + 18 + detailSize + 6} fontSize={detailSize} fontWeight={600} fill="#ffffff">
          {formatPrice(payload.token.current_price)}
        </text>
      )}
      {canShowAll && (
        <text x={x + 6} y={y + 18 + detailSize * 2 + 10} fontSize={detailSize} fontWeight={600} fill="#ffffff">
          {(payload.token.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
          {(payload.token.price_change_percentage_24h ?? 0).toFixed(2)}%
        </text>
      )}
    </g>
  );
};

/**
 * Renders the Monax heatmap with live refresh, chain filtering, and token details.
 */
export const MonaxApp = (): JSX.Element => {
  const [activeChain, setActiveChain] = useState<ChainOption>(CHAINS[0]);
  const [tokens, setTokens] = useState<TokenMarket[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TokenCategory>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selected, setSelected] = useState<TokenMarket | null>(null);
  const [showSheet, setShowSheet] = useState<boolean>(false);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/markets?chain=${activeChain.key}`);
      if (!response.ok) throw new Error('Failed to fetch market data.');
      const payload = (await response.json()) as ApiResponse;
      setTokens(payload.tokens);
    } catch {
      setError('Unable to load live market data right now. Please retry in a moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => {
      void loadData();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [activeChain]);

  const filtered = useMemo(() => (selectedCategory === 'All' ? tokens : tokens.filter((item) => item.category === selectedCategory)), [selectedCategory, tokens]);

  const treeData = useMemo<TreemapNode[]>(() => filtered.map((token) => ({ name: token.symbol, size: token.market_cap, token })), [filtered]);

  const counts = useMemo(() => tokens.reduce<Record<string, number>>((acc, token) => {
    acc[token.category] = (acc[token.category] ?? 0) + 1;
    return acc;
  }, {}), [tokens]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-3 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 font-bold">M</div>
            <h1 className="text-lg font-bold">Monax</h1>
            <span className="rounded-full border border-violet-300 px-2 py-0.5 text-xs text-violet-200">Eco</span>
          </div>
          <button className="rounded-full border border-slate-600 px-3 py-1 text-sm" onClick={() => setShowSheet(true)}>{activeChain.short} ↓</button>
          <div className="flex justify-end"><button aria-label="settings" className="rounded-full border border-slate-600 p-2">🌐</button></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOKEN_CATEGORIES.map((category) => {
            const count = category === 'All' ? tokens.length : counts[category] ?? 0;
            return (
              <button key={category} className={`rounded-full border px-3 py-1 text-xs ${selectedCategory === category ? 'border-slate-200 bg-slate-200 text-slate-900' : 'border-slate-600 text-slate-100'}`} onClick={() => setSelectedCategory(category)}>
                {category} ({count})
              </button>
            );
          })}
        </div>
      </header>

      <main className="relative flex-1">
        {loading && tokens.length === 0 && (
          <div className="grid h-full grid-cols-4 gap-px bg-slate-900">
            {Array.from({ length: 24 }).map((_, index) => <div key={index} className="animate-pulse bg-slate-800" />)}
          </div>
        )}
        {error && <div className="flex h-full items-center justify-center p-4 text-center text-red-300">{error}</div>}
        {!error && filtered.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={treeData} dataKey="size" isAnimationActive={false} content={<CustomNode x={0} y={0} width={0} height={0} payload={{ name: '', size: 0, token: filtered[0] }} />} onClick={(entry) => setSelected(entry?.token ?? null)} />
          </ResponsiveContainer>
        )}
      </main>

      {showSheet && (
        <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setShowSheet(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-slate-900 p-4" onClick={(event) => event.stopPropagation()}>
            {CHAINS.map((chain) => (
              <button key={chain.key} className="mb-2 w-full rounded-xl border border-slate-700 px-4 py-3 text-left" onClick={() => { setActiveChain(chain); setShowSheet(false); }}>
                {chain.display}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={selected.image} alt={selected.name} className="h-10 w-10 rounded-full" />
                <div><p className="font-bold">{selected.name}</p><p className="text-sm text-slate-300">{selected.symbol.toUpperCase()}</p></div>
              </div>
              <button className="text-xl" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>Price: {formatPrice(selected.current_price)}</p>
              <p className={selected.price_change_percentage_24h && selected.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                24h: {(selected.price_change_percentage_24h ?? 0).toFixed(2)}%
              </p>
              <p>Market Cap: ${formatCompact(selected.market_cap)}</p>
              <p>24h Volume: ${formatCompact(selected.total_volume)}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <a href={`https://www.defined.fi/${activeChain.definedSlug}/${selected.contract_address ?? selected.id}`} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-center font-semibold">View on Defined.fi</a>
              <button className="rounded-lg border border-slate-600 px-3 py-2">🌐</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
