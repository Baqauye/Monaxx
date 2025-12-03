import React from 'react';
import { Token, Mood } from '../types';
import { X, ExternalLink, Globe, Activity } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCompactNumber } from '../utils';

interface DetailModalProps {
  token: Token | null;
  onClose: () => void;
  mood: Mood;
}

// Generate fake chart data (Codex/DexScreener free/basic doesn't provide history easily in this specific single query)
const generateChartData = (currentPrice: number, change: number) => {
  const data = [];
  let price = currentPrice * (1 - change / 100);
  for (let i = 0; i < 24; i++) {
    price = price * (1 + (Math.random() * 0.04 - 0.02));
    data.push({ time: `${i}:00`, price });
  }
  data.push({ time: 'Now', price: currentPrice });
  return data;
};

const DetailModal: React.FC<DetailModalProps> = ({ token, onClose, mood }) => {
  if (!token) return null;

  const chartData = generateChartData(token.price, token.change24h);
  const isPositive = token.change24h >= 0;
  const color = isPositive ? '#10b981' : '#ef4444';

  const overlayClass = mood === 'Playful' 
    ? 'bg-black/20 backdrop-blur-sm' 
    : 'bg-black/60 backdrop-blur-md border border-white/10';
  
  const cardClass = mood === 'Playful'
    ? 'bg-white rounded-3xl shadow-2xl border-4 border-white'
    : 'bg-slate-900 rounded-none border border-slate-700 shadow-2xl text-white';

  const formatPrice = (p: number) => {
      if (p < 0.000001) return p.toExponential(4);
      if (p < 0.01) return p.toFixed(6);
      if (p < 1) return p.toFixed(4);
      return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayClass}`} onClick={onClose}>
      <div 
        className={`w-full max-w-lg overflow-hidden relative animate-[fadeIn_0.2s_ease-out] ${cardClass}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-start">
          <div className="flex items-start gap-4">
             {token.imageUrl && (
                 <img 
                    src={token.imageUrl} 
                    alt={token.name} 
                    className={`w-16 h-16 object-cover shadow-md ${mood === 'Playful' ? 'rounded-2xl' : 'rounded-full border border-white/10'}`} 
                 />
             )}
             <div>
                <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold opacity-50 px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200">
                    {token.category}
                </span>
                {token.chainId && (
                    <span className="text-xs font-bold opacity-50 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 uppercase">
                        {token.chainId}
                    </span>
                )}
                </div>
                <h2 className={`text-3xl font-bold leading-tight ${mood === 'Playful' ? 'font-display text-slate-800' : 'font-sans'}`}>
                {token.name}
                </h2>
                <span className="text-lg opacity-40 font-bold">{token.symbol}</span>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={24} className={mood === 'Playful' ? 'text-slate-400' : 'text-slate-400'} />
          </button>
        </div>

        {/* Price & Chart */}
        <div className="px-6 pb-2">
            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-mono font-medium ${mood === 'Playful' ? 'text-slate-700' : 'text-white'}`}>
                ${formatPrice(token.price)}
              </span>
              <span className={`text-xl font-bold px-2 py-1 rounded ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isPositive ? '+' : ''}{token.change24h.toFixed(2)}%
              </span>
            </div>
        </div>

        <div className="h-48 w-full bg-gradient-to-b from-transparent to-black/5 dark:to-white/5 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: mood === 'Playful' ? '12px' : '0px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: mood === 'Playful' ? 'white' : '#1e293b',
                  color: mood === 'Playful' ? '#333' : '#fff'
                }}
                formatter={(value: number) => [`$${value < 1 ? value.toExponential(4) : value.toFixed(2)}`, 'Price']}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={color} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Grid */}
        <div className={`p-6 grid grid-cols-2 gap-4 ${mood === 'Playful' ? 'bg-slate-50' : 'bg-slate-950'}`}>
          <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="text-sm opacity-50 mb-1">Market Cap</div>
            <div className="font-mono font-medium text-lg truncate">
              ${formatCompactNumber(token.marketCap)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="text-sm opacity-50 mb-1">24h Volume</div>
            <div className="font-mono font-medium text-lg truncate">
              ${formatCompactNumber(token.volume24h)}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex gap-3">
            <a 
              href={token.pairUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold transition-transform active:scale-95 no-underline ${
              mood === 'Playful' 
                ? 'bg-black text-white rounded-xl shadow-lg hover:-translate-y-1' 
                : 'bg-indigo-600 text-white rounded-none hover:bg-indigo-500'
            }`}>
              <Activity size={18} /> View on Defined.fi
            </a>
            <button className={`p-3 transition-colors ${
              mood === 'Playful' 
                ? 'bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-600' 
                : 'bg-slate-800 rounded-none hover:bg-slate-700 text-slate-300'
            }`}>
              <Globe size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;