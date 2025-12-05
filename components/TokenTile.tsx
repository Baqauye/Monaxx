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
    justifyContent: isLargeEnough ? 'space-between' : 'flex-start',
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
    fontSize: mood === 'Playful' ? (width > 120 ? '1.2em' : '1em') : (width > 120 ? '0.9em' : '0.8em'),
    fontWeight: 'bold' as const,
    color: mood === 'Playful' ? '#334155' : '#cbd5e1',
    textShadow: mood === 'Playful' ? '0 1px 2px rgba(255,255,255,0.5)' : 'none',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  };

  const nameStyle = {
    fontSize: mood === 'Playful' ? '0.75em' : '0.65em',
    color: mood === 'Playful' ? '#64748b' : '#94a3b8',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    marginTop: '2px',
  };

  const priceStyle = {
    fontSize: mood === 'Playful' ? '0.9em' : '0.8em',
    fontWeight: 'bold' as const,
    color: mood === 'Playful' ? (isPositive ? '#10b981' : '#ef4444') : (isPositive ? '#34d399' : '#f87171'),
    marginTop: isLargeEnough ? 'auto' : '4px',
  };

  const statsStyle = {
    fontSize: mood === 'Playful' ? '0.75em' : '0.65em',
    color: mood === 'Playful' ? '#94a3b8' : '#64748b',
    marginTop: '2px',
  };

  const imgStyle = {
    width: mood === 'Playful' ? '24px' : '20px',
    height: mood === 'Playful' ? '24px' : '20px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    alignSelf: 'flex-end',
    marginBottom: mood === 'Playful' ? '4px' : '2px',
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
          {currentImgSrc && !imageError ? (
            <img
              src={currentImgSrc}
              alt={token.name}
              style={imgStyle}
              onError={handleImageError}
            />
          ) : imageError ? (
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
          ) : (
            <div style={{ ...imgStyle, backgroundColor: 'transparent' }} /> // Placeholder to keep alignment
          )}
          <div style={{ flex: 1, marginLeft: '6px' }}>
            <div style={symbolStyle}>{token.symbol}</div>
            {isLargeEnough && <div style={nameStyle}>{token.name}</div>}
          </div>
        </div>
        {isLargeEnough && (
          <>
            <div style={priceStyle}>
              ${formatPrice(token.price)}
              <span style={{ fontSize: '0.8em', marginLeft: '4px' }}>
                {isPositive ? '↑' : '↓'}{Math.abs(token.change24h).toFixed(2)}%
              </span>
            </div>
            <div style={statsStyle}>
              MC: ${formatCompactNumber(token.marketCap)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TokenTile;
