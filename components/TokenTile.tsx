import React, { useState, useEffect, useRef } from 'react';
import { Token, Mood } from '../types';

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
  const area = width * height;
  
  // Dynamic sizing thresholds based on tile area
  const TINY_THRESHOLD = 2500;   // 50x50
  const SMALL_THRESHOLD = 6000;  // ~77x77
  const MEDIUM_THRESHOLD = 12000; // ~110x110
  const LARGE_THRESHOLD = 20000;  // ~141x141

  // Determine tile size category
  const isTiny = area < TINY_THRESHOLD;
  const isSmall = area >= TINY_THRESHOLD && area < SMALL_THRESHOLD;
  const isMedium = area >= SMALL_THRESHOLD && area < MEDIUM_THRESHOLD;
  const isLarge = area >= MEDIUM_THRESHOLD && area < LARGE_THRESHOLD;
  const isXLarge = area >= LARGE_THRESHOLD;

  // Auto font-scaling based on tile size
  const getFontSizes = () => {
    if (isTiny) {
      return {
        symbol: Math.min(width * 0.12, 10),
        change: 0,
        price: 0,
        icon: Math.min(width * 0.35, 16)
      };
    } else if (isSmall) {
      return {
        symbol: Math.min(width * 0.14, 13),
        change: Math.min(width * 0.10, 10),
        price: Math.min(width * 0.09, 9),
        icon: Math.min(width * 0.28, 22)
      };
    } else if (isMedium) {
      return {
        symbol: Math.min(width * 0.13, 16),
        change: Math.min(width * 0.10, 13),
        price: Math.min(width * 0.09, 11),
        icon: Math.min(width * 0.25, 28)
      };
    } else if (isLarge) {
      return {
        symbol: Math.min(width * 0.11, 20),
        change: Math.min(width * 0.09, 16),
        price: Math.min(width * 0.08, 14),
        icon: Math.min(width * 0.20, 36)
      };
    } else {
      return {
        symbol: Math.min(width * 0.09, 26),
        change: Math.min(width * 0.08, 20),
        price: Math.min(width * 0.07, 18),
        icon: Math.min(width * 0.15, 48)
      };
    }
  };

  const fontSizes = getFontSizes();

  // Calculate background color based on performance
  const getBackgroundColor = () => {
    const absChange = Math.abs(token.change24h);
    
    if (isPositive) {
      if (absChange > 20) return 'rgba(16, 185, 129, 0.9)';
      if (absChange > 10) return 'rgba(16, 185, 129, 0.7)';
      if (absChange > 5) return 'rgba(16, 185, 129, 0.55)';
      return 'rgba(16, 185, 129, 0.45)';
    } else {
      if (absChange > 20) return 'rgba(220, 38, 38, 0.9)';
      if (absChange > 10) return 'rgba(220, 38, 38, 0.7)';
      if (absChange > 5) return 'rgba(220, 38, 38, 0.55)';
      return 'rgba(220, 38, 38, 0.45)';
    }
  };

  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    opacity: dimmed ? 0.3 : 1,
    transition: 'opacity 0.2s ease',
    padding: '0',
    boxSizing: 'border-box',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTiny ? '4px' : isSmall ? '6px' : '8px',
    borderRadius: '4px',
    background: getBackgroundColor(),
    border: '1px solid rgba(0,0,0,0.15)',
    cursor: 'pointer',
    overflow: 'hidden',
    position: 'relative',
  };

  // Centered text with shadow for visibility
  const baseTextStyle: React.CSSProperties = {
    color: '#ffffff',
    textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)',
    textAlign: 'center',
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  };

  const symbolStyle: React.CSSProperties = {
    ...baseTextStyle,
    fontSize: `${fontSizes.symbol}px`,
    fontWeight: 700,
    marginBottom: isTiny ? '0' : '2px',
  };

  const changeStyle: React.CSSProperties = {
    ...baseTextStyle,
    fontSize: `${fontSizes.change}px`,
    fontWeight: 600,
    marginTop: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
  };

  const priceStyle: React.CSSProperties = {
    ...baseTextStyle,
    fontSize: `${fontSizes.price}px`,
    fontWeight: 500,
    marginTop: '2px',
    opacity: 0.95,
  };

  const dominanceStyle: React.CSSProperties = {
    ...baseTextStyle,
    fontSize: `${Math.max(fontSizes.price * 0.85, 10)}px`,
    fontWeight: 600,
    marginTop: '2px',
    opacity: 0.85,
  };

  const imgStyle: React.CSSProperties = {
    width: `${fontSizes.icon}px`,
    height: `${fontSizes.icon}px`,
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: isTiny ? '2px' : '4px',
    border: '2px solid rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexShrink: 0,
  };

  const formatPrice = (p: number) => {
    if (p < 0.000001) return p.toExponential(2);
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    if (p < 100) return p.toFixed(2);
    if (p < 1000) return p.toFixed(1);
    return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatChange = (change: number) => {
    const abs = Math.abs(change);
    if (abs >= 100) return abs.toFixed(0);
    if (abs >= 10) return abs.toFixed(1);
    return abs.toFixed(2);
  };

  const formatDominance = (dominance: number) => {
    if (dominance >= 10) return dominance.toFixed(2);
    if (dominance >= 1) return dominance.toFixed(2);
    if (dominance >= 0.1) return dominance.toFixed(3);
    return dominance.toFixed(4);
  };

  // Render logic based on tile size
  const renderContent = () => {
    // Always show icon if available (unless too tiny)
    const showIcon = !isTiny && (currentImgSrc || imageError);
    
    if (isTiny) {
      // Tiny tiles: Only ticker symbol, maybe tiny icon
      return (
        <>
          {showIcon && (currentImgSrc && !imageError ? (
            <img
              src={currentImgSrc}
              alt={token.symbol}
              style={imgStyle}
              onError={handleImageError}
            />
          ) : imageError ? (
            <div style={{
              ...imgStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.25)',
              fontSize: `${fontSizes.icon * 0.5}px`,
              fontWeight: 700,
            }}>
              {token.symbol.charAt(0)}
            </div>
          ) : null)}
          <div style={symbolStyle}>{token.symbol}</div>
        </>
      );
    } else if (isSmall) {
      // Small tiles: Icon + Symbol + Change %
      return (
        <>
          {showIcon && (currentImgSrc && !imageError ? (
            <img
              src={currentImgSrc}
              alt={token.symbol}
              style={imgStyle}
              onError={handleImageError}
            />
          ) : imageError ? (
            <div style={{
              ...imgStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.25)',
              fontSize: `${fontSizes.icon * 0.5}px`,
              fontWeight: 700,
            }}>
              {token.symbol.charAt(0)}
            </div>
          ) : null)}
          <div style={symbolStyle}>{token.symbol}</div>
          <div style={changeStyle}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>{formatChange(token.change24h)}%</span>
          </div>
        </>
      );
    } else {
      // Medium+ tiles: Icon + Symbol + Change % + Price (and Dominance for large tiles)
      return (
        <>
          {showIcon && (currentImgSrc && !imageError ? (
            <img
              src={currentImgSrc}
              alt={token.symbol}
              style={imgStyle}
              onError={handleImageError}
            />
          ) : imageError ? (
            <div style={{
              ...imgStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.25)',
              fontSize: `${fontSizes.icon * 0.5}px`,
              fontWeight: 700,
            }}>
              {token.symbol.charAt(0)}
            </div>
          ) : null)}
          <div style={symbolStyle}>{token.symbol}</div>
          <div style={changeStyle}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>{formatChange(token.change24h)}%</span>
          </div>
          <div style={priceStyle}>
            ${formatPrice(token.price)}
          </div>
          {(isLarge || isXLarge) && (
            <div style={dominanceStyle}>
              DOM: {formatDominance(token.dominance)}%
            </div>
          )}
        </>
      );
    }
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
        {renderContent()}
      </div>
    </div>
  );
};

export default TokenTile;
