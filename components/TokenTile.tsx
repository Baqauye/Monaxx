// components/TokenTile.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Token, Mood } from '../types';
import { formatCompactNumber } from '../utils';

interface TokenTileProps {
  token: Token;
  width: number;
  height: number;
  mood: Mood;
  onClick: (token: Token) => void;
  dimmed: boolean;
  onHover: (hovering: boolean) => void;
}

const TokenTile: React.FC<TokenTileProps> = ({ token, width, height, mood, onClick, dimmed, onHover }) => {
  const [currentImgSrc, setCurrentImgSrc] = useState<string | undefined>(token.imageUrl);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentImgSrc(token.imageUrl);
    setImageError(false);
  }, [token.imageUrl]);

  const handleImageError = () => {
    if (currentImgSrc === token.imageUrl && token.backupImageUrl) {
      setCurrentImgSrc(token.backupImageUrl);
    } else {
      setImageError(true);
    }
  };

  const isPositive = token.change24h >= 0;
  const isLargeEnough = width > 80 && height > 60; // Define a threshold for showing detailed info
  const isMediumEnough = width > 50 && height > 40; // Threshold for showing symbol + change
  const showImage = width > 40 && height > 40; // Threshold for showing image

  // Calculate dynamic font sizes based on tile dimensions
  const baseFontSize = Math.min(width / 8, height / 5, 16); // Max base size of 16px
  const symbolFontSize = Math.max(baseFontSize * 1.2, 10); // Symbol slightly larger
  const priceFontSize = Math.max(baseFontSize * 0.8, 8);   // Price/Change smaller
  const changeFontSize = priceFontSize; // Same size as price

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
    background: isPositive
      ? (mood === 'Playful' ? 'linear-gradient(135deg, #f0fdf4, #d1fae5)' : 'rgba(16, 211, 153, 0.1)') // Light green gradient / subtle green
      : (mood === 'Playful' ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : 'rgba(248, 113, 113, 0.1)'), // Light red gradient / subtle red
    border: mood === 'Playful' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
    backdropFilter: mood === 'Playful' ? 'blur(10px)' : 'blur(4px)',
    cursor: 'pointer',
    overflow: 'hidden',
  };

  const symbolStyle = {
    fontSize: `${symbolFontSize}px`,
    fontWeight: 'bold' as const,
    color: mood === 'Playful' ? (isPositive ? '#064e3b' : '#991b1b') : (isPositive ? '#34d399' : '#f87171'), // Dark green/red for playful, bright for professional
    textShadow: mood === 'Playful' ? '0 1px 2px rgba(255,255,255,0.5)' : '0 1px 2px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  };

  const priceStyle = {
    fontSize: `${priceFontSize}px`,
    fontWeight: 'normal' as const,
    color: mood === 'Playful' ? (isPositive ? '#065f46' : '#b91c1c') : (isPositive ? '#6ee7b7' : '#fca5a5'), // Slightly different shade
    textShadow: mood === 'Playful' ? '0 1px 1px rgba(255,255,255,0.5)' : '0 1px 1px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  };

  const changeStyle = {
    fontSize: `${changeFontSize}px`,
    fontWeight: 'bold' as const,
    color: isPositive ? '#065f46' : '#b91c1c', // Consistent dark green/red for change
    textShadow: '0 1px 1px rgba(0,0,0,0.3)', // Darker shadow for contrast
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  };

  const imgStyle = {
    width: mood === 'Playful' ? '20px' : '18px',
    height: mood === 'Playful' ? '20px' : '18px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    alignSelf: 'flex-end', // Align image to top-right corner
    marginBottom: mood === 'Playful' ? '2px' : '1px',
  };

  // Format price to be human-readable
  const formatPrice = (p: number) => {
    if (p < 0.000001) return p.toExponential(4);
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={() => onClick(token)}
    >
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {showImage && currentImgSrc && !imageError && (
            <img
              src={currentImgSrc}
              alt={token.name}
              style={imgStyle}
              onError={handleImageError}
            />
          )}
          {showImage && (!currentImgSrc || imageError) && (
             <div style={{
              ...imgStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mood === 'Playful' ? '#e2e8f0' : '#1e293b',
              color: mood === 'Playful' ? '#64748b' : '#94a3b8',
              fontSize: '0.7em',
              borderRadius: '50%',
            }}>
              ?
            </div>
          )}
          <div style={{ flex: 1, marginLeft: showImage ? '4px' : '0' }}>
            <div style={symbolStyle}>{token.symbol}</div>
            {(isLargeEnough || isMediumEnough) && (
              <div style={changeStyle}>
                {isPositive ? '+' : ''}{token.change24h.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
        {(isLargeEnough) && (
          <div style={priceStyle}>
            ${formatPrice(token.price)}
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenTile;
