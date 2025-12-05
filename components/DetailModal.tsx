// components/DetailModal.tsx
import React, { useState, useEffect } from 'react';
import { Token, Mood } from '../types';
import { formatCompactNumber } from '../utils';

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const GlobeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const ActivityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

interface DetailModalProps {
  token: Token | null;
  onClose: () => void;
  mood: Mood;
}

const DetailModal: React.FC<DetailModalProps> = ({ token, onClose, mood }) => {
  const [currentImgSrc, setCurrentImgSrc] = useState<string | undefined>(token?.imageUrl);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (token) {
      setCurrentImgSrc(token.imageUrl);
      setImageError(false);
    }
  }, [token]);

  if (!token) return null;

  const handleImageError = () => {
    if (currentImgSrc === token.imageUrl && token.backupImageUrl) {
      setCurrentImgSrc(token.backupImageUrl);
    } else {
      setImageError(true);
    }
  };

  const isPositive = token.change24h >= 0;

  const overlayClass = mood === 'Playful'
    ? 'bg-black/20 backdrop-blur-sm'
    : 'bg-black/60 backdrop-blur-md border border-white/10';

  const cardClass = mood === 'Playful'
    ? 'bg-white rounded-3xl shadow-2xl border-4 border-white'
    : 'bg-slate-900 rounded-none border border-slate-700 shadow-2xl text-white';

  /**
   * Formats the price to be human-readable.
   */
  const formatPrice = (p: number) => {
    if (p < 0.000001) return p.toExponential(4);
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayClass}`} onClick={onClose}>
      <div
        className={`w-full max-w-lg overflow-hidden relative animate-[fadeIn_0.2s_ease-out] ${cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex justify-between items-start">
          <div className="flex items-start gap-4">
            {currentImgSrc && !imageError && (
              <img
                src={currentImgSrc}
                alt={token.name}
                className={`w-16 h-16 object-cover shadow-md ${mood === 'Playful' ? 'rounded-2xl' : 'rounded-full border border-white/10'}`}
                onError={handleImageError}
              />
            )}
            {(!currentImgSrc || imageError) && (
              <div className={`w-16 h-16 flex items-center justify-center bg-gray-200 dark:bg-slate-700 ${mood === 'Playful' ? 'rounded-2xl' : 'rounded-full border border-white/10'}`}>
                <span className="text-gray-500 dark:text-slate-400">?</span>
              </div>
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
            <XIcon />
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-baseline gap-3">
            <span className={`text-5xl font-mono font-medium ${mood === 'Playful' ? 'text-slate-700' : 'text-white'}`}>
              ${formatPrice(token.price)}
            </span>
            <span className={`text-2xl font-bold px-2 py-1 rounded ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isPositive ? '+' : ''}{token.change24h.toFixed(2)}%
            </span>
          </div>
        </div>
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
          {token.liquidity !== undefined && (
            <>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="text-sm opacity-50 mb-1">Liquidity</div>
                <div className="font-mono font-medium text-lg truncate">
                  ${formatCompactNumber(token.liquidity)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="text-sm opacity-50 mb-1">Decimals</div>
                <div className="font-mono font-medium text-lg truncate">
                  {token.decimals}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <a
            href={token.pairUrl}
            target="_blank"
            rel="noreferrer"
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-transform active:scale-95 no-underline ${
              mood === 'Playful'
                ? 'bg-black text-white rounded-xl shadow-lg hover:-translate-y-1'
                : 'bg-indigo-600 text-white rounded-none hover:bg-indigo-500'
            }`}
          >
            <ActivityIcon /> View on Defined.fi
          </a>
          <button className={`p-3 transition-colors ${
            mood === 'Playful'
              ? 'bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-600'
              : 'bg-slate-800 rounded-none hover:bg-slate-700 text-slate-300'
          }`}>
            <GlobeIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
