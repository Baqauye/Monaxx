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
  const isLargeEnough = width > 80 && height > 60;

  // Calculate background color based on performance
  const getBackgroundColor = () => {
    const absChange = Math.abs(token.change24h);
    
    if (isPositive) {
      // Green for positive - lighter green for smaller gains, darker for larger
      if (absChange > 20) return 'rgba(16, 185, 129, 0.9)'; // Strong green
      if (absChange > 10) return 'rgba(16, 185, 129, 0.7)';
      if (absChange > 5) return 'rgba(16, 185, 129, 0.5)';
      return 'rgba(16, 185, 129, 0.4)'; // Light green
    } else {
      // Red for negative - lighter red for smaller losses, darker for larger
      if (absChange > 20) return 'rgba(220, 38, 38, 0.9)'; // Strong red
      if (absChange > 10) return 'rgba(220, 38, 38, 0.7)';
      if (absChange > 5) return 'rgba(220, 38, 38, 0.5)';
      return 'rgba(220, 38, 38, 0.4)'; // Light red
    }
  };

  const containerStyle = {
    width: `${width}px`,
    height: `${height}px`,
    opacity: dimmed ? 0.3 : 1,
    transition: 'opacity 0.2s ease',
    padding: '2px',
    boxSizing: 'border-box' as const,
  };

  const cardStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: isLargeEnough ? 'space-between' : 'center',
    alignItems: 'center',
    padding: isLargeEnough ? '12px' : '8px',
    borderRadius: '4px',
    background: getBackgroundColor(),
    border: '1px solid rgba(0,0,0,0.1)',
    cursor: 'pointer',
    overflow: 'hidden',
  };

  const symbolStyle = {
    fontSize: width > 120 ? '1.1em' : '0.9em',
    fontWeight: 'bold' as const,
    color: '#ffffff',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    textAlign: 'center' as const,
    width: '100%',
  };

  const changeStyle = {
    fontSize: width > 120 ? '0.9em' : '0.75em',
    fontWeight: '600' as const,
    color: '#ffffff',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const priceStyle = {
    fontSize: width > 120 ? '0.85em' : '0.7em',
    color: 'rgba(255,255,255,0.9)',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
    marginTop: '4px',
    textAlign: 'center' as const,
  };

  const imgStyle = {
    width: isLargeEnough ? '32px' : '24px',
    height: isLargeEnough ? '32px' : '24px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    marginBottom: '8px',
    border: '2px solid rgba(255,255,255,0.3)',
  };

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
        {isLargeEnough && (currentImgSrc && !imageError ? (
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
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#ffffff',
            fontSize: '0.8em',
            border: '2px solid rgba(255,255,255,0.3)',
          }}>
            {token.symbol.charAt(0)}
          </div>
        ) : null)}
        
        <div style={symbolStyle}>{token.symbol}</div>
        
        {isLargeEnough && (
          <>
            <div style={changeStyle}>
              <span>{isPositive ? '↑' : '↓'}</span>
              <span style={{ marginLeft: '4px' }}>{Math.abs(token.change24h).toFixed(2)}%</span>
            </div>
            <div style={priceStyle}>
              ${formatPrice(token.price)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TokenTile;
