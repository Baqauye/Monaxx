import React, { useState, useEffect } from 'react';
import { Token, Mood } from '../types';
import { PLAYFUL_COLORS, PROFESSIONAL_COLORS } from '../constants';

const TrendingUp = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const TrendingDown = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
    <polyline points="17 18 23 18 23 12"></polyline>
  </svg>
);

interface TokenTileProps {
  token: Token;
  width: number;
  height: number;
  mood: Mood;
  onClick: (token: Token) => void;
  dimmed?: boolean;
  onHover?: (isHovering: boolean) => void;
}

const TokenTile: React.FC<TokenTileProps> = ({ token, width, height, mood, onClick, dimmed, onHover }) => {
  const [currentImgSrc, setCurrentImgSrc] = useState<string | undefined>(token.imageUrl);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const isPositive = token.change24h >= 0;
  const colors = mood === 'Playful' ? PLAYFUL_COLORS : PROFESSIONAL_COLORS;

  useEffect(() => {
    setCurrentImgSrc(token.imageUrl);
    setImageError(false);
  }, [token.imageUrl, token.id]);

  const handleImageError = () => {
    if (currentImgSrc === token.imageUrl && token.backupImageUrl) {
      setCurrentImgSrc(token.backupImageUrl);
    } else {
      setImageError(true);
    }
  };

  const intensity = Math.min(Math.abs(token.change24h) / 15, 1);
  const colorIndex = intensity < 0.3 ? 0 : intensity < 0.6 ? 1 : 2;
  const bgColor = isPositive ? colors.up[colorIndex] : colors.down[colorIndex];
  
  const fontSize = Math.min(width / 5, height / 4, 24);
  const smallFontSize = Math.max(fontSize * 0.6, 10);
  
  const showText = width > 40 && height > 40;
  const showDetail = width > 80 && height > 60;
  
  const imgSize = Math.min(width * 0.4, height * 0.4, 60);
  const showImage = width > 50 && height > 50;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHover) onHover(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHover) onHover(false);
  };

  return (
    <div
      onClick={() => onClick(token)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        color: isPositive && mood === 'Playful' ? '#064e3b' : isPositive ? '#f0fdf4' : '#fff0f2',
        opacity: dimmed ? 0.3 : 1,
        filter: dimmed ? 'grayscale(0.6) blur(1px)' : 'none',
        transform: isHovered ? 'scale(1.02)' : dimmed ? 'scale(0.95)' : 'scale(1)',
        zIndex: isHovered ? 20 : 1,
        transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}
      className={`
        relative overflow-hidden cursor-pointer shadow-sm
        ${mood === 'Playful' ? 'rounded-2xl border-4 border-white/20' : 'rounded-none border border-black/10'}
        flex flex-col items-center justify-center text-center p-1
        ${!dimmed ? 'hover:shadow-2xl' : ''}
      `}
    >
      <div className="absolute pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 group-hover:scale-110 opacity-10 mix-blend-overlay">
        {currentImgSrc && !imageError ? (
            <img 
              src={currentImgSrc} 
              alt="" 
              className="w-32 h-32 object-cover grayscale blur-sm" 
              onError={handleImageError}
            />
        ) : (
            <div className="w-24 h-24 rounded-full bg-white/20" />
        )}
      </div>

      {showImage && (
        <div className="mb-1 relative z-10 transition-transform duration-300" style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}>
            {currentImgSrc && !imageError ? (
                <img 
                    src={currentImgSrc} 
                    alt={token.symbol}
                    style={{ width: imgSize, height: imgSize }}
                    className={`object-cover shadow-sm bg-white/10 ${mood === 'Playful' ? 'rounded-full border-2 border-white/40' : 'rounded-md'}`}
                    onError={handleImageError}
                />
            ) : (
                <div 
                    style={{ width: imgSize, height: imgSize }}
                    className={`flex items-center justify-center bg-black/10 dark:bg-white/10 backdrop-blur-sm ${mood === 'Playful' ? 'rounded-full' : 'rounded-md'}`}
                >
                    <span className="font-bold opacity-50 text-xs">{token.symbol.substring(0, 1)}</span>
                </div>
            )}
        </div>
      )}

      {showText && (
        <>
          <span 
            className={`font-bold uppercase tracking-tight truncate w-full px-1 z-10 ${mood === 'Playful' ? 'font-display' : 'font-sans'}`}
            style={{ fontSize: `${fontSize}px`, textShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          >
            {token.symbol}
          </span>
          <div className="flex items-center gap-1 font-medium z-10 opacity-90" style={{ fontSize: `${smallFontSize}px` }}>
            {isPositive ? <TrendingUp size={smallFontSize} /> : <TrendingDown size={smallFontSize} />}
            <span>{Math.abs(token.change24h).toFixed(2)}%</span>
          </div>
        </>
      )}

      {showDetail && (
        <span 
          className="mt-1 opacity-80 z-10 font-mono tracking-tighter" 
          style={{ fontSize: `${smallFontSize * 0.8}px` }}
        >
          ${token.price < 0.01 ? token.price.toExponential(2) : token.price < 1 ? token.price.toFixed(4) : token.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      )}
    </div>
  );
};

export default TokenTile;